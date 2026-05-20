import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  max,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  departmentMembers,
  departments,
  roles,
  taskChecklistItems,
  tasks,
  userRoles,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/types";
import { getCurrentUserPermissions } from "@/modules/auth/services/authorization-service";

export const taskStatuses = [
  "todo",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

export type TaskListFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  departmentId?: number;
  assignedToUserId?: number;
  search?: string;
  activePage?: number;
  archivePage?: number;
};

export type TaskListData = Awaited<ReturnType<typeof getTaskListData>>;
export type TaskDetails = Awaited<ReturnType<typeof getTaskDetails>>;
export type UpdateTaskDetailsInput = {
  taskId: number;
  status: TaskStatus;
  notes: string | null;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  departmentId?: number;
  assignedToUserId?: number | null;
  dueDate?: string | null;
  checklistItems?: TaskChecklistInput[];
};
export type TaskChecklistInput = {
  title: string;
  isCompleted: boolean;
};
export type CreateTaskInput = {
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  departmentId: number;
  assignedToUserId: number | null;
  dueDate: string | null;
  checklistItems: TaskChecklistInput[];
};

const pageSize = 8;
const activeStatuses: TaskStatus[] = ["todo", "in_progress"];
const archivedStatuses: TaskStatus[] = ["completed", "cancelled"];

export async function getTaskListData(
  user: CurrentUser,
  filters: TaskListFilters,
) {
  const [roleNames, managedDepartments, permissions] = await Promise.all([
    getUserRoleNames(user),
    getManagedDepartments(user),
    getCurrentUserPermissions(user),
  ]);

  const isMainAdmin = roleNames.includes("Main Admin");
  const managedDepartmentIds = managedDepartments.map((department) => department.id);
  const canFilterByAssignee = isMainAdmin || managedDepartmentIds.length > 0;
  const canCreateTask = permissions.has("tasks.create");

  const [departmentOptions, assigneeOptions, activeTasks, archivedTasks] =
    await Promise.all([
      getDepartmentOptions(user, isMainAdmin, managedDepartmentIds),
      canFilterByAssignee
        ? getAssigneeOptions(user, isMainAdmin, managedDepartmentIds)
        : Promise.resolve([]),
      getTasksPage(user, filters, {
        isMainAdmin,
        managedDepartmentIds,
        statuses: activeStatuses,
        page: filters.activePage ?? 1,
        section: "active",
      }),
      getTasksPage(user, filters, {
        isMainAdmin,
        managedDepartmentIds,
        statuses: archivedStatuses,
        page: filters.archivePage ?? 1,
        section: "archive",
      }),
    ]);

  return {
    filters,
    pageSize,
    isMainAdmin,
    isDepartmentManager: managedDepartmentIds.length > 0,
    canCreateTask,
    canFilterByAssignee,
    departmentOptions,
    assigneeOptions,
    activeTasks,
    archivedTasks,
  };
}

export async function getTaskDetails(user: CurrentUser, taskId: number) {
  const [roleNames, managedDepartments] = await Promise.all([
    getUserRoleNames(user),
    getManagedDepartments(user),
  ]);
  const isMainAdmin = roleNames.includes("Main Admin");
  const managedDepartmentIds = managedDepartments.map((department) => department.id);

  const conditions = [
    eq(tasks.id, taskId),
    eq(tasks.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    or(eq(users.organizationId, user.organizationId), sql`${users.id} is null`),
  ];

  if (!isMainAdmin) {
    const visibleConditions = [eq(tasks.assignedToUserId, user.id)];

    if (managedDepartmentIds.length > 0) {
      visibleConditions.push(inArray(tasks.departmentId, managedDepartmentIds));
    }

    conditions.push(or(...visibleConditions)!);
  }

  const [task] = await db
    .select({
      id: tasks.id,
      departmentId: tasks.departmentId,
      title: tasks.title,
      description: tasks.description,
      notes: tasks.notes,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assignedToUserId: tasks.assignedToUserId,
      departmentName: departments.name,
      assignedEmployeeName: users.name,
    })
    .from(tasks)
    .innerJoin(departments, eq(tasks.departmentId, departments.id))
    .leftJoin(users, eq(tasks.assignedToUserId, users.id))
    .where(and(...conditions))
    .limit(1);

  if (!task) {
    return null;
  }

  const checklistItems = await getTaskChecklistItems(user, task.id);
  const permissions = await getCurrentUserPermissions(user);
  const canManageTask =
    permissions.has("tasks.update") &&
    (isMainAdmin || managedDepartmentIds.includes(task.departmentId));

  const [departmentOptions, assigneeOptions] = canManageTask
    ? await Promise.all([
        getDepartmentOptions(user, isMainAdmin, managedDepartmentIds),
        getAssigneeOptions(user, isMainAdmin, managedDepartmentIds),
      ])
    : [[], []];

  return {
    ...task,
    checklistItems,
    canManageTask,
    departmentOptions,
    assigneeOptions,
  };
}

export async function updateTaskDetails(
  user: CurrentUser,
  input: UpdateTaskDetailsInput,
) {
  const access = await getTaskEditAccess(user, input.taskId);

  if (!access.canEdit) {
    return { ok: false, error: "You do not have access to update this task." };
  }

  const updateValues: Partial<typeof tasks.$inferInsert> = {
    status: input.status,
    notes: input.notes,
    updatedAt: new Date(),
  };

  if (access.canManage) {
    if (!input.title || input.title.length > 220) {
      return { ok: false, error: "Enter a task title up to 220 characters." };
    }

    if (!input.priority) {
      return { ok: false, error: "Choose a valid priority." };
    }

    if (!input.departmentId) {
      return { ok: false, error: "Choose a valid department." };
    }

    const canUseDepartment = await userCanUseTaskDepartment(
      user,
      input.departmentId,
      access.isMainAdmin,
    );

    if (!canUseDepartment) {
      return { ok: false, error: "You cannot move this task to that department." };
    }

    if (input.assignedToUserId) {
      const assigneeIsValid = await userExistsInOrganization(
        user,
        input.assignedToUserId,
      );

      if (!assigneeIsValid) {
        return { ok: false, error: "Choose a valid assigned employee." };
      }
    }

    updateValues.title = input.title;
    updateValues.description = input.description ?? null;
    updateValues.priority = input.priority;
    updateValues.departmentId = input.departmentId;
    updateValues.assignedToUserId = input.assignedToUserId ?? null;
    updateValues.dueDate = input.dueDate ?? null;
  }

  await db
    .update(tasks)
    .set(updateValues)
    .where(and(eq(tasks.id, input.taskId), eq(tasks.organizationId, user.organizationId)));

  if (access.canManage && input.checklistItems) {
    await replaceTaskChecklistItems(user, input.taskId, input.checklistItems);
  }

  return { ok: true };
}

export async function toggleTaskChecklistItem(
  user: CurrentUser,
  input: { taskId: number; itemId: number; isCompleted: boolean },
) {
  const [item] = await db
    .select({ id: taskChecklistItems.id, taskId: taskChecklistItems.taskId })
    .from(taskChecklistItems)
    .where(
      and(
        eq(taskChecklistItems.id, input.itemId),
        eq(taskChecklistItems.taskId, input.taskId),
        eq(taskChecklistItems.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!item) {
    return { ok: false };
  }

  const access = await getTaskEditAccess(user, input.taskId);

  if (!access.canEdit) {
    return { ok: false };
  }

  await db
    .update(taskChecklistItems)
    .set({ isCompleted: input.isCompleted, updatedAt: new Date() })
    .where(
      and(
        eq(taskChecklistItems.id, input.itemId),
        eq(taskChecklistItems.organizationId, user.organizationId),
      ),
    );

  await db
    .update(tasks)
    .set({ updatedAt: new Date() })
    .where(and(eq(tasks.id, input.taskId), eq(tasks.organizationId, user.organizationId)));

  return { ok: true };
}

export async function addTaskChecklistItem(
  user: CurrentUser,
  input: { taskId: number; title: string },
) {
  const access = await getTaskEditAccess(user, input.taskId);

  if (!access.canManage) {
    return { ok: false };
  }

  const [positionRow] = await db
    .select({ value: max(taskChecklistItems.position) })
    .from(taskChecklistItems)
    .where(
      and(
        eq(taskChecklistItems.taskId, input.taskId),
        eq(taskChecklistItems.organizationId, user.organizationId),
      ),
    );

  await db.insert(taskChecklistItems).values({
    organizationId: user.organizationId,
    taskId: input.taskId,
    title: input.title,
    isCompleted: false,
    position: Number(positionRow?.value ?? -1) + 1,
  });

  await db
    .update(tasks)
    .set({ updatedAt: new Date() })
    .where(and(eq(tasks.id, input.taskId), eq(tasks.organizationId, user.organizationId)));

  return { ok: true };
}

export async function deleteTaskChecklistItem(
  user: CurrentUser,
  input: { taskId: number; itemId: number },
) {
  const access = await getTaskEditAccess(user, input.taskId);

  if (!access.canManage) {
    return { ok: false };
  }

  await db
    .delete(taskChecklistItems)
    .where(
      and(
        eq(taskChecklistItems.id, input.itemId),
        eq(taskChecklistItems.taskId, input.taskId),
        eq(taskChecklistItems.organizationId, user.organizationId),
      ),
    );

  await db
    .update(tasks)
    .set({ updatedAt: new Date() })
    .where(and(eq(tasks.id, input.taskId), eq(tasks.organizationId, user.organizationId)));

  return { ok: true };
}

export async function getCreateTaskFormData(user: CurrentUser) {
  const [roleNames, managedDepartments, permissions] = await Promise.all([
    getUserRoleNames(user),
    getManagedDepartments(user),
    getCurrentUserPermissions(user),
  ]);

  const isMainAdmin = roleNames.includes("Main Admin");
  const managedDepartmentIds = managedDepartments.map((department) => department.id);
  const canCreateTask = permissions.has("tasks.create");

  if (!canCreateTask) {
    return {
      canCreateTask: false,
      departmentOptions: [],
      assigneeOptions: [],
    };
  }

  const [departmentOptions, assigneeOptions] = await Promise.all([
    getDepartmentOptions(user, isMainAdmin, managedDepartmentIds),
    getAssigneeOptions(user, isMainAdmin, managedDepartmentIds),
  ]);

  return {
    canCreateTask,
    departmentOptions,
    assigneeOptions,
  };
}

export async function createTask(user: CurrentUser, input: CreateTaskInput) {
  const [roleNames, permissions] = await Promise.all([
    getUserRoleNames(user),
    getCurrentUserPermissions(user),
  ]);

  if (!permissions.has("tasks.create")) {
    return { ok: false, error: "You do not have permission to create tasks." };
  }

  const isMainAdmin = roleNames.includes("Main Admin");

  if (!isMainAdmin) {
    const [membership] = await db
      .select({ id: departmentMembers.id })
      .from(departmentMembers)
      .where(
        and(
          eq(departmentMembers.organizationId, user.organizationId),
          eq(departmentMembers.departmentId, input.departmentId),
          eq(departmentMembers.userId, user.id),
          eq(departmentMembers.isManager, true),
        ),
      )
      .limit(1);

    if (!membership) {
      return { ok: false, error: "You can only create tasks for departments you manage." };
    }
  }

  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.id, input.departmentId),
        eq(departments.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!department) {
    return { ok: false, error: "Choose a valid department." };
  }

  if (input.assignedToUserId) {
    const [assignee] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, input.assignedToUserId),
          eq(users.organizationId, user.organizationId),
          eq(users.isActive, true),
        ),
      )
      .limit(1);

    if (!assignee) {
      return { ok: false, error: "Choose a valid assigned employee." };
    }
  }

  const [task] = await db
    .insert(tasks)
    .values({
      organizationId: user.organizationId,
      departmentId: input.departmentId,
      title: input.title,
      description: input.description,
      notes: input.notes,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      createdByUserId: user.id,
      assignedToUserId: input.assignedToUserId,
    })
    .returning({ id: tasks.id });

  if (input.checklistItems.length > 0) {
    await insertTaskChecklistItems(user, task.id, input.checklistItems);
  }

  return { ok: true, taskId: task.id };
}

async function getTaskEditAccess(user: CurrentUser, taskId: number) {
  const [roleNames, managedDepartments, permissions] = await Promise.all([
    getUserRoleNames(user),
    getManagedDepartments(user),
    getCurrentUserPermissions(user),
  ]);
  const isMainAdmin = roleNames.includes("Main Admin");
  const managedDepartmentIds = managedDepartments.map((department) => department.id);

  const [task] = await db
    .select({
      id: tasks.id,
      departmentId: tasks.departmentId,
      assignedToUserId: tasks.assignedToUserId,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, user.organizationId)))
    .limit(1);

  if (!task) {
    return { canEdit: false, canManage: false, isMainAdmin };
  }

  const canManage =
    permissions.has("tasks.update") &&
    (isMainAdmin || managedDepartmentIds.includes(task.departmentId));
  const canEdit = canManage || task.assignedToUserId === user.id;

  return { canEdit, canManage, isMainAdmin };
}

async function userCanUseTaskDepartment(
  user: CurrentUser,
  departmentId: number,
  isMainAdmin: boolean,
) {
  if (isMainAdmin) {
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

    return Boolean(department);
  }

  const [membership] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.organizationId, user.organizationId),
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.userId, user.id),
        eq(departmentMembers.isManager, true),
      ),
    )
    .limit(1);

  return Boolean(membership);
}

async function userExistsInOrganization(user: CurrentUser, userId: number) {
  const [assignee] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.organizationId, user.organizationId),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  return Boolean(assignee);
}

async function getTasksPage(
  user: CurrentUser,
  filters: TaskListFilters,
  options: {
    isMainAdmin: boolean;
    managedDepartmentIds: number[];
    statuses: TaskStatus[];
    page: number;
    section: "active" | "archive";
  },
) {
  const where = buildTaskWhere(user, filters, options);
  const offset = (options.page - 1) * pageSize;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        notes: tasks.notes,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        departmentId: departments.id,
        departmentName: departments.name,
        assignedToUserId: users.id,
        assignedEmployeeName: users.name,
      })
      .from(tasks)
      .innerJoin(departments, eq(tasks.departmentId, departments.id))
      .leftJoin(users, eq(tasks.assignedToUserId, users.id))
      .where(where)
      .orderBy(...getTaskOrderBy(options.section))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(tasks).innerJoin(
      departments,
      eq(tasks.departmentId, departments.id),
    ).leftJoin(users, eq(tasks.assignedToUserId, users.id)).where(where),
  ]);

  const total = Number(totals[0]?.value ?? 0);
  const checklistCounts = await getChecklistCounts(
    user,
    rows.map((row) => row.id),
  );

  return {
    rows: rows.map((row) => ({
      ...row,
      checklist: checklistCounts.get(row.id) ?? { total: 0, completed: 0 },
    })),
    total,
    page: options.page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasPreviousPage: options.page > 1,
    hasNextPage: offset + rows.length < total,
  };
}

async function getTaskChecklistItems(user: CurrentUser, taskId: number) {
  return db
    .select({
      id: taskChecklistItems.id,
      title: taskChecklistItems.title,
      isCompleted: taskChecklistItems.isCompleted,
      position: taskChecklistItems.position,
    })
    .from(taskChecklistItems)
    .where(
      and(
        eq(taskChecklistItems.organizationId, user.organizationId),
        eq(taskChecklistItems.taskId, taskId),
      ),
    )
    .orderBy(asc(taskChecklistItems.position), asc(taskChecklistItems.id));
}

async function getChecklistCounts(user: CurrentUser, taskIds: number[]) {
  if (taskIds.length === 0) {
    return new Map<number, { total: number; completed: number }>();
  }

  const rows = await db
    .select({
      taskId: taskChecklistItems.taskId,
      total: count(taskChecklistItems.id),
      completed: sql<number>`sum(case when ${taskChecklistItems.isCompleted} then 1 else 0 end)`,
    })
    .from(taskChecklistItems)
    .where(
      and(
        eq(taskChecklistItems.organizationId, user.organizationId),
        inArray(taskChecklistItems.taskId, taskIds),
      ),
    )
    .groupBy(taskChecklistItems.taskId);

  return new Map(
    rows.map((row) => [
      row.taskId,
      { total: Number(row.total), completed: Number(row.completed ?? 0) },
    ]),
  );
}

async function replaceTaskChecklistItems(
  user: CurrentUser,
  taskId: number,
  items: TaskChecklistInput[],
) {
  await db
    .delete(taskChecklistItems)
    .where(
      and(
        eq(taskChecklistItems.organizationId, user.organizationId),
        eq(taskChecklistItems.taskId, taskId),
      ),
    );

  await insertTaskChecklistItems(user, taskId, items);
}

async function insertTaskChecklistItems(
  user: CurrentUser,
  taskId: number,
  items: TaskChecklistInput[],
) {
  const values = items
    .map((item, index) => ({
      organizationId: user.organizationId,
      taskId,
      title: item.title,
      isCompleted: item.isCompleted,
      position: index,
    }))
    .filter((item) => item.title);

  if (values.length === 0) {
    return;
  }

  await db.insert(taskChecklistItems).values(values);
}

function buildTaskWhere(
  user: CurrentUser,
  filters: TaskListFilters,
  options: {
    isMainAdmin: boolean;
    managedDepartmentIds: number[];
    statuses: TaskStatus[];
  },
) {
  const conditions = [
    eq(tasks.organizationId, user.organizationId),
    eq(departments.organizationId, user.organizationId),
    or(eq(users.organizationId, user.organizationId), sql`${users.id} is null`),
  ];

  const visibleConditions = [];

  if (options.isMainAdmin) {
    visibleConditions.push(eq(tasks.organizationId, user.organizationId));
  } else {
    visibleConditions.push(eq(tasks.assignedToUserId, user.id));

    if (options.managedDepartmentIds.length > 0) {
      visibleConditions.push(inArray(tasks.departmentId, options.managedDepartmentIds));
    }
  }

  conditions.push(or(...visibleConditions)!);

  const requestedStatuses = filters.status ? [filters.status] : options.statuses;
  const allowedStatuses = requestedStatuses.filter((status) =>
    options.statuses.includes(status),
  );

  conditions.push(
    allowedStatuses.length > 0
      ? inArray(tasks.status, allowedStatuses)
      : sql`false`,
  );

  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority));
  }

  if (filters.departmentId) {
    conditions.push(eq(tasks.departmentId, filters.departmentId));
  }

  if (filters.assignedToUserId) {
    conditions.push(eq(tasks.assignedToUserId, filters.assignedToUserId));
  }

  if (filters.search) {
    conditions.push(ilike(tasks.title, `%${filters.search}%`));
  }

  return and(...conditions);
}

function getTaskOrderBy(section: "active" | "archive") {
  if (section === "archive") {
    return [desc(tasks.updatedAt), desc(tasks.id)] as const;
  }

  return [
    sql`case when ${tasks.dueDate} is not null and ${tasks.dueDate} < current_date then 0 else 1 end`,
    asc(tasks.dueDate),
    desc(tasks.createdAt),
    desc(tasks.id),
  ] as const;
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

async function getAssigneeOptions(
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
    .select({
      id: users.id,
      name: users.name,
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
    .groupBy(users.id, users.name)
    .orderBy(asc(users.name));
}
