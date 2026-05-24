import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  ilike,
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
  userRoles,
  users,
} from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import type { CurrentUser } from "@/modules/auth/types";
import {
  createNotificationForKnownRecipient,
  createNotifications,
  getDepartmentManagerIds,
} from "@/modules/notifications/services/notification-service";

export const leaveRequestTypes = [
  "sick",
  "vacation",
  "unpaid",
  "remote",
  "personal",
  "training",
] as const;

export const leaveRequestStatuses = [
  "pending",
  "approved",
  "rejected",
] as const;

export type LeaveRequestType = (typeof leaveRequestTypes)[number];
export type LeaveRequestStatus = (typeof leaveRequestStatuses)[number];

export type LeaveListFilters = {
  status?: LeaveRequestStatus;
  type?: LeaveRequestType;
  departmentId?: number;
  employeeId?: number;
  search?: string;
  myPage?: number;
  pendingPage?: number;
  reviewedPage?: number;
};

export type LeaveListData = Awaited<ReturnType<typeof getLeaveListData>>;
export type LeaveRequestDetails = Awaited<ReturnType<typeof getLeaveRequestDetails>>;
export type CreateLeaveRequestInput = {
  departmentId: number;
  type: LeaveRequestType;
  startDate: string;
  endDate: string;
  reason: string | null;
};
export type ReviewLeaveRequestInput = {
  requestId: number;
  decision: "approved" | "rejected";
  reviewComment: string | null;
  scope: "manager" | "admin";
};

const pageSize = 8;

export async function getLeaveListData(
  user: CurrentUser,
  filters: LeaveListFilters,
) {
  const context = await getLeaveActorContext(user);
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);
  const canManageDepartmentLeave = managedDepartmentIds.length > 0;
  const canFilterByEmployee = isMainAdmin || canManageDepartmentLeave;

  const [departmentOptions, employeeOptions, myRequests, pendingRequests, reviewedRequests] =
    await Promise.all([
      isMainAdmin || managedDepartmentIds.length === 0
        ? getDepartmentOptions(user, isMainAdmin, managedDepartmentIds)
        : Promise.resolve(context.managedDepartments),
      canFilterByEmployee
        ? getEmployeeOptions(user, isMainAdmin, managedDepartmentIds)
        : Promise.resolve([]),
      getLeaveRequestsPage(user, filters, {
        scope: "mine",
        page: filters.myPage ?? 1,
        isMainAdmin,
        managedDepartmentIds,
      }),
      canFilterByEmployee
        ? getLeaveRequestsPage(user, filters, {
            scope: isMainAdmin ? "organization-pending" : "manager-pending",
            page: filters.pendingPage ?? 1,
            isMainAdmin,
            managedDepartmentIds,
          })
        : Promise.resolve(emptyPage(filters.pendingPage ?? 1)),
      canFilterByEmployee
        ? getLeaveRequestsPage(user, filters, {
            scope: isMainAdmin ? "organization-reviewed" : "manager-reviewed",
            page: filters.reviewedPage ?? 1,
            isMainAdmin,
            managedDepartmentIds,
          })
        : Promise.resolve(emptyPage(filters.reviewedPage ?? 1)),
    ]);

  return {
    filters,
    pageSize,
    isMainAdmin,
    isDepartmentManager: canManageDepartmentLeave && !isMainAdmin,
    canFilterByEmployee,
    departmentOptions,
    employeeOptions,
    myRequests,
    pendingRequests,
    reviewedRequests,
  };
}

export async function getLeaveRequestDetails(
  user: CurrentUser,
  requestId: number,
  scope: "self" | "manager" | "admin",
) {
  const conditions = [
    eq(leaveRequests.id, requestId),
    eq(leaveRequests.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    eq(users.organizationId, user.organizationId),
    or(
      eq(reviewedBy.organizationId, user.organizationId),
      sql`${reviewedBy.id} is null`,
    ),
  ];

  if (scope === "self") {
    conditions.push(eq(leaveRequests.userId, user.id));
  } else if (scope === "manager") {
    conditions.push(managerCanAccessLeaveSql(user));
  } else {
    conditions.push(mainAdminCanAccessLeaveSql(user));
  }

  const [request] = await db
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
      employeeName: users.name,
      employeeEmail: users.email,
      departmentName: departments.name,
      reviewedByName: reviewedBy.name,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
    .leftJoin(reviewedBy, eq(leaveRequests.reviewedByUserId, reviewedBy.id))
    .where(and(...conditions))
    .limit(1);

  return request ?? null;
}

const reviewedBy = alias(users, "reviewed_by");

export async function getCreateLeaveFormData(user: CurrentUser) {
  const context = await getLeaveActorContext(user);
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const memberDepartments = await getMemberDepartmentOptions(user);

  if (memberDepartments.length > 0) {
    return { departmentOptions: memberDepartments };
  }

  if (isMainAdmin) {
    return {
      departmentOptions: await getDepartmentOptions(user, true, []),
    };
  }

  return { departmentOptions: [] };
}

export async function createLeaveRequest(
  user: CurrentUser,
  input: CreateLeaveRequestInput,
) {
  if (!leaveRequestTypes.includes(input.type)) {
    return { ok: false, error: "Choose a valid leave type." };
  }

  if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate)) {
    return { ok: false, error: "Choose valid leave dates." };
  }

  if (input.endDate < input.startDate) {
    return { ok: false, error: "End date must be on or after the start date." };
  }

  if (input.reason && input.reason.length > 1000) {
    return { ok: false, error: "Keep the reason under 1000 characters." };
  }

  const [access] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.id, input.departmentId),
        eq(departments.organizationId, user.organizationId),
        or(
          existsDepartmentMembershipSql(user, input.departmentId),
          mainAdminCanAccessLeaveSql(user),
        ),
      ),
    )
    .limit(1);

  if (!access) {
    return { ok: false, error: "Choose a valid department." };
  }

  const [request] = await db
    .insert(leaveRequests)
    .values({
      organizationId: user.organizationId,
      departmentId: input.departmentId,
      userId: user.id,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      status: "pending",
    })
    .returning({ id: leaveRequests.id });

  const managerIds = (await getDepartmentManagerIds(
    user.organizationId,
    input.departmentId,
  )).filter((managerId) => managerId !== user.id);

  await createNotifications(
    managerIds.map((managerId) => ({
      organizationId: user.organizationId,
      userId: managerId,
      type: "leave_submitted",
      title: "New leave request",
      message: `${user.name} submitted a ${formatLeaveType(input.type)} request.`,
      relatedEntityType: "leave_request",
      relatedEntityId: request.id,
      actionUrl: `/manager/leave/${request.id}`,
    })),
  );

  return { ok: true, requestId: request.id };
}

export async function reviewLeaveRequest(
  user: CurrentUser,
  input: ReviewLeaveRequestInput,
) {
  if (!["approved", "rejected"].includes(input.decision)) {
    return { ok: false, error: "Choose a valid decision." };
  }

  if (input.reviewComment && input.reviewComment.length > 1000) {
    return { ok: false, error: "Keep the review comment under 1000 characters." };
  }

  const accessCondition =
    input.scope === "admin"
      ? mainAdminCanAccessLeaveSql(user)
      : managerCanAccessLeaveSql(user);

  const [request] = await db
    .update(leaveRequests)
    .set({
      status: input.decision,
      reviewedByUserId: user.id,
      reviewComment: input.reviewComment,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leaveRequests.id, input.requestId),
        eq(leaveRequests.organizationId, user.organizationId),
        eq(leaveRequests.status, "pending"),
        accessCondition,
      ),
    )
    .returning({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      type: leaveRequests.type,
    });

  if (!request) {
    return { ok: false, error: "You do not have access to review this request." };
  }

  if (request.userId !== user.id) {
    await createNotificationForKnownRecipient({
      organizationId: user.organizationId,
      userId: request.userId,
      type: input.decision === "approved" ? "leave_approved" : "leave_rejected",
      title:
        input.decision === "approved"
          ? "Leave request approved"
          : "Leave request rejected",
      message: `Your ${formatLeaveType(request.type)} request was ${input.decision}.`,
      relatedEntityType: "leave_request",
      relatedEntityId: request.id,
      actionUrl: `/leave/${request.id}`,
    });
  }

  return { ok: true };
}

async function getLeaveRequestsPage(
  user: CurrentUser,
  filters: LeaveListFilters,
  options: {
    scope:
      | "mine"
      | "manager-pending"
      | "manager-reviewed"
      | "organization-pending"
      | "organization-reviewed";
    page: number;
    isMainAdmin: boolean;
    managedDepartmentIds: number[];
  },
) {
  const where = buildLeaveWhere(user, filters, options);
  const offset = (options.page - 1) * pageSize;

  const rows = await db
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
      employeeEmail: users.email,
      departmentId: departments.id,
      departmentName: departments.name,
      reviewedByName: reviewedBy.name,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .innerJoin(departments, eq(leaveRequests.departmentId, departments.id))
    .leftJoin(reviewedBy, eq(leaveRequests.reviewedByUserId, reviewedBy.id))
    .where(where)
    .orderBy(...getLeaveOrderBy(options.scope))
    .limit(pageSize + 1)
    .offset(offset);
  const visibleRows = rows.slice(0, pageSize);
  const hasNextPage = rows.length > pageSize;

  return {
    rows: visibleRows,
    total: offset + visibleRows.length + (hasNextPage ? 1 : 0),
    page: options.page,
    totalPages: hasNextPage ? options.page + 1 : options.page,
    hasPreviousPage: options.page > 1,
    hasNextPage,
  };
}

function buildLeaveWhere(
  user: CurrentUser,
  filters: LeaveListFilters,
  options: {
    scope:
      | "mine"
      | "manager-pending"
      | "manager-reviewed"
      | "organization-pending"
      | "organization-reviewed";
    isMainAdmin: boolean;
    managedDepartmentIds: number[];
  },
) {
  const conditions = [
    eq(leaveRequests.organizationId, user.organizationId),
    eq(users.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    or(
      eq(reviewedBy.organizationId, user.organizationId),
      sql`${reviewedBy.id} is null`,
    ),
    inArray(leaveRequests.type, [...leaveRequestTypes]),
    inArray(leaveRequests.status, [...leaveRequestStatuses]),
  ];

  if (options.scope === "mine") {
    conditions.push(eq(leaveRequests.userId, user.id));
  }

  if (options.scope === "manager-pending" || options.scope === "manager-reviewed") {
    conditions.push(
      options.managedDepartmentIds.length > 0
        ? inArray(leaveRequests.departmentId, options.managedDepartmentIds)
        : sql`false`,
    );
    conditions.push(ne(leaveRequests.userId, user.id));
  }

  if (
    (options.scope === "organization-pending" ||
      options.scope === "organization-reviewed") &&
    !options.isMainAdmin
  ) {
    conditions.push(sql`false`);
  }

  if (
    options.scope === "manager-pending" ||
    options.scope === "organization-pending"
  ) {
    conditions.push(eq(leaveRequests.status, "pending"));
  }

  if (
    options.scope === "manager-reviewed" ||
    options.scope === "organization-reviewed"
  ) {
    conditions.push(inArray(leaveRequests.status, ["approved", "rejected"]));
    conditions.push(sql`${leaveRequests.reviewedAt} is not null`);
  }

  if (filters.status) {
    conditions.push(eq(leaveRequests.status, filters.status));
  }

  if (filters.type) {
    conditions.push(eq(leaveRequests.type, filters.type));
  }

  if (filters.departmentId) {
    conditions.push(eq(leaveRequests.departmentId, filters.departmentId));
  }

  if (filters.employeeId) {
    conditions.push(eq(leaveRequests.userId, filters.employeeId));
  }

  if (filters.search) {
    conditions.push(
      or(
        ilike(users.name, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`),
      )!,
    );
  }

  return and(...conditions);
}

function getLeaveOrderBy(
  scope:
    | "mine"
    | "manager-pending"
    | "manager-reviewed"
    | "organization-pending"
    | "organization-reviewed",
) {
  if (scope === "mine") {
    return [
      sql`case when ${leaveRequests.status} = 'pending' then 0 else 1 end`,
      desc(leaveRequests.createdAt),
      desc(leaveRequests.id),
    ] as const;
  }

  if (scope === "manager-reviewed" || scope === "organization-reviewed") {
    return [desc(leaveRequests.reviewedAt), desc(leaveRequests.id)] as const;
  }

  return [desc(leaveRequests.createdAt), desc(leaveRequests.id)] as const;
}

async function getLeaveActorContext(user: CurrentUser) {
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

async function getMemberDepartmentOptions(user: CurrentUser) {
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
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.organizationId, user.organizationId), eq(users.isActive, true)))
      .orderBy(asc(users.name));
  }

  if (managedDepartmentIds.length === 0) {
    return [];
  }

  return db
    .select({ id: users.id, name: users.name })
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
    .groupBy(users.id, users.name)
    .orderBy(asc(users.name));
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

function managerCanAccessLeaveSql(user: CurrentUser) {
  return sql`exists (
    select 1
    from ${departmentMembers}
    where ${departmentMembers.userId} = ${user.id}
      and ${departmentMembers.organizationId} = ${user.organizationId}
      and ${departmentMembers.departmentId} = ${leaveRequests.departmentId}
      and ${departmentMembers.isManager} = true
  )`;
}

function mainAdminCanAccessLeaveSql(user: CurrentUser) {
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

function existsDepartmentMembershipSql(user: CurrentUser, departmentId: number) {
  return sql`exists (
    select 1
    from ${departmentMembers}
    where ${departmentMembers.userId} = ${user.id}
      and ${departmentMembers.organizationId} = ${user.organizationId}
      and ${departmentMembers.departmentId} = ${departmentId}
  )`;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function formatLeaveType(value: string) {
  const labels: Record<string, string> = {
    sick: "sick leave",
    vacation: "vacation leave",
    unpaid: "unpaid leave",
    remote: "remote work day",
    personal: "personal leave",
    training: "training leave",
  };

  return labels[value] ?? value;
}
