import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  departmentMembers,
  departments,
  leaveRequests,
  organizations,
  roles,
  shiftAssignments,
  shifts,
  tasks,
  userRoles,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/types";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const activeTaskStatuses = ["todo", "in_progress"] as const;

export async function getDashboardData(user: CurrentUser) {
  const { roleNames, managedDepartments } = await getDashboardActorContext(user);

  const isMainAdmin = roleNames.includes("Main Admin");
  const isDepartmentManager = managedDepartments.length > 0;
  const managedDepartmentIds = managedDepartments.map((department) => department.id);

  const [
    myActiveTasks,
    myUpcomingShifts,
    myLeaveRequests,
    pendingLeaveApprovals,
    upcomingDepartmentShifts,
    departmentTasks,
    organizationSummary,
    organizationPendingLeaveRequests,
    recentlyCreatedTasks,
  ] = await Promise.all([
    getMyActiveTasks(user),
    getMyUpcomingShifts(user),
    getMyLeaveRequests(user),
    isDepartmentManager
      ? getPendingLeaveApprovals(user, managedDepartmentIds)
      : Promise.resolve([]),
    isDepartmentManager
      ? getUpcomingDepartmentShifts(user, managedDepartmentIds)
      : Promise.resolve([]),
    isDepartmentManager
      ? getDepartmentTasks(user, managedDepartmentIds)
      : Promise.resolve([]),
    isMainAdmin ? getOrganizationSummary(user) : Promise.resolve(null),
    isMainAdmin
      ? getOrganizationPendingLeaveRequests(user)
      : Promise.resolve([]),
    isMainAdmin ? getRecentlyCreatedTasks(user) : Promise.resolve([]),
  ]);

  return {
    roles: roleNames,
    managedDepartments,
    isDepartmentManager,
    isMainAdmin,
    myActiveTasks,
    myUpcomingShifts,
    myLeaveRequests,
    pendingLeaveApprovals,
    upcomingDepartmentShifts,
    departmentTasks,
    organizationSummary,
    organizationPendingLeaveRequests,
    recentlyCreatedTasks,
  };
}

async function getDashboardActorContext(user: CurrentUser) {
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
                  {
                    id: row.managedDepartmentId,
                    name: row.managedDepartmentName,
                  },
                ],
              ]
            : [],
        ),
      ).values(),
    ).sort((first, second) => first.name.localeCompare(second.name)),
  };
}

async function getMyActiveTasks(user: CurrentUser) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      department: departments.name,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .innerJoin(departments, eq(tasks.departmentId, departments.id))
    .where(
      and(
        eq(tasks.organizationId, user.organizationId),
        eq(departments.organizationId, user.organizationId),
        eq(tasks.assignedToUserId, user.id),
        inArray(tasks.status, activeTaskStatuses),
      ),
    )
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.id))
    .limit(8);
}

async function getMyUpcomingShifts(user: CurrentUser) {
  return db
    .select({
      id: shifts.id,
      title: shifts.title,
      department: departments.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      location: shifts.location,
      status: shifts.status,
    })
    .from(shiftAssignments)
    .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
    .innerJoin(departments, eq(shifts.departmentId, departments.id))
    .where(
      and(
        eq(shiftAssignments.organizationId, user.organizationId),
        eq(shiftAssignments.userId, user.id),
        eq(shifts.organizationId, user.organizationId),
        eq(departments.organizationId, user.organizationId),
        gt(shifts.startTime, new Date()),
        ne(shifts.status, "cancelled"),
      ),
    )
    .orderBy(asc(shifts.startTime), asc(shifts.id))
    .limit(8);
}

async function getMyLeaveRequests(user: CurrentUser) {
  return db
    .select({
      id: leaveRequests.id,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.organizationId, user.organizationId),
        eq(leaveRequests.userId, user.id),
      ),
    )
    .orderBy(
      sql`case when ${leaveRequests.status} = 'pending' then 0 else 1 end`,
      desc(leaveRequests.createdAt),
    )
    .limit(8);
}

async function getPendingLeaveApprovals(
  user: CurrentUser,
  managedDepartmentIds: number[],
) {
  if (managedDepartmentIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: leaveRequests.id,
      employeeName: users.name,
      department: departments.name,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      reason: leaveRequests.reason,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
    .where(
      and(
        eq(leaveRequests.organizationId, user.organizationId),
        eq(users.organizationId, user.organizationId),
        eq(departments.organizationId, user.organizationId),
        inArray(leaveRequests.departmentId, managedDepartmentIds),
        eq(leaveRequests.status, "pending"),
      ),
    )
    .orderBy(desc(leaveRequests.createdAt), desc(leaveRequests.id))
    .limit(8);
}

async function getUpcomingDepartmentShifts(
  user: CurrentUser,
  managedDepartmentIds: number[],
) {
  if (managedDepartmentIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: shifts.id,
      title: shifts.title,
      department: departments.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      location: shifts.location,
      status: shifts.status,
      assignedEmployees: count(shiftAssignments.id),
    })
    .from(shifts)
    .innerJoin(departments, eq(shifts.departmentId, departments.id))
    .leftJoin(shiftAssignments, eq(shifts.id, shiftAssignments.shiftId))
    .where(
      and(
        eq(shifts.organizationId, user.organizationId),
        eq(departments.organizationId, user.organizationId),
        inArray(shifts.departmentId, managedDepartmentIds),
        gt(shifts.startTime, new Date()),
        ne(shifts.status, "cancelled"),
      ),
    )
    .groupBy(shifts.id, departments.name)
    .orderBy(asc(shifts.startTime), asc(shifts.id))
    .limit(8);
}

async function getDepartmentTasks(
  user: CurrentUser,
  managedDepartmentIds: number[],
) {
  if (managedDepartmentIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      department: departments.name,
      assignedEmployee: users.name,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .innerJoin(departments, eq(tasks.departmentId, departments.id))
    .leftJoin(users, eq(tasks.assignedToUserId, users.id))
    .where(
      and(
        eq(tasks.organizationId, user.organizationId),
        eq(departments.organizationId, user.organizationId),
        inArray(tasks.departmentId, managedDepartmentIds),
        inArray(tasks.status, activeTaskStatuses),
        or(eq(users.organizationId, user.organizationId), sql`${users.id} is null`),
      ),
    )
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.id))
    .limit(10);
}

async function getOrganizationSummary(user: CurrentUser) {
  const [row] = await db
    .select({
      totalDepartments: sql<number>`(
        select count(*)
        from ${departments}
        where ${departments.organizationId} = ${user.organizationId}
      )`,
      totalActiveUsers: sql<number>`(
        select count(*)
        from ${users}
        where ${users.organizationId} = ${user.organizationId}
          and ${users.isActive} = true
      )`,
      totalDepartmentManagers: sql<number>`(
        select count(distinct "user_roles"."user_id")
        from "user_roles"
        inner join "roles" on "user_roles"."role_id" = "roles"."id"
        where "user_roles"."organization_id" = ${user.organizationId}
          and "roles"."organization_id" = ${user.organizationId}
          and "roles"."name" = 'Department Manager'
      )`,
      totalPendingLeaveRequests: sql<number>`(
        select count(*)
        from ${leaveRequests}
        where ${leaveRequests.organizationId} = ${user.organizationId}
          and ${leaveRequests.status} = 'pending'
      )`,
      totalUpcomingShifts: sql<number>`(
        select count(*)
        from ${shifts}
        where ${shifts.organizationId} = ${user.organizationId}
          and ${shifts.startTime} > now()
          and ${shifts.status} <> 'cancelled'
      )`,
      totalActiveTasks: sql<number>`(
        select count(*)
        from ${tasks}
        where ${tasks.organizationId} = ${user.organizationId}
          and ${tasks.status} in ('todo', 'in_progress')
      )`,
    })
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  return {
    totalDepartments: Number(row?.totalDepartments ?? 0),
    totalActiveUsers: Number(row?.totalActiveUsers ?? 0),
    totalDepartmentManagers: Number(row?.totalDepartmentManagers ?? 0),
    totalPendingLeaveRequests: Number(row?.totalPendingLeaveRequests ?? 0),
    totalUpcomingShifts: Number(row?.totalUpcomingShifts ?? 0),
    totalActiveTasks: Number(row?.totalActiveTasks ?? 0),
  };
}

async function getOrganizationPendingLeaveRequests(user: CurrentUser) {
  return db
    .select({
      id: leaveRequests.id,
      employeeName: users.name,
      department: departments.name,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
    .where(
      and(
        eq(leaveRequests.organizationId, user.organizationId),
        eq(users.organizationId, user.organizationId),
        eq(departments.organizationId, user.organizationId),
        eq(leaveRequests.status, "pending"),
      ),
    )
    .orderBy(desc(leaveRequests.createdAt), desc(leaveRequests.id))
    .limit(8);
}

async function getRecentlyCreatedTasks(user: CurrentUser) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      department: departments.name,
      assignedEmployee: users.name,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .innerJoin(departments, eq(tasks.departmentId, departments.id))
    .leftJoin(users, eq(tasks.assignedToUserId, users.id))
    .where(
      and(
        eq(tasks.organizationId, user.organizationId),
        eq(departments.organizationId, user.organizationId),
        inArray(tasks.status, activeTaskStatuses),
        or(eq(users.organizationId, user.organizationId), sql`${users.id} is null`),
      ),
    )
    .orderBy(desc(tasks.createdAt), desc(tasks.id))
    .limit(8);
}
