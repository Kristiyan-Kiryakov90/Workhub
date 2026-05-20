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
  permissions,
  rolePermissions,
  roles,
  taskChecklistItems,
  tasks,
  userRoles,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/types";

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
  const context = await getTaskActorContext(user);

  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);
  const canFilterByAssignee = isMainAdmin || managedDepartmentIds.length > 0;
  const canCreateTask = context.permissions.has("tasks.create");

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
  const context = await getTaskActorContext(user);
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);

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
  const canManageTask =
    context.permissions.has("tasks.update") &&
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
  if (input.title !== undefined) {
    if (!input.title || input.title.length > 220) {
      return { ok: false, error: "Enter a task title up to 220 characters." };
    }

    if (!input.priority) {
      return { ok: false, error: "Choose a valid priority." };
    }

    if (!input.departmentId) {
      return { ok: false, error: "Choose a valid department." };
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        priority: input.priority,
        departmentId: input.departmentId,
        assignedToUserId: input.assignedToUserId ?? null,
        dueDate: input.dueDate ?? null,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasks.id, input.taskId),
          eq(tasks.organizationId, user.organizationId),
          canManageTaskSql(user),
          canUseDepartmentSql(user, input.departmentId),
          input.assignedToUserId
            ? assigneeIsActiveSql(user, input.assignedToUserId)
            : sql`true`,
        ),
      )
      .returning({ id: tasks.id });

    if (!updatedTask) {
      return { ok: false, error: "You do not have access to update this task." };
    }

    if (input.checklistItems) {
      await replaceTaskChecklistItems(user, input.taskId, input.checklistItems);
    }

    return { ok: true };
  }

  const [updatedTask] = await db
    .update(tasks)
    .set({
      status: input.status,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.id, input.taskId),
        eq(tasks.organizationId, user.organizationId),
        canEditTaskSql(user),
      ),
    )
    .returning({ id: tasks.id });

  if (!updatedTask) {
    return { ok: false, error: "You do not have access to update this task." };
  }

  return { ok: true };
}

export async function toggleTaskChecklistItem(
  user: CurrentUser,
  input: { taskId: number; itemId: number; isCompleted: boolean },
) {
  const [itemRows, access] = await Promise.all([
    db
      .select({ id: taskChecklistItems.id, taskId: taskChecklistItems.taskId })
      .from(taskChecklistItems)
      .where(
        and(
          eq(taskChecklistItems.id, input.itemId),
          eq(taskChecklistItems.taskId, input.taskId),
          eq(taskChecklistItems.organizationId, user.organizationId),
        ),
      )
      .limit(1),
    getTaskEditAccess(user, input.taskId),
  ]);
  const [item] = itemRows;

  if (!item) {
    return { ok: false };
  }

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

  const position = Number(positionRow?.value ?? -1) + 1;
  const [item] = await db
    .insert(taskChecklistItems)
    .values({
      organizationId: user.organizationId,
      taskId: input.taskId,
      title: input.title,
      isCompleted: false,
      position,
    })
    .returning({
      id: taskChecklistItems.id,
      title: taskChecklistItems.title,
      isCompleted: taskChecklistItems.isCompleted,
      position: taskChecklistItems.position,
    });

  return { ok: true, item };
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

  return { ok: true };
}

export async function getCreateTaskFormData(user: CurrentUser) {
  const context = await getTaskActorContext(user);

  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);
  const canCreateTask = context.permissions.has("tasks.create");

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
  const context = await getTaskActorContext(user);

  if (!context.permissions.has("tasks.create")) {
    return { ok: false, error: "You do not have permission to create tasks." };
  }

  const isMainAdmin = context.roleNames.includes("Main Admin");

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
  const [context, taskRows] = await Promise.all([
    getTaskActorContext(user),
    db
      .select({
        id: tasks.id,
        departmentId: tasks.departmentId,
        assignedToUserId: tasks.assignedToUserId,
      })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, user.organizationId)))
      .limit(1),
  ]);
  const isMainAdmin = context.roleNames.includes("Main Admin");
  const managedDepartmentIds = context.managedDepartments.map((department) => department.id);
  const [task] = taskRows;

  if (!task) {
    return { canEdit: false, canManage: false, isMainAdmin };
  }

  const canManage =
    context.permissions.has("tasks.update") &&
    (isMainAdmin || managedDepartmentIds.includes(task.departmentId));
  const canEdit = canManage || task.assignedToUserId === user.id;

  return { canEdit, canManage, isMainAdmin };
}

function canManageTaskSql(user: CurrentUser) {
  return sql`exists (
    select 1
    from ${userRoles}
    inner join ${roles} on ${userRoles.roleId} = ${roles.id}
    left join ${rolePermissions} on ${roles.id} = ${rolePermissions.roleId}
    left join ${permissions} on ${rolePermissions.permissionId} = ${permissions.id}
    where ${userRoles.userId} = ${user.id}
      and ${userRoles.organizationId} = ${user.organizationId}
      and ${roles.organizationId} = ${user.organizationId}
      and ${permissions.key} = 'tasks.update'
      and (
        ${roles.name} = 'Main Admin'
        or exists (
          select 1
          from ${departmentMembers}
          where ${departmentMembers.userId} = ${user.id}
            and ${departmentMembers.organizationId} = ${user.organizationId}
            and ${departmentMembers.departmentId} = ${tasks.departmentId}
            and ${departmentMembers.isManager} = true
        )
      )
  )`;
}

function canEditTaskSql(user: CurrentUser) {
  return sql`(
    ${tasks.assignedToUserId} = ${user.id}
    or ${canManageTaskSql(user)}
  )`;
}

function canUseDepartmentSql(user: CurrentUser, departmentId: number) {
  return sql`exists (
    select 1
    from ${departments}
    where ${departments.id} = ${departmentId}
      and ${departments.organizationId} = ${user.organizationId}
      and (
        exists (
          select 1
          from ${userRoles}
          inner join ${roles} on ${userRoles.roleId} = ${roles.id}
          where ${userRoles.userId} = ${user.id}
            and ${userRoles.organizationId} = ${user.organizationId}
            and ${roles.organizationId} = ${user.organizationId}
            and ${roles.name} = 'Main Admin'
        )
        or exists (
          select 1
          from ${departmentMembers}
          where ${departmentMembers.userId} = ${user.id}
            and ${departmentMembers.organizationId} = ${user.organizationId}
            and ${departmentMembers.departmentId} = ${departmentId}
            and ${departmentMembers.isManager} = true
        )
      )
  )`;
}

function assigneeIsActiveSql(user: CurrentUser, userId: number) {
  return sql`exists (
    select 1
    from ${users}
    where ${users.id} = ${userId}
      and ${users.organizationId} = ${user.organizationId}
      and ${users.isActive} = true
  )`;
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
  const checklistCounts = db
    .select({
      taskId: taskChecklistItems.taskId,
      total: count(taskChecklistItems.id).as("total"),
      completed:
        sql<number>`sum(case when ${taskChecklistItems.isCompleted} then 1 else 0 end)`.as(
          "completed",
        ),
    })
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.organizationId, user.organizationId))
    .groupBy(taskChecklistItems.taskId)
    .as("checklist_counts");

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
        checklistTotal: checklistCounts.total,
        checklistCompleted: checklistCounts.completed,
      })
      .from(tasks)
      .innerJoin(departments, eq(tasks.departmentId, departments.id))
      .leftJoin(users, eq(tasks.assignedToUserId, users.id))
      .leftJoin(checklistCounts, eq(checklistCounts.taskId, tasks.id))
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

  return {
    rows: rows.map((row) => ({
      ...row,
      checklist: {
        total: Number(row.checklistTotal ?? 0),
        completed: Number(row.checklistCompleted ?? 0),
      },
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

async function getTaskActorContext(user: CurrentUser) {
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
