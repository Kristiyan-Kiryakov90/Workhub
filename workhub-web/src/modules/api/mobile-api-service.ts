import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  departmentMembers,
  departments,
  leaveRequests,
  notifications,
  roles,
  shiftAssignments,
  shifts,
  tasks,
  userRoles,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/types";
import {
  createLeaveRequest,
  leaveRequestTypes,
  reviewLeaveRequest,
  type LeaveRequestType,
} from "@/modules/leave/services/leave-list-service";
import {
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/modules/notifications/services/notification-service";
import {
  taskStatuses,
  updateTaskDetails,
  type TaskStatus,
} from "@/modules/tasks/services/task-list-service";
import { badRequest, forbidden, notFound, paged, type Paging } from "./route-helpers";

type ActorContext = {
  isMainAdmin: boolean;
  managedDepartmentIds: number[];
};

export async function getMobileDashboard(
  user: CurrentUser,
  input: {
    startDate?: string | null;
    endDate?: string | null;
    departmentId?: number;
  },
) {
  const context = await getActorContext(user);
  const dateRange = normalizeDateRange(input.startDate, input.endDate);
  const departmentId = await validateDepartmentFilter(user, context, input.departmentId);

  const [activeTasks, upcomingShifts, pendingLeave, unreadNotifications, events] =
    await Promise.all([
      countVisibleTasks(user, context, ["todo", "in_progress"], departmentId),
      countVisibleShifts(user, context, departmentId),
      countVisibleLeave(user, context, "pending", departmentId),
      getUnreadNotificationCount(user),
      getCalendarEvents(user, context, {
        ...dateRange,
        departmentId,
      }),
    ]);

  return {
    summary: {
      activeTasksCount: activeTasks,
      upcomingShiftsCount: upcomingShifts,
      pendingLeaveRequestsCount: pendingLeave,
      unreadNotificationsCount: unreadNotifications,
    },
    calendarEvents: events,
  };
}

export async function listMobileTasks(user: CurrentUser, paging: Paging) {
  const context = await getActorContext(user);
  const where = buildTaskVisibilityWhere(user, context);

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        department: departments.name,
        assignedUser: users.name,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .innerJoin(departments, eq(tasks.departmentId, departments.id))
      .leftJoin(users, eq(tasks.assignedToUserId, users.id))
      .where(where)
      .orderBy(asc(tasks.dueDate), desc(tasks.createdAt), desc(tasks.id))
      .limit(paging.pageSize)
      .offset(paging.offset),
    db
      .select({ value: count() })
      .from(tasks)
      .innerJoin(departments, eq(tasks.departmentId, departments.id))
      .leftJoin(users, eq(tasks.assignedToUserId, users.id))
      .where(where),
  ]);

  return paged(rows, paging, Number(totals[0]?.value ?? 0));
}

export async function getMobileTask(user: CurrentUser, taskId: number) {
  const context = await getActorContext(user);
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      department: departments.name,
      assignedUser: users.name,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .innerJoin(departments, eq(tasks.departmentId, departments.id))
    .leftJoin(users, eq(tasks.assignedToUserId, users.id))
    .where(and(eq(tasks.id, taskId), buildTaskVisibilityWhere(user, context)))
    .limit(1);

  if (!task) {
    notFound("Task not found.");
  }

  return task;
}

export async function updateMobileTaskStatus(
  user: CurrentUser,
  taskId: number,
  status: string,
) {
  if (!taskStatuses.includes(status as TaskStatus)) {
    badRequest("Choose a valid task status.");
  }

  const result = await updateTaskDetails(user, {
    taskId,
    status: status as TaskStatus,
    notes: null,
  });

  if (!result.ok) {
    forbidden(result.error);
  }

  return { ok: true };
}

export async function listMobileShifts(user: CurrentUser, paging: Paging) {
  const context = await getActorContext(user);
  const where = buildShiftVisibilityWhere(user, context);
  const assignmentCounts = getShiftAssignmentCounts(user);

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: shifts.id,
        title: shifts.title,
        department: departments.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        location: shifts.location,
        status: shifts.status,
        assignedEmployeeCount: assignmentCounts.total,
      })
      .from(shifts)
      .innerJoin(departments, eq(shifts.departmentId, departments.id))
      .leftJoin(assignmentCounts, eq(assignmentCounts.shiftId, shifts.id))
      .where(where)
      .orderBy(asc(shifts.startTime), asc(shifts.id))
      .limit(paging.pageSize)
      .offset(paging.offset),
    db
      .select({ value: count() })
      .from(shifts)
      .innerJoin(departments, eq(shifts.departmentId, departments.id))
      .where(where),
  ]);

  return paged(
    rows.map((row) => ({
      ...row,
      assignedEmployeeCount: Number(row.assignedEmployeeCount ?? 0),
    })),
    paging,
    Number(totals[0]?.value ?? 0),
  );
}

export async function getMobileShift(user: CurrentUser, shiftId: number) {
  const context = await getActorContext(user);
  const [shift] = await db
    .select({
      id: shifts.id,
      title: shifts.title,
      department: departments.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      location: shifts.location,
      status: shifts.status,
    })
    .from(shifts)
    .innerJoin(departments, eq(shifts.departmentId, departments.id))
    .where(and(eq(shifts.id, shiftId), buildShiftVisibilityWhere(user, context)))
    .limit(1);

  if (!shift) {
    notFound("Shift not found.");
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

  return { ...shift, assignedEmployees };
}

export async function listMobileLeave(user: CurrentUser, paging: Paging) {
  const context = await getActorContext(user);
  const where = buildLeaveVisibilityWhere(user, context);

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: leaveRequests.id,
        type: leaveRequests.type,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        reviewComment: leaveRequests.reviewComment,
        reviewedAt: leaveRequests.reviewedAt,
        createdAt: leaveRequests.createdAt,
        employeeId: users.id,
        employeeName: users.name,
        department: departments.name,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
      .where(where)
      .orderBy(desc(leaveRequests.createdAt), desc(leaveRequests.id))
      .limit(paging.pageSize)
      .offset(paging.offset),
    db
      .select({ value: count() })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
      .where(where),
  ]);

  return paged(rows, paging, Number(totals[0]?.value ?? 0));
}

export async function createMobileLeave(
  user: CurrentUser,
  input: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string | null;
    departmentId?: number;
  },
) {
  const type = input.leaveType;

  if (!leaveRequestTypes.includes(type as LeaveRequestType)) {
    badRequest("Choose a valid leave type.");
  }

  const departmentId = input.departmentId ?? (await getDefaultLeaveDepartmentId(user));

  if (!departmentId) {
    badRequest("A department is required to create a leave request.");
  }

  const result = await createLeaveRequest(user, {
    departmentId,
    type: type as LeaveRequestType,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason ?? null,
  });

  if (!result.ok) {
    badRequest(result.error);
  }

  return { id: result.requestId, status: "pending" };
}

export async function reviewMobileLeave(
  user: CurrentUser,
  requestId: number,
  decision: "approved" | "rejected",
  reviewComment: string | null,
) {
  const context = await getActorContext(user);

  if (!context.isMainAdmin && context.managedDepartmentIds.length === 0) {
    forbidden("Employees cannot review leave requests.");
  }

  const result = await reviewLeaveRequest(user, {
    requestId,
    decision,
    reviewComment,
    scope: context.isMainAdmin ? "admin" : "manager",
  });

  if (!result.ok) {
    forbidden(result.error);
  }

  return { ok: true };
}

export async function listMobileNotifications(
  user: CurrentUser,
  paging: Paging,
) {
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        relatedEntityType: notifications.relatedEntityType,
        relatedEntityId: notifications.relatedEntityId,
        actionUrl: notifications.actionUrl,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, user.organizationId),
          eq(notifications.userId, user.id),
        ),
      )
      .orderBy(asc(notifications.isRead), desc(notifications.createdAt), desc(notifications.id))
      .limit(paging.pageSize)
      .offset(paging.offset),
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, user.organizationId),
          eq(notifications.userId, user.id),
        ),
      ),
  ]);

  return paged(rows, paging, Number(totals[0]?.value ?? 0));
}

export async function readMobileNotification(user: CurrentUser, notificationId: number) {
  const notification = await markNotificationAsRead(user, notificationId);

  if (!notification) {
    notFound("Notification not found.");
  }

  return { ok: true };
}

export async function readAllMobileNotifications(user: CurrentUser) {
  await markAllNotificationsAsRead(user);

  return { ok: true };
}

async function getActorContext(user: CurrentUser): Promise<ActorContext> {
  const rows = await db
    .select({
      roleName: roles.name,
      managedDepartmentId: departmentMembers.departmentId,
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
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.organizationId, user.organizationId),
        eq(roles.organizationId, user.organizationId),
      ),
    );

  return {
    isMainAdmin: rows.some((row) => row.roleName === "Main Admin"),
    managedDepartmentIds: Array.from(
      new Set(
        rows.flatMap((row) =>
          row.managedDepartmentId ? [row.managedDepartmentId] : [],
        ),
      ),
    ),
  };
}

function buildTaskVisibilityWhere(user: CurrentUser, context: ActorContext) {
  const visibility = context.isMainAdmin
    ? eq(tasks.organizationId, user.organizationId)
    : or(
        eq(tasks.assignedToUserId, user.id),
        context.managedDepartmentIds.length > 0
          ? inArray(tasks.departmentId, context.managedDepartmentIds)
          : sql`false`,
      )!;

  return and(
    eq(tasks.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    or(eq(users.organizationId, user.organizationId), sql`${users.id} is null`),
    visibility,
  );
}

function buildShiftVisibilityWhere(user: CurrentUser, context: ActorContext) {
  const visibility = context.isMainAdmin
    ? eq(shifts.organizationId, user.organizationId)
    : or(
        userAssignedToShiftSql(user),
        context.managedDepartmentIds.length > 0
          ? inArray(shifts.departmentId, context.managedDepartmentIds)
          : sql`false`,
      )!;

  return and(
    eq(shifts.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    visibility,
  );
}

function buildLeaveVisibilityWhere(user: CurrentUser, context: ActorContext) {
  const visibility = context.isMainAdmin
    ? eq(leaveRequests.organizationId, user.organizationId)
    : or(
        eq(leaveRequests.userId, user.id),
        context.managedDepartmentIds.length > 0
          ? inArray(leaveRequests.departmentId, context.managedDepartmentIds)
          : sql`false`,
      )!;

  return and(
    eq(leaveRequests.organizationId, user.organizationId),
    eq(users.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    visibility,
  );
}

async function countVisibleTasks(
  user: CurrentUser,
  context: ActorContext,
  statuses: TaskStatus[],
  departmentId?: number,
) {
  const conditions = [buildTaskVisibilityWhere(user, context), inArray(tasks.status, statuses)];

  if (departmentId) {
    conditions.push(eq(tasks.departmentId, departmentId));
  }

  const [row] = await db
    .select({ value: count() })
    .from(tasks)
    .innerJoin(departments, eq(tasks.departmentId, departments.id))
    .leftJoin(users, eq(tasks.assignedToUserId, users.id))
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

async function countVisibleShifts(
  user: CurrentUser,
  context: ActorContext,
  departmentId?: number,
) {
  const conditions = [
    buildShiftVisibilityWhere(user, context),
    eq(shifts.status, "scheduled"),
    gte(shifts.startTime, new Date()),
  ];

  if (departmentId) {
    conditions.push(eq(shifts.departmentId, departmentId));
  }

  const [row] = await db
    .select({ value: count() })
    .from(shifts)
    .innerJoin(departments, eq(shifts.departmentId, departments.id))
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

async function countVisibleLeave(
  user: CurrentUser,
  context: ActorContext,
  status: "pending",
  departmentId?: number,
) {
  const conditions = [buildLeaveVisibilityWhere(user, context), eq(leaveRequests.status, status)];

  if (departmentId) {
    conditions.push(eq(leaveRequests.departmentId, departmentId));
  }

  const [row] = await db
    .select({ value: count() })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

async function getCalendarEvents(
  user: CurrentUser,
  context: ActorContext,
  input: { startDate: string; endDate: string; departmentId?: number },
) {
  const taskConditions = [
    buildTaskVisibilityWhere(user, context),
    sql`${tasks.dueDate} is not null`,
    gte(tasks.dueDate, input.startDate),
    lte(tasks.dueDate, input.endDate),
  ];
  const shiftConditions = [
    buildShiftVisibilityWhere(user, context),
    lte(sql<string>`date(${shifts.startTime})`, input.endDate),
    gte(sql<string>`date(${shifts.endTime})`, input.startDate),
  ];
  const leaveConditions = [
    buildLeaveVisibilityWhere(user, context),
    lte(leaveRequests.startDate, input.endDate),
    gte(leaveRequests.endDate, input.startDate),
  ];

  if (input.departmentId) {
    taskConditions.push(eq(tasks.departmentId, input.departmentId));
    shiftConditions.push(eq(shifts.departmentId, input.departmentId));
    leaveConditions.push(eq(leaveRequests.departmentId, input.departmentId));
  }

  const [taskRows, shiftRows, leaveRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        start: tasks.dueDate,
        end: tasks.dueDate,
        departmentName: departments.name,
      })
      .from(tasks)
      .innerJoin(departments, eq(tasks.departmentId, departments.id))
      .leftJoin(users, eq(tasks.assignedToUserId, users.id))
      .where(and(...taskConditions)),
    db
      .select({
        id: shifts.id,
        title: shifts.title,
        start: shifts.startTime,
        end: shifts.endTime,
        departmentName: departments.name,
      })
      .from(shifts)
      .innerJoin(departments, eq(shifts.departmentId, departments.id))
      .where(and(...shiftConditions)),
    db
      .select({
        id: leaveRequests.id,
        title: sql<string>`${users.name} || ' leave'`,
        start: leaveRequests.startDate,
        end: leaveRequests.endDate,
        departmentName: departments.name,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
      .where(and(...leaveConditions)),
  ]);

  return [
    ...taskRows.map((event) => ({
      ...event,
      id: `task-${event.id}`,
      type: "task_due",
      actionUrl: `/tasks/${event.id}`,
    })),
    ...shiftRows.map((event) => ({
      ...event,
      id: `shift-${event.id}`,
      type: "shift",
      actionUrl: `/shifts/${event.id}`,
    })),
    ...leaveRows.map((event) => ({
      ...event,
      id: `leave-${event.id}`,
      type: "leave",
      actionUrl: `/leave/${event.id}`,
    })),
  ].sort((first, second) => String(first.start).localeCompare(String(second.start)));
}

async function validateDepartmentFilter(
  user: CurrentUser,
  context: ActorContext,
  departmentId?: number,
) {
  if (!departmentId) {
    return undefined;
  }

  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.id, departmentId),
        eq(departments.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!department) {
    badRequest("Choose a valid department.");
  }

  if (
    !context.isMainAdmin &&
    !context.managedDepartmentIds.includes(departmentId)
  ) {
    forbidden("You do not have access to this department.");
  }

  return departmentId;
}

async function getDefaultLeaveDepartmentId(user: CurrentUser) {
  const [membership] = await db
    .select({ departmentId: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.userId, user.id),
        eq(departmentMembers.organizationId, user.organizationId),
      ),
    )
    .orderBy(desc(departmentMembers.isManager), asc(departmentMembers.departmentId))
    .limit(1);

  return membership?.departmentId;
}

function normalizeDateRange(startDate?: string | null, endDate?: string | null) {
  const today = new Date();
  const start = startDate && isIsoDate(startDate) ? startDate : toIsoDate(today);
  const defaultEnd = new Date(`${start}T00:00:00`);
  defaultEnd.setDate(defaultEnd.getDate() + 30);
  const end = endDate && isIsoDate(endDate) ? endDate : toIsoDate(defaultEnd);

  if (end < start) {
    badRequest("endDate must be on or after startDate.");
  }

  return { startDate: start, endDate: end };
}

function getShiftAssignmentCounts(user: CurrentUser) {
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

function userAssignedToShiftSql(user: CurrentUser) {
  return sql`exists (
    select 1
    from ${shiftAssignments}
    where ${shiftAssignments.shiftId} = ${shifts.id}
      and ${shiftAssignments.organizationId} = ${user.organizationId}
      and ${shiftAssignments.userId} = ${user.id}
  )`;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
