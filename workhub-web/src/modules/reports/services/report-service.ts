import "server-only";

import {
  and,
  asc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  departmentMembers,
  departments,
  leaveRequests,
  roles,
  shiftAssignments,
  shifts,
  tasks,
  userRoles,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/types";

export const reportPeriods = [
  "this_month",
  "last_30_days",
  "this_quarter",
  "this_year",
  "last_year",
  "last_2_years",
  "last_3_years",
  "last_5_years",
  "custom",
] as const;

export const reportTaskStatuses = [
  "todo",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const reportLeaveStatuses = ["pending", "approved", "rejected"] as const;
export const reportShiftStatuses = ["scheduled", "completed", "cancelled"] as const;

export type ReportPeriod = (typeof reportPeriods)[number];
export type ReportTaskStatus = (typeof reportTaskStatuses)[number];
export type ReportLeaveStatus = (typeof reportLeaveStatuses)[number];
export type ReportShiftStatus = (typeof reportShiftStatuses)[number];

export type ReportFilters = {
  departmentId?: number;
  period: ReportPeriod;
  customStartDate?: string;
  customEndDate?: string;
};

export type ReportsData = Awaited<ReturnType<typeof getReportsData>>;

export async function getReportsData(user: CurrentUser, filters: ReportFilters) {
  const context = await getReportActorContext(user);
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map(
    (department) => department.id,
  );

  if (!isMainAdmin && managedDepartmentIds.length === 0) {
    return {
      canViewReports: false,
      isMainAdmin,
      isDepartmentManager: false,
      roleNames: context.roleNames,
      managedDepartments: context.managedDepartments,
      departmentOptions: [],
      selectedDepartmentId: undefined,
      filters,
      dateRange: getReportDateRange(filters),
      summary: null,
      taskReport: null,
      leaveReport: null,
      shiftReport: null,
      departmentComparison: [],
    };
  }

  const departmentOptions = await getAccessibleDepartmentOptions(
    user,
    isMainAdmin,
    managedDepartmentIds,
  );
  const accessibleDepartmentIds = departmentOptions.map(
    (department) => department.id,
  );
  const selectedDepartmentId = accessibleDepartmentIds.includes(
    filters.departmentId ?? 0,
  )
    ? filters.departmentId
    : undefined;
  const dateRange = getReportDateRange(filters);
  const scope = {
    accessibleDepartmentIds,
    selectedDepartmentId,
    dateRange,
  };

  const analytics = await getAnalyticsAggregates(user, isMainAdmin, scope);

  return {
    canViewReports: true,
    isMainAdmin,
    isDepartmentManager: managedDepartmentIds.length > 0,
    roleNames: context.roleNames,
    managedDepartments: context.managedDepartments,
    departmentOptions,
    selectedDepartmentId,
    filters,
    dateRange,
    summary: analytics.summary,
    taskReport: analytics.taskReport,
    leaveReport: analytics.leaveReport,
    shiftReport: analytics.shiftReport,
    departmentComparison: analytics.departmentComparison,
  };
}

export async function userCanViewReports(user: CurrentUser) {
  const context = await getReportActorContext(user);

  return (
    context.roleNames.includes("Main Admin") ||
    context.managedDepartments.length > 0
  );
}

async function getReportActorContext(user: CurrentUser) {
  const rows = await db
    .select({
      roleName: roles.name,
      managedDepartmentId: departments.id,
      managedDepartmentName: departments.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(
      departmentMembers,
      and(
        eq(departmentMembers.userId, user.id),
        eq(departmentMembers.organizationId, user.organizationId),
        eq(departmentMembers.isManager, true),
      ),
    )
    .leftJoin(
      departments,
      and(
        eq(departmentMembers.departmentId, departments.id),
        eq(departments.organizationId, user.organizationId),
      ),
    )
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.organizationId, user.organizationId),
        eq(roles.organizationId, user.organizationId),
      ),
    );

  return {
    roleNames: Array.from(new Set(rows.map((row) => row.roleName))),
    managedDepartments: Array.from(
      new Map(
        rows.flatMap((row) =>
          row.managedDepartmentId && row.managedDepartmentName
            ? [
                [
                  row.managedDepartmentId,
                  { id: row.managedDepartmentId, name: row.managedDepartmentName },
                ],
              ]
            : [],
        ),
      ).values(),
    ).sort((first, second) => first.name.localeCompare(second.name)),
  };
}

async function getAccessibleDepartmentOptions(
  user: CurrentUser,
  isMainAdmin: boolean,
  managedDepartmentIds: number[],
) {
  const conditions = [eq(departments.organizationId, user.organizationId)];

  if (!isMainAdmin) {
    conditions.push(
      managedDepartmentIds.length > 0
        ? inArray(departments.id, managedDepartmentIds)
        : sql`false`,
    );
  }

  return db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(and(...conditions))
    .orderBy(asc(departments.name));
}

type ReportScope = {
  accessibleDepartmentIds: number[];
  selectedDepartmentId?: number;
  dateRange: ReturnType<typeof getReportDateRange>;
};

async function getAnalyticsAggregates(
  user: CurrentUser,
  isMainAdmin: boolean,
  scope: ReportScope,
) {
  const weekRange = getWeekRange(new Date());
  const monthRange = getMonthRange(new Date());
  const departmentCondition = getDepartmentCondition(scope);
  const result = await db.execute<AnalyticsAggregateRow>(sql`
    with selected_departments as (
      select d.id, d.name
      from ${departments} d
      where d.organization_id = ${user.organizationId}
        and ${departmentCondition}
    ),
    task_base as (
      select t.id, t.department_id, t.status, t.priority, t.due_date
      from ${tasks} t
      inner join selected_departments sd on sd.id = t.department_id
      where t.organization_id = ${user.organizationId}
        and t.created_at >= ${scope.dateRange.startDateTime}
        and t.created_at < ${scope.dateRange.endDateTime}
    ),
    leave_base as (
      select lr.id, lr.department_id, lr.status, lr.type, lr.start_date, lr.end_date
      from ${leaveRequests} lr
      inner join selected_departments sd on sd.id = lr.department_id
      where lr.organization_id = ${user.organizationId}
        and lr.start_date <= ${scope.dateRange.endDate}
        and lr.end_date >= ${scope.dateRange.startDate}
    ),
    shift_base as (
      select s.id, s.department_id, s.status, s.start_time, s.end_time
      from ${shifts} s
      inner join selected_departments sd on sd.id = s.department_id
      where s.organization_id = ${user.organizationId}
        and s.start_time >= ${scope.dateRange.startDateTime}
        and s.start_time < ${scope.dateRange.endDateTime}
    ),
    employee_counts as (
      select dm.department_id, count(distinct dm.user_id)::int as total
      from ${departmentMembers} dm
      inner join ${users} u on u.id = dm.user_id
      inner join selected_departments sd on sd.id = dm.department_id
      where dm.organization_id = ${user.organizationId}
        and u.organization_id = ${user.organizationId}
        and u.is_active = true
      group by dm.department_id
    ),
    task_status_counts as (
      select status::text as key, count(*)::int as total
      from task_base
      group by status
    ),
    task_priority_counts as (
      select priority::text as key, count(*)::int as total
      from task_base
      group by priority
    ),
    active_task_department_counts as (
      select tb.department_id, count(*)::int as total
      from task_base tb
      where tb.status in ('todo', 'in_progress')
      group by tb.department_id
    ),
    completed_task_department_counts as (
      select tb.department_id, count(*)::int as total
      from task_base tb
      where tb.status = 'completed'
      group by tb.department_id
    ),
    leave_status_counts as (
      select status::text as key, count(*)::int as total
      from leave_base
      group by status
    ),
    leave_type_counts as (
      select type::text as key, count(*)::int as total
      from leave_base
      group by type
    ),
    leave_department_counts as (
      select lb.department_id, count(*)::int as total
      from leave_base lb
      group by lb.department_id
    ),
    pending_leave_department_counts as (
      select lb.department_id, count(*)::int as total
      from leave_base lb
      where lb.status = 'pending'
      group by lb.department_id
    ),
    shift_status_counts as (
      select status::text as key, count(*)::int as total
      from shift_base
      group by status
    ),
    shift_department_counts as (
      select sb.department_id, count(*)::int as total
      from shift_base sb
      group by sb.department_id
    ),
    upcoming_shift_department_counts as (
      select sb.department_id, count(*)::int as total
      from shift_base sb
      where sb.status = 'scheduled'
        and sb.start_time >= now()
      group by sb.department_id
    )
    select
      (select count(*)::int from selected_departments) as "totalDepartments",
      ${
        isMainAdmin
          ? sql`(
              select count(*)::int
              from ${users} u
              where u.organization_id = ${user.organizationId}
                and u.is_active = true
            )`
          : sql`0`
      } as "totalActiveUsers",
      ${
        isMainAdmin
          ? sql`(
              select count(distinct ur.user_id)::int
              from ${userRoles} ur
              inner join ${roles} r on r.id = ur.role_id
              where ur.organization_id = ${user.organizationId}
                and r.organization_id = ${user.organizationId}
                and r.name = 'Department Manager'
            )`
          : sql`0`
      } as "totalDepartmentManagers",
      (select coalesce(sum(total), 0)::int from employee_counts) as "totalEmployees",
      (select count(*)::int from task_base where status in ('todo', 'in_progress')) as "totalActiveTasks",
      (select count(*)::int from task_base where status = 'completed') as "totalCompletedTasks",
      (select count(*)::int from leave_base where status = 'pending') as "totalPendingLeaveRequests",
      (select count(*)::int from leave_base where status = 'approved') as "totalApprovedLeaveRequests",
      (select count(*)::int from shift_base where status = 'scheduled' and start_time >= now()) as "totalUpcomingShifts",
      (select count(*)::int from shift_base where status = 'completed') as "totalCompletedShifts",
      (select count(*)::int from task_base where status in ('todo', 'in_progress') and due_date < current_date) as "overdueTasks",
      (select count(*)::int from task_base where status in ('todo', 'in_progress') and due_date >= ${weekRange.startDate} and due_date <= ${weekRange.endDate}) as "tasksDueThisWeek",
      (select count(*)::int from leave_base where status = 'approved' and start_date >= current_date) as "upcomingApprovedLeave",
      (select count(*)::int from shift_base where status = 'cancelled') as "cancelledShifts",
      (
        select count(*)::int
        from shift_base sb
        where not exists (
          select 1
          from ${shiftAssignments} sa
          where sa.shift_id = sb.id
            and sa.organization_id = ${user.organizationId}
        )
      ) as "shiftsWithoutAssignedEmployees",
      (
        select count(*)::int
        from ${shifts} s
        inner join selected_departments sd on sd.id = s.department_id
        where s.organization_id = ${user.organizationId}
          and s.start_time >= ${weekRange.startDateTime}
          and s.start_time < ${weekRange.endDateTime}
      ) as "shiftsThisWeek",
      (
        select count(*)::int
        from ${shifts} s
        inner join selected_departments sd on sd.id = s.department_id
        where s.organization_id = ${user.organizationId}
          and s.start_time >= ${monthRange.startDateTime}
          and s.start_time < ${monthRange.endDateTime}
      ) as "shiftsThisMonth",
      ${jsonKeyCounts("task_status_counts", reportTaskStatuses)} as "taskStatus",
      ${jsonKeyCounts("task_priority_counts", ["low", "medium", "high", "urgent"] as const)} as "taskPriority",
      ${jsonDepartmentCounts("active_task_department_counts")} as "activeTasksByDepartment",
      ${jsonKeyCounts("leave_status_counts", reportLeaveStatuses)} as "leaveStatus",
      ${jsonKeyCounts("leave_type_counts", ["sick", "vacation", "personal", "unpaid", "remote", "training", "other"] as const)} as "leaveType",
      ${jsonDepartmentCounts("leave_department_counts")} as "leaveByDepartment",
      ${jsonKeyCounts("shift_status_counts", reportShiftStatuses)} as "shiftStatus",
      ${jsonDepartmentCounts("shift_department_counts")} as "shiftsByDepartment",
      (
        select coalesce(json_agg(json_build_object(
          'id', sd.id,
          'name', sd.name,
          'employees', coalesce(ec.total, 0),
          'activeTasks', coalesce(atdc.total, 0),
          'completedTasks', coalesce(ctdc.total, 0),
          'pendingLeaveRequests', coalesce(pldc.total, 0),
          'upcomingShifts', coalesce(usdc.total, 0)
        ) order by sd.name), '[]'::json)
        from selected_departments sd
        left join employee_counts ec on ec.department_id = sd.id
        left join active_task_department_counts atdc on atdc.department_id = sd.id
        left join completed_task_department_counts ctdc on ctdc.department_id = sd.id
        left join pending_leave_department_counts pldc on pldc.department_id = sd.id
        left join upcoming_shift_department_counts usdc on usdc.department_id = sd.id
      ) as "departmentComparison"
  `);

  return mapAnalyticsAggregate(result.rows[0]);
}

type AnalyticsAggregateRow = {
  totalDepartments: number;
  totalActiveUsers: number;
  totalDepartmentManagers: number;
  totalEmployees: number;
  totalActiveTasks: number;
  totalCompletedTasks: number;
  totalPendingLeaveRequests: number;
  totalApprovedLeaveRequests: number;
  totalUpcomingShifts: number;
  totalCompletedShifts: number;
  overdueTasks: number;
  tasksDueThisWeek: number;
  upcomingApprovedLeave: number;
  cancelledShifts: number;
  shiftsWithoutAssignedEmployees: number;
  shiftsThisWeek: number;
  shiftsThisMonth: number;
  taskStatus: CountByKey[] | string;
  taskPriority: CountByKey[] | string;
  activeTasksByDepartment: CountByDepartment[] | string;
  leaveStatus: CountByKey[] | string;
  leaveType: CountByKey[] | string;
  leaveByDepartment: CountByDepartment[] | string;
  shiftStatus: CountByKey[] | string;
  shiftsByDepartment: CountByDepartment[] | string;
  departmentComparison: DepartmentComparisonRow[] | string;
};

type CountByKey = { key: string; total: number };
type CountByDepartment = { id: number; name: string; total: number };
type DepartmentComparisonRow = {
  id: number;
  name: string;
  employees: number;
  activeTasks: number;
  completedTasks: number;
  pendingLeaveRequests: number;
  upcomingShifts: number;
};

function mapAnalyticsAggregate(row: AnalyticsAggregateRow) {
  return {
    summary: {
      totalDepartments: Number(row.totalDepartments),
      totalActiveUsers: Number(row.totalActiveUsers),
      totalDepartmentManagers: Number(row.totalDepartmentManagers),
      totalEmployees: Number(row.totalEmployees),
      totalActiveTasks: Number(row.totalActiveTasks),
      totalCompletedTasks: Number(row.totalCompletedTasks),
      totalPendingLeaveRequests: Number(row.totalPendingLeaveRequests),
      totalApprovedLeaveRequests: Number(row.totalApprovedLeaveRequests),
      totalUpcomingShifts: Number(row.totalUpcomingShifts),
      totalCompletedShifts: Number(row.totalCompletedShifts),
    },
    taskReport: {
      byStatus: parseJsonRows<CountByKey>(row.taskStatus),
      byPriority: parseJsonRows<CountByKey>(row.taskPriority),
      overdueTasks: Number(row.overdueTasks),
      tasksDueThisWeek: Number(row.tasksDueThisWeek),
      activeByDepartment: parseJsonRows<CountByDepartment>(
        row.activeTasksByDepartment,
      ),
    },
    leaveReport: {
      byStatus: parseJsonRows<CountByKey>(row.leaveStatus),
      byType: parseJsonRows<CountByKey>(row.leaveType),
      upcomingApprovedLeave: Number(row.upcomingApprovedLeave),
      leaveRequestsByDepartment: parseJsonRows<CountByDepartment>(
        row.leaveByDepartment,
      ),
    },
    shiftReport: {
      byStatus: parseJsonRows<CountByKey>(row.shiftStatus),
      shiftsByDepartment: parseJsonRows<CountByDepartment>(
        row.shiftsByDepartment,
      ),
      upcomingShifts: Number(row.totalUpcomingShifts),
      completedShifts: Number(row.totalCompletedShifts),
      cancelledShifts: Number(row.cancelledShifts),
      shiftsWithoutAssignedEmployees: Number(row.shiftsWithoutAssignedEmployees),
      shiftsThisWeek: Number(row.shiftsThisWeek),
      shiftsThisMonth: Number(row.shiftsThisMonth),
    },
    departmentComparison: parseJsonRows<DepartmentComparisonRow>(
      row.departmentComparison,
    ),
  };
}

function parseJsonRows<T>(value: T[] | string) {
  return (typeof value === "string" ? JSON.parse(value) : value) as T[];
}

function getDepartmentCondition(scope: ReportScope) {
  if (scope.selectedDepartmentId) {
    return sql`d.id = ${scope.selectedDepartmentId}`;
  }

  return scope.accessibleDepartmentIds.length > 0
    ? sql`d.id in (${sql.join(
        scope.accessibleDepartmentIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql`false`;
}

function jsonKeyCounts(name: string, keys: readonly string[]) {
  return sql`
    (
      select coalesce(json_agg(json_build_object(
        'key', key_list.key,
        'total', coalesce(counts.total, 0)
      ) order by key_list.position), '[]'::json)
      from (
        values ${sql.join(
          keys.map((key, index) => sql`(${key}, ${index})`),
          sql`, `,
        )}
      ) as key_list(key, position)
      left join ${sql.identifier(name)} counts on counts.key = key_list.key
    )
  `;
}

function jsonDepartmentCounts(name: string) {
  return sql`
    (
      select coalesce(json_agg(json_build_object(
        'id', sd.id,
        'name', sd.name,
        'total', coalesce(counts.total, 0)
      ) order by sd.name), '[]'::json)
      from selected_departments sd
      left join ${sql.identifier(name)} counts on counts.department_id = sd.id
    )
  `;
}

type DateRange = {
  startDate: string;
  endDate: string;
  startDateTime: Date;
  endDateTime: Date;
  label: string;
};

function getReportDateRange(filters: ReportFilters): DateRange {
  const today = startOfDay(new Date());
  let start = startOfMonth(today);
  let end = addDays(today, 1);
  let label = "This Month";

  if (filters.period === "last_30_days") {
    start = addDays(today, -29);
    label = "Last 30 Days";
  } else if (filters.period === "this_quarter") {
    start = startOfQuarter(today);
    label = "This Quarter";
  } else if (filters.period === "this_year") {
    start = new Date(today.getFullYear(), 0, 1);
    label = "This Year";
  } else if (filters.period === "last_year") {
    start = new Date(today.getFullYear() - 1, 0, 1);
    end = new Date(today.getFullYear(), 0, 1);
    label = "Last Year";
  } else if (filters.period === "last_2_years") {
    start = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    label = "Last 2 Years";
  } else if (filters.period === "last_3_years") {
    start = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    label = "Last 3 Years";
  } else if (filters.period === "last_5_years") {
    start = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());
    label = "Last 5 Years";
  } else if (filters.period === "custom") {
    const parsedStart = parseIsoDate(filters.customStartDate);
    const parsedEnd = parseIsoDate(filters.customEndDate);

    if (parsedStart && parsedEnd) {
      start = parsedStart;
      end = addDays(parsedEnd, 1);
      label = "Custom Date Range";
    }
  }

  const maxStart = new Date(end);
  maxStart.setFullYear(maxStart.getFullYear() - 5);

  if (start < maxStart) {
    start = maxStart;
  }

  if (end <= start) {
    end = addDays(start, 1);
  }

  const inclusiveEnd = addDays(end, -1);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(inclusiveEnd),
    startDateTime: start,
    endDateTime: end,
    label,
  };
}

function getWeekRange(value: Date): DateRange {
  const date = startOfDay(value);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addDays(date, mondayOffset);
  const end = addDays(start, 7);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(addDays(end, -1)),
    startDateTime: start,
    endDateTime: end,
    label: "This Week",
  };
}

function getMonthRange(value: Date): DateRange {
  const start = startOfMonth(startOfDay(value));
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(addDays(end, -1)),
    startDateTime: start,
    endDateTime: end,
    label: "This Month",
  };
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfQuarter(value: Date) {
  return new Date(value.getFullYear(), Math.floor(value.getMonth() / 3) * 3, 1);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function parseIsoDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
