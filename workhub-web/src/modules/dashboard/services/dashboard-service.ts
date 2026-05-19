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
  const [roleNames, managedDepartments] = await Promise.all([
    getUserRoleNames(user),
    getManagedDepartments(user),
  ]);

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

async function getUserRoleNames(user: CurrentUser) {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.organizationId, user.organizationId),
        eq(roles.organizationId, user.organizationId),
      ),
    );

  return rows.map((row) => row.name);
}

async function getManagedDepartments(user: CurrentUser) {
  return db
    .select({
      id: departments.id,
      name: departments.name,
    })
    .from(departmentMembers)
    .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(
      and(
        eq(departmentMembers.userId, user.id),
        eq(departmentMembers.organizationId, user.organizationId),
        eq(departmentMembers.isManager, true),
        eq(departments.organizationId, user.organizationId),
      ),
    )
    .orderBy(asc(departments.name));
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
  const [
    departmentCount,
    activeUserCount,
    managerCount,
    pendingLeaveCount,
    upcomingShiftCount,
    activeTaskCount,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(departments)
      .where(eq(departments.organizationId, user.organizationId)),
    db
      .select({ value: count() })
      .from(users)
      .where(
        and(eq(users.organizationId, user.organizationId), eq(users.isActive, true)),
      ),
    db
      .select({ value: sql<number>`count(distinct ${userRoles.userId})` })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.organizationId, user.organizationId),
          eq(roles.organizationId, user.organizationId),
          eq(roles.name, "Department Manager"),
        ),
      ),
    db
      .select({ value: count() })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.organizationId, user.organizationId),
          eq(leaveRequests.status, "pending"),
        ),
      ),
    db
      .select({ value: count() })
      .from(shifts)
      .where(
        and(
          eq(shifts.organizationId, user.organizationId),
          gt(shifts.startTime, new Date()),
          ne(shifts.status, "cancelled"),
        ),
      ),
    db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, user.organizationId),
          inArray(tasks.status, activeTaskStatuses),
        ),
      ),
  ]);

  return {
    totalDepartments: Number(departmentCount[0]?.value ?? 0),
    totalActiveUsers: Number(activeUserCount[0]?.value ?? 0),
    totalDepartmentManagers: Number(managerCount[0]?.value ?? 0),
    totalPendingLeaveRequests: Number(pendingLeaveCount[0]?.value ?? 0),
    totalUpcomingShifts: Number(upcomingShiftCount[0]?.value ?? 0),
    totalActiveTasks: Number(activeTaskCount[0]?.value ?? 0),
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
