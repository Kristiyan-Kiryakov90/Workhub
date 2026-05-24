import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  gt,
  ilike,
  inArray,
  lte,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  departmentMembers,
  departments,
  leaveRequests,
  permissions,
  rolePermissions,
  roles,
  shiftAssignments,
  shifts,
  userRoles,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/types";
import {
  createNotifications,
  getDepartmentManagerIds,
  type CreateNotificationInput,
} from "@/modules/notifications/services/notification-service";

export const shiftStatuses = ["scheduled", "completed", "cancelled"] as const;
export const shiftDateRanges = ["upcoming", "today", "this_week", "this_month"] as const;
export const shiftColors = [
  "cyan",
  "emerald",
  "lime",
  "amber",
  "orange",
  "rose",
  "pink",
  "violet",
  "indigo",
  "sky",
  "teal",
  "slate",
] as const;

export type ShiftStatus = (typeof shiftStatuses)[number];
export type ShiftDateRange = (typeof shiftDateRanges)[number];
export type ShiftColor = (typeof shiftColors)[number];

export type ShiftListFilters = {
  status?: ShiftStatus;
  departmentId?: number;
  assignedToUserId?: number;
  dateRange?: ShiftDateRange;
  search?: string;
  myUpcomingPage?: number;
  myArchivePage?: number;
  departmentUpcomingPage?: number;
  departmentArchivePage?: number;
  organizationUpcomingPage?: number;
  organizationArchivePage?: number;
};

export type ShiftListData = Awaited<ReturnType<typeof getShiftListData>>;
export type ShiftDetails = Awaited<ReturnType<typeof getShiftDetails>>;
export type ShiftCalendarData = Awaited<ReturnType<typeof getShiftCalendarData>>;
export type ShiftFormData = Awaited<ReturnType<typeof getShiftFormData>>;
export type CreateShiftInput = {
  title: string;
  departmentId: number;
  startTime: Date;
  endTime: Date;
  location: string | null;
  color: ShiftColor;
  notes: string | null;
  status: ShiftStatus;
  assignedUserIds: number[];
};
export type UpdateShiftInput = CreateShiftInput & {
  shiftId: number;
};

const pageSize = 8;

export async function getShiftListData(
  user: CurrentUser,
  filters: ShiftListFilters,
  options: { includeLists?: boolean } = {},
) {
  const context = await getShiftActorContext(user);
  const includeLists = options.includeLists ?? true;
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);
  const isDepartmentManager = managedDepartmentIds.length > 0 && !isMainAdmin;
  const canFilterByEmployee = isMainAdmin || managedDepartmentIds.length > 0;

  const [
    departmentOptions,
    employeeOptions,
    myUpcomingShifts,
    myArchivedShifts,
    departmentUpcomingShifts,
    departmentArchivedShifts,
    organizationUpcomingShifts,
    organizationArchivedShifts,
  ] = await Promise.all([
    getDepartmentOptions(user, isMainAdmin, managedDepartmentIds),
    canFilterByEmployee
      ? getEmployeeOptions(user, isMainAdmin, managedDepartmentIds)
      : Promise.resolve([]),
    includeLists && !isMainAdmin
      ? getShiftsPage(user, filters, {
          scope: "mine",
          section: "upcoming",
          page: filters.myUpcomingPage ?? 1,
          isMainAdmin,
          managedDepartmentIds,
        })
      : Promise.resolve(emptyPage(filters.myUpcomingPage ?? 1)),
    includeLists && !isMainAdmin
      ? getShiftsPage(user, filters, {
          scope: "mine",
          section: "archive",
          page: filters.myArchivePage ?? 1,
          isMainAdmin,
          managedDepartmentIds,
        })
      : Promise.resolve(emptyPage(filters.myArchivePage ?? 1)),
    includeLists && isDepartmentManager
      ? getShiftsPage(user, filters, {
          scope: "managed-departments",
          section: "upcoming",
          page: filters.departmentUpcomingPage ?? 1,
          isMainAdmin,
          managedDepartmentIds,
        })
      : Promise.resolve(emptyPage(filters.departmentUpcomingPage ?? 1)),
    includeLists && isDepartmentManager
      ? getShiftsPage(user, filters, {
          scope: "managed-departments",
          section: "archive",
          page: filters.departmentArchivePage ?? 1,
          isMainAdmin,
          managedDepartmentIds,
        })
      : Promise.resolve(emptyPage(filters.departmentArchivePage ?? 1)),
    includeLists && isMainAdmin
      ? getShiftsPage(user, filters, {
          scope: "organization",
          section: "upcoming",
          page: filters.organizationUpcomingPage ?? 1,
          isMainAdmin,
          managedDepartmentIds,
        })
      : Promise.resolve(emptyPage(filters.organizationUpcomingPage ?? 1)),
    includeLists && isMainAdmin
      ? getShiftsPage(user, filters, {
          scope: "organization",
          section: "archive",
          page: filters.organizationArchivePage ?? 1,
          isMainAdmin,
          managedDepartmentIds,
        })
      : Promise.resolve(emptyPage(filters.organizationArchivePage ?? 1)),
  ]);

  return {
    filters,
    pageSize,
    isMainAdmin,
    isDepartmentManager,
    canCreateShift: context.permissions.has("shifts.create"),
    canFilterByEmployee,
    departmentOptions,
    employeeOptions,
    myUpcomingShifts,
    myArchivedShifts,
    departmentUpcomingShifts,
    departmentArchivedShifts,
    organizationUpcomingShifts,
    organizationArchivedShifts,
  };
}

export async function getShiftDetails(
  user: CurrentUser,
  shiftId: number,
  scope: "self" | "manager" | "admin",
) {
  const conditions = [
    eq(shifts.id, shiftId),
    eq(shifts.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
  ];

  if (scope === "self") {
    conditions.push(userAssignedToShiftSql(user));
  } else if (scope === "manager") {
    conditions.push(managerCanAccessShiftSql(user));
  } else {
    conditions.push(mainAdminCanAccessShiftSql(user));
  }

  const assignmentCounts = getAssignmentCountsSubquery(user);
  const [shift] = await db
    .select({
      id: shifts.id,
      departmentId: shifts.departmentId,
      title: shifts.title,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      location: shifts.location,
      color: shifts.color,
      notes: shifts.notes,
      status: shifts.status,
      departmentName: departments.name,
      assignedEmployeeCount: assignmentCounts.total,
    })
    .from(shifts)
    .innerJoin(departments, eq(shifts.departmentId, departments.id))
    .leftJoin(assignmentCounts, eq(assignmentCounts.shiftId, shifts.id))
    .where(and(...conditions))
    .limit(1);

  if (!shift) {
    return null;
  }

  const assignedEmployees = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(shiftAssignments)
    .innerJoin(users, eq(shiftAssignments.userId, users.id))
    .where(
      and(
        eq(shiftAssignments.shiftId, shiftId),
        eq(shiftAssignments.organizationId, user.organizationId),
        eq(users.organizationId, user.organizationId),
      ),
    )
    .orderBy(asc(users.name));

  return {
    ...shift,
    assignedEmployeeCount: Number(shift.assignedEmployeeCount ?? 0),
    assignedEmployees,
  };
}

export async function getShiftCalendarData(
  user: CurrentUser,
  input: { month?: string } = {},
) {
  const context = await getShiftActorContext(user);
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);
  const canManageCalendar = isMainAdmin || managedDepartmentIds.length > 0;
  const monthStart = parseMonthStart(input.month);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const monthStartDate = toIsoDate(monthStart);
  const monthEndDate = toIsoDate(new Date(monthEnd.getTime() - 1));

  const shiftConditions = [
    eq(shifts.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    lt(shifts.startTime, monthEnd),
    gte(shifts.endTime, monthStart),
    inArray(shifts.status, ["scheduled", "completed", "cancelled"]),
  ];

  if (isMainAdmin) {
    shiftConditions.push(mainAdminCanAccessShiftSql(user));
  } else if (managedDepartmentIds.length > 0) {
    shiftConditions.push(inArray(shifts.departmentId, managedDepartmentIds));
  } else {
    shiftConditions.push(userAssignedToShiftSql(user));
  }

  const leaveConditions = [
    eq(leaveRequests.organizationId, user.organizationId),
    eq(users.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    lte(leaveRequests.startDate, monthEndDate),
    gte(leaveRequests.endDate, monthStartDate),
    inArray(leaveRequests.status, ["pending", "approved"]),
  ];

  if (!isMainAdmin) {
    leaveConditions.push(
      managedDepartmentIds.length > 0
        ? inArray(leaveRequests.departmentId, managedDepartmentIds)
        : eq(leaveRequests.userId, user.id),
    );
  }

  const [calendarShifts, calendarLeaves] = await Promise.all([
    db
      .select({
        id: shifts.id,
        title: shifts.title,
        departmentId: shifts.departmentId,
        departmentName: departments.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        location: shifts.location,
        color: shifts.color,
        status: shifts.status,
      })
      .from(shifts)
      .innerJoin(departments, eq(shifts.departmentId, departments.id))
      .where(and(...shiftConditions))
      .orderBy(asc(shifts.startTime), asc(shifts.id)),
    db
      .select({
        id: leaveRequests.id,
        employeeId: users.id,
        employeeName: users.name,
        departmentId: departments.id,
        departmentName: departments.name,
        type: leaveRequests.type,
        status: leaveRequests.status,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
      .where(and(...leaveConditions))
      .orderBy(asc(leaveRequests.startDate), asc(leaveRequests.id)),
  ]);
  const assignmentSummaries = await getCalendarAssignmentSummaries(
    user,
    calendarShifts.map((shift) => shift.id),
  );

  return {
    month: toLocalMonth(monthStart),
    monthLabel: new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
    }).format(monthStart),
    previousMonth: toLocalMonth(addMonths(monthStart, -1)),
    nextMonth: toLocalMonth(addMonths(monthStart, 1)),
    isMainAdmin,
    isDepartmentManager: managedDepartmentIds.length > 0 && !isMainAdmin,
    canCreateShift: context.permissions.has("shifts.create"),
    canManageCalendar,
    shifts: calendarShifts.map((shift) => ({
      ...shift,
      assignedEmployeeCount: assignmentSummaries.get(shift.id)?.count ?? 0,
      assignedEmployeeNames: assignmentSummaries.get(shift.id)?.names ?? [],
    })),
    leaves: calendarLeaves,
  };
}

export async function getShiftFormData(user: CurrentUser) {
  const context = await getShiftActorContext(user);
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);
  const canCreateShift = context.permissions.has("shifts.create");
  const canManageShift = context.permissions.has("shifts.update") || canCreateShift;

  if (!canCreateShift && !canManageShift) {
    return {
      canCreateShift,
      canManageShift,
      departmentOptions: [],
      employeeOptions: [],
    };
  }

  const [departmentOptions, employeeOptions] = await Promise.all([
    getDepartmentOptions(user, isMainAdmin, managedDepartmentIds),
    getEmployeeOptions(user, isMainAdmin, managedDepartmentIds),
  ]);

  return {
    canCreateShift,
    canManageShift,
    isMainAdmin,
    isDepartmentManager: managedDepartmentIds.length > 0 && !isMainAdmin,
    departmentOptions,
    employeeOptions,
  };
}

export async function createShift(user: CurrentUser, input: CreateShiftInput) {
  const access = await validateShiftWriteAccess(user, input);

  if (!access.ok) {
    return access;
  }

  const [leaveConflicts, shiftConflicts] = await Promise.all([
    getLeaveConflicts(user, input),
    getShiftAssignmentConflicts(user, input),
  ]);

  if (leaveConflicts.length > 0) {
    return {
      ok: false,
      error: `Cannot assign ${leaveConflicts.map((conflict) => conflict.employeeName).join(", ")} while leave is pending or approved.`,
    };
  }

  if (shiftConflicts.length > 0) {
    return {
      ok: false,
      error: `Cannot assign ${formatUniqueNames(shiftConflicts.map((conflict) => conflict.employeeName))}; already assigned to another overlapping shift.`,
    };
  }

  const [shift] = await db
    .insert(shifts)
    .values({
      organizationId: user.organizationId,
      departmentId: input.departmentId,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      color: input.color,
      notes: input.notes,
      status: input.status,
      createdByUserId: user.id,
    })
    .returning({ id: shifts.id });

  await replaceShiftAssignments(user, shift.id, input.assignedUserIds);
  await createNotifications([
    ...buildShiftAssignmentNotifications(user, {
      shiftId: shift.id,
      title: input.title,
      assignedUserIds: input.assignedUserIds,
    }),
    ...(await buildDepartmentManagerShiftNotifications(user, {
      shiftId: shift.id,
      departmentId: input.departmentId,
      title: "New shift assigned",
      message: `${user.name} created ${input.title} for your department.`,
      type: "shift_assigned",
      excludeUserIds: input.assignedUserIds,
    })),
  ]);

  return { ok: true, shiftId: shift.id };
}

export async function updateShift(user: CurrentUser, input: UpdateShiftInput) {
  const [existingShift] = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(
      and(
        eq(shifts.id, input.shiftId),
        eq(shifts.organizationId, user.organizationId),
        canManageShiftSql(user),
      ),
    )
    .limit(1);

  if (!existingShift) {
    return { ok: false, error: "You do not have access to update this shift." };
  }

  const previousAssignedUserIds = await getShiftAssignedUserIds(
    user,
    input.shiftId,
  );
  const access = await validateShiftWriteAccess(user, input);

  if (!access.ok) {
    return access;
  }

  const [leaveConflicts, shiftConflicts] = await Promise.all([
    getLeaveConflicts(user, input),
    getShiftAssignmentConflicts(user, input),
  ]);

  if (leaveConflicts.length > 0) {
    return {
      ok: false,
      error: `Cannot assign ${leaveConflicts.map((conflict) => conflict.employeeName).join(", ")} while leave is pending or approved.`,
    };
  }

  if (shiftConflicts.length > 0) {
    return {
      ok: false,
      error: `Cannot assign ${formatUniqueNames(shiftConflicts.map((conflict) => conflict.employeeName))}; already assigned to another overlapping shift.`,
    };
  }

  await db
    .update(shifts)
    .set({
      departmentId: input.departmentId,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      color: input.color,
      notes: input.notes,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(shifts.id, input.shiftId),
        eq(shifts.organizationId, user.organizationId),
      ),
    );

  await replaceShiftAssignments(user, input.shiftId, input.assignedUserIds);
  const previousAssignedUserIdSet = new Set(previousAssignedUserIds);
  const notificationType =
    input.status === "cancelled" ? "shift_cancelled" : "shift_updated";

  await createNotifications([
    ...buildShiftUpdateNotifications(user, {
      shiftId: input.shiftId,
      title: input.title,
      status: input.status,
      assignedUserIds: input.assignedUserIds,
      previousAssignedUserIdSet,
      notificationType,
    }),
    ...(await buildDepartmentManagerShiftNotifications(user, {
      shiftId: input.shiftId,
      departmentId: input.departmentId,
      title: input.status === "cancelled" ? "Shift cancelled" : "Shift updated",
      message:
        input.status === "cancelled"
          ? `${user.name} cancelled ${input.title} for your department.`
          : `${user.name} updated ${input.title} for your department.`,
      type: notificationType,
      excludeUserIds: input.assignedUserIds,
    })),
  ]);

  return { ok: true, shiftId: input.shiftId };
}

async function getShiftsPage(
  user: CurrentUser,
  filters: ShiftListFilters,
  options: {
    scope: "mine" | "managed-departments" | "organization";
    section: "upcoming" | "archive";
    page: number;
    isMainAdmin: boolean;
    managedDepartmentIds: number[];
  },
) {
  const where = buildShiftWhere(user, filters, options);
  const offset = (options.page - 1) * pageSize;
  const assignmentCounts = getAssignmentCountsSubquery(user);

  const rows = await db
    .select({
      id: shifts.id,
      title: shifts.title,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      location: shifts.location,
      color: shifts.color,
      status: shifts.status,
      departmentId: departments.id,
      departmentName: departments.name,
      assignedEmployeeCount: assignmentCounts.total,
    })
    .from(shifts)
    .innerJoin(departments, eq(shifts.departmentId, departments.id))
    .leftJoin(assignmentCounts, eq(assignmentCounts.shiftId, shifts.id))
    .where(where)
    .orderBy(...getShiftOrderBy(options.section))
    .limit(pageSize + 1)
    .offset(offset);
  const visibleRows = rows.slice(0, pageSize);
  const hasNextPage = rows.length > pageSize;

  return {
    rows: visibleRows.map((row) => ({
      ...row,
      assignedEmployeeCount: Number(row.assignedEmployeeCount ?? 0),
    })),
    total: offset + visibleRows.length + (hasNextPage ? 1 : 0),
    page: options.page,
    totalPages: hasNextPage ? options.page + 1 : options.page,
    hasPreviousPage: options.page > 1,
    hasNextPage,
  };
}

async function getCalendarAssignmentSummaries(
  user: CurrentUser,
  shiftIds: number[],
) {
  if (shiftIds.length === 0) {
    return new Map<number, { count: number; names: string[] }>();
  }

  const rows = await db
    .select({
      shiftId: shiftAssignments.shiftId,
      employeeName: users.name,
    })
    .from(shiftAssignments)
    .innerJoin(users, eq(shiftAssignments.userId, users.id))
    .where(
      and(
        eq(shiftAssignments.organizationId, user.organizationId),
        inArray(shiftAssignments.shiftId, shiftIds),
        eq(users.organizationId, user.organizationId),
      ),
    )
    .orderBy(asc(users.name));
  const summaries = new Map<number, { count: number; names: string[] }>();

  for (const row of rows) {
    const summary = summaries.get(row.shiftId) ?? { count: 0, names: [] };
    summary.count += 1;
    summary.names.push(row.employeeName);
    summaries.set(row.shiftId, summary);
  }

  return summaries;
}

function buildShiftWhere(
  user: CurrentUser,
  filters: ShiftListFilters,
  options: {
    scope: "mine" | "managed-departments" | "organization";
    section: "upcoming" | "archive";
    managedDepartmentIds: number[];
  },
) {
  const now = new Date();
  const conditions = [
    eq(shifts.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    inArray(shifts.status, [...shiftStatuses]),
  ];

  if (options.scope === "mine") {
    conditions.push(userAssignedToShiftSql(user));
  }

  if (options.scope === "managed-departments") {
    conditions.push(
      options.managedDepartmentIds.length > 0
        ? inArray(shifts.departmentId, options.managedDepartmentIds)
        : sql`false`,
    );
  }

  if (options.scope === "organization") {
    conditions.push(mainAdminCanAccessShiftSql(user));
  }

  if (options.section === "upcoming") {
    conditions.push(eq(shifts.status, "scheduled"), gt(shifts.startTime, now));
  } else {
    conditions.push(
      or(
        inArray(shifts.status, ["completed", "cancelled"]),
        lt(shifts.endTime, now),
      )!,
    );
  }

  if (filters.status) {
    conditions.push(eq(shifts.status, filters.status));
  }

  if (filters.departmentId) {
    conditions.push(eq(shifts.departmentId, filters.departmentId));
  }

  if (filters.assignedToUserId) {
    conditions.push(shiftAssignedToUserSql(user, filters.assignedToUserId));
  }

  if (filters.dateRange) {
    conditions.push(dateRangeSql(filters.dateRange));
  }

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(shifts.title, searchTerm),
        ilike(shifts.location, searchTerm),
        existsEmployeeSearchSql(user, searchTerm),
      )!,
    );
  }

  return and(...conditions);
}

function getShiftOrderBy(section: "upcoming" | "archive") {
  if (section === "archive") {
    return [desc(shifts.startTime), desc(shifts.id)] as const;
  }

  return [asc(shifts.startTime), asc(shifts.id)] as const;
}

function getAssignmentCountsSubquery(user: CurrentUser) {
  return db
    .select({
      shiftId: shiftAssignments.shiftId,
      total: sql<number>`count(${shiftAssignments.id})`.as("total"),
    })
    .from(shiftAssignments)
    .where(eq(shiftAssignments.organizationId, user.organizationId))
    .groupBy(shiftAssignments.shiftId)
    .as("assignment_counts");
}

async function getShiftActorContext(user: CurrentUser) {
  const rows = await db
    .select({
      roleName: roles.name,
      permissionKey: permissions.key,
      managedDepartmentId: departments.id,
      managedDepartmentName: departments.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
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
    permissions: new Set(
      rows.flatMap((row) => (row.permissionKey ? [row.permissionKey] : [])),
    ),
    managedDepartments: Array.from(
      new Map(
        rows.flatMap((row) =>
          row.managedDepartmentId && row.managedDepartmentName
            ? [[row.managedDepartmentId, {
                id: row.managedDepartmentId,
                name: row.managedDepartmentName,
              }]]
            : [],
        ),
      ).values(),
    ).sort((first, second) => first.name.localeCompare(second.name)),
  };
}

async function getDepartmentOptions(
  user: CurrentUser,
  isMainAdmin: boolean,
  managedDepartmentIds: number[],
) {
  if (isMainAdmin) {
    return db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.organizationId, user.organizationId))
      .orderBy(asc(departments.name));
  }

  if (managedDepartmentIds.length > 0) {
    return db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(
        and(
          eq(departments.organizationId, user.organizationId),
          inArray(departments.id, managedDepartmentIds),
        ),
      )
      .orderBy(asc(departments.name));
  }

  return db
    .select({ id: departments.id, name: departments.name })
    .from(departmentMembers)
    .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(
      and(
        eq(departmentMembers.userId, user.id),
        eq(departmentMembers.organizationId, user.organizationId),
        eq(departments.organizationId, user.organizationId),
      ),
    )
    .orderBy(asc(departments.name));
}

async function getEmployeeOptions(
  user: CurrentUser,
  isMainAdmin: boolean,
  managedDepartmentIds: number[],
) {
  if (isMainAdmin) {
    return db
      .select({
        id: users.id,
        name: users.name,
        departmentId: departmentMembers.departmentId,
      })
      .from(departmentMembers)
      .innerJoin(users, eq(departmentMembers.userId, users.id))
      .where(
        and(
          eq(departmentMembers.organizationId, user.organizationId),
          eq(users.organizationId, user.organizationId),
          eq(users.isActive, true),
        ),
      )
      .orderBy(asc(users.name));
  }

  if (managedDepartmentIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      departmentId: departmentMembers.departmentId,
    })
    .from(departmentMembers)
    .innerJoin(users, eq(departmentMembers.userId, users.id))
    .where(
      and(
        eq(departmentMembers.organizationId, user.organizationId),
        inArray(departmentMembers.departmentId, managedDepartmentIds),
        eq(users.organizationId, user.organizationId),
        eq(users.isActive, true),
      ),
    )
    .orderBy(asc(users.name));
}

function userAssignedToShiftSql(user: CurrentUser) {
  return shiftAssignedToUserSql(user, user.id);
}

function shiftAssignedToUserSql(user: CurrentUser, userId: number) {
  return sql`exists (
    select 1
    from ${shiftAssignments}
    where ${shiftAssignments.shiftId} = ${shifts.id}
      and ${shiftAssignments.organizationId} = ${user.organizationId}
      and ${shiftAssignments.userId} = ${userId}
  )`;
}

function managerCanAccessShiftSql(user: CurrentUser) {
  return sql`exists (
    select 1
    from ${departmentMembers}
    where ${departmentMembers.userId} = ${user.id}
      and ${departmentMembers.organizationId} = ${user.organizationId}
      and ${departmentMembers.departmentId} = ${shifts.departmentId}
      and ${departmentMembers.isManager} = true
  )`;
}

function mainAdminCanAccessShiftSql(user: CurrentUser) {
  return sql`exists (
    select 1
    from ${userRoles}
    inner join ${roles} on ${userRoles.roleId} = ${roles.id}
    where ${userRoles.userId} = ${user.id}
      and ${userRoles.organizationId} = ${user.organizationId}
      and ${roles.organizationId} = ${user.organizationId}
      and ${roles.name} = 'Main Admin'
  )`;
}

function canManageShiftSql(user: CurrentUser) {
  return sql`exists (
    select 1
    from ${userRoles}
    inner join ${roles} on ${userRoles.roleId} = ${roles.id}
    left join ${rolePermissions} on ${roles.id} = ${rolePermissions.roleId}
    left join ${permissions} on ${rolePermissions.permissionId} = ${permissions.id}
    where ${userRoles.userId} = ${user.id}
      and ${userRoles.organizationId} = ${user.organizationId}
      and ${roles.organizationId} = ${user.organizationId}
      and ${permissions.key} in ('shifts.update', 'shifts.create')
      and (
        ${roles.name} = 'Main Admin'
        or exists (
          select 1
          from ${departmentMembers}
          where ${departmentMembers.userId} = ${user.id}
            and ${departmentMembers.organizationId} = ${user.organizationId}
            and ${departmentMembers.departmentId} = ${shifts.departmentId}
            and ${departmentMembers.isManager} = true
        )
      )
  )`;
}

function existsEmployeeSearchSql(user: CurrentUser, searchTerm: string) {
  return sql`exists (
    select 1
    from ${shiftAssignments}
    inner join ${users} on ${shiftAssignments.userId} = ${users.id}
    where ${shiftAssignments.shiftId} = ${shifts.id}
      and ${shiftAssignments.organizationId} = ${user.organizationId}
      and ${users.organizationId} = ${user.organizationId}
      and (${users.name} ilike ${searchTerm} or ${users.email} ilike ${searchTerm})
  )`;
}

function dateRangeSql(range: ShiftDateRange) {
  if (range === "today") {
    return sql`${shifts.startTime} >= date_trunc('day', now()) and ${shifts.startTime} < date_trunc('day', now()) + interval '1 day'`;
  }

  if (range === "this_week") {
    return sql`${shifts.startTime} >= date_trunc('week', now()) and ${shifts.startTime} < date_trunc('week', now()) + interval '1 week'`;
  }

  if (range === "this_month") {
    return sql`${shifts.startTime} >= date_trunc('month', now()) and ${shifts.startTime} < date_trunc('month', now()) + interval '1 month'`;
  }

  return sql`${shifts.startTime} >= now()`;
}

function emptyPage(page: number) {
  return {
    rows: [],
    total: 0,
    page,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function buildShiftAssignmentNotifications(
  user: CurrentUser,
  input: {
    shiftId: number;
    title: string;
    assignedUserIds: number[];
  },
): CreateNotificationInput[] {
  return input.assignedUserIds
    .filter((userId) => userId !== user.id)
    .map((userId) => ({
      organizationId: user.organizationId,
      userId,
      type: "shift_assigned",
      title: "New shift assigned",
      message: `You were assigned to ${input.title}.`,
      relatedEntityType: "shift",
      relatedEntityId: input.shiftId,
      actionUrl: `/shifts/${input.shiftId}`,
    }));
}

function buildShiftUpdateNotifications(
  user: CurrentUser,
  input: {
    shiftId: number;
    title: string;
    status: ShiftStatus;
    assignedUserIds: number[];
    previousAssignedUserIdSet: Set<number>;
    notificationType: "shift_updated" | "shift_cancelled";
  },
): CreateNotificationInput[] {
  return input.assignedUserIds
    .filter((userId) => userId !== user.id)
    .map((userId) => ({
      organizationId: user.organizationId,
      userId,
      type: input.previousAssignedUserIdSet.has(userId)
        ? input.notificationType
        : "shift_assigned",
      title:
        input.status === "cancelled"
          ? "Shift cancelled"
          : input.previousAssignedUserIdSet.has(userId)
            ? "Shift updated"
            : "New shift assigned",
      message:
        input.status === "cancelled"
          ? "Your shift schedule has been cancelled."
          : input.previousAssignedUserIdSet.has(userId)
            ? "Your shift schedule has changed."
            : `You were assigned to ${input.title}.`,
      relatedEntityType: "shift",
      relatedEntityId: input.shiftId,
      actionUrl: `/shifts/${input.shiftId}`,
    }));
}

async function buildDepartmentManagerShiftNotifications(
  user: CurrentUser,
  input: {
    shiftId: number;
    departmentId: number;
    title: string;
    message: string;
    type: "shift_assigned" | "shift_updated" | "shift_cancelled";
    excludeUserIds?: number[];
  },
): Promise<CreateNotificationInput[]> {
  const excludedUserIds = new Set([user.id, ...(input.excludeUserIds ?? [])]);
  const managerIds = await getDepartmentManagerIds(
    user.organizationId,
    input.departmentId,
  );

  return managerIds
    .filter((managerId) => !excludedUserIds.has(managerId))
    .map((managerId) => ({
      organizationId: user.organizationId,
      userId: managerId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: "shift",
      relatedEntityId: input.shiftId,
      actionUrl: `/shifts/${input.shiftId}`,
    }));
}

async function validateShiftWriteAccess(
  user: CurrentUser,
  input: CreateShiftInput | UpdateShiftInput,
) {
  if (!input.title || input.title.length > 180) {
    return { ok: false, error: "Enter a shift title up to 180 characters." };
  }

  if (input.endTime <= input.startTime) {
    return { ok: false, error: "End time must be after start time." };
  }

  if (!shiftStatuses.includes(input.status)) {
    return { ok: false, error: "Choose a valid shift status." };
  }

  if (!shiftColors.includes(input.color)) {
    return { ok: false, error: "Choose a valid shift color." };
  }

  const assignableUsersPromise =
    input.assignedUserIds.length > 0
      ? db
          .select({ id: users.id })
          .from(departmentMembers)
          .innerJoin(users, eq(departmentMembers.userId, users.id))
          .where(
            and(
              eq(departmentMembers.organizationId, user.organizationId),
              eq(departmentMembers.departmentId, input.departmentId),
              inArray(departmentMembers.userId, input.assignedUserIds),
              eq(users.organizationId, user.organizationId),
              eq(users.isActive, true),
            ),
          )
      : Promise.resolve([]);

  const [context, departmentRows, assignableUsers] = await Promise.all([
    getShiftActorContext(user),
    db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.id, input.departmentId),
          eq(departments.organizationId, user.organizationId),
        ),
      )
      .limit(1),
    assignableUsersPromise,
  ]);
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);
  const hasWritePermission =
    context.permissions.has("shifts.create") ||
    context.permissions.has("shifts.update");

  if (!hasWritePermission) {
    return { ok: false, error: "You do not have permission to manage shifts." };
  }

  if (!isMainAdmin && !managedDepartmentIds.includes(input.departmentId)) {
    return {
      ok: false,
      error: "You can only manage shifts for departments assigned to you.",
    };
  }

  const [department] = departmentRows;

  if (!department) {
    return { ok: false, error: "Choose a valid department." };
  }

  if (input.assignedUserIds.length === 0) {
    return { ok: true };
  }

  const assignableIds = new Set(assignableUsers.map((row) => row.id));

  if (input.assignedUserIds.some((userId) => !assignableIds.has(userId))) {
    return {
      ok: false,
      error: "Assigned employees must be active members of the shift department.",
    };
  }

  return { ok: true };
}

async function getLeaveConflicts(
  user: CurrentUser,
  input: CreateShiftInput | UpdateShiftInput,
) {
  if (input.assignedUserIds.length === 0) {
    return [];
  }

  return db
    .select({
      employeeId: users.id,
      employeeName: users.name,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .where(
      and(
        eq(leaveRequests.organizationId, user.organizationId),
        eq(users.organizationId, user.organizationId),
        inArray(leaveRequests.userId, input.assignedUserIds),
        inArray(leaveRequests.status, ["pending", "approved"]),
        lte(leaveRequests.startDate, toIsoDate(input.endTime)),
        gte(leaveRequests.endDate, toIsoDate(input.startTime)),
      ),
    );
}

async function getShiftAssignmentConflicts(
  user: CurrentUser,
  input: CreateShiftInput | UpdateShiftInput,
) {
  if (input.assignedUserIds.length === 0) {
    return [];
  }

  const conditions = [
    eq(shiftAssignments.organizationId, user.organizationId),
    eq(shifts.organizationId, user.organizationId),
    eq(users.organizationId, user.organizationId),
    inArray(shiftAssignments.userId, input.assignedUserIds),
    ne(shifts.status, "cancelled"),
    lt(shifts.startTime, input.endTime),
    gt(shifts.endTime, input.startTime),
  ];

  if ("shiftId" in input) {
    conditions.push(ne(shifts.id, input.shiftId));
  }

  return db
    .select({
      employeeId: users.id,
      employeeName: users.name,
      shiftId: shifts.id,
      shiftTitle: shifts.title,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
    .from(shiftAssignments)
    .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
    .innerJoin(users, eq(shiftAssignments.userId, users.id))
    .where(and(...conditions));
}

async function replaceShiftAssignments(
  user: CurrentUser,
  shiftId: number,
  assignedUserIds: number[],
) {
  await db
    .delete(shiftAssignments)
    .where(
      and(
        eq(shiftAssignments.shiftId, shiftId),
        eq(shiftAssignments.organizationId, user.organizationId),
      ),
    );

  if (assignedUserIds.length === 0) {
    return;
  }

  await db.insert(shiftAssignments).values(
    assignedUserIds.map((userId) => ({
      organizationId: user.organizationId,
      shiftId,
      userId,
      assignedByUserId: user.id,
    })),
  );
}

async function getShiftAssignedUserIds(user: CurrentUser, shiftId: number) {
  const rows = await db
    .select({ userId: shiftAssignments.userId })
    .from(shiftAssignments)
    .where(
      and(
        eq(shiftAssignments.organizationId, user.organizationId),
        eq(shiftAssignments.shiftId, shiftId),
      ),
    );

  return rows.map((row) => row.userId);
}

function parseMonthStart(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}-01T00:00:00`);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function toLocalMonth(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatUniqueNames(names: string[]) {
  return Array.from(new Set(names)).join(", ");
}
