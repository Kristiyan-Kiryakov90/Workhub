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
import {
  createOrMergeNotificationForKnownRecipient,
  createNotificationForKnownRecipient,
  getDepartmentManagerIds,
} from "@/modules/notifications/services/notification-service";

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
      isMainAdmin || managedDepartmentIds.length === 0
        ? getDepartmentOptions(user, isMainAdmin, managedDepartmentIds)
        : Promise.resolve(context.managedDepartments),
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
  const canDeleteTask =
    context.permissions.has("tasks.delete") &&
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
    canDeleteTask,
    departmentOptions,
    assigneeOptions,
  };
}

export async function updateTaskDetails(
  user: CurrentUser,
  input: UpdateTaskDetailsInput,
) {
  if (input.title !== undefined) {
    const [existingTask] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        notes: tasks.notes,
        status: tasks.status,
        priority: tasks.priority,
        departmentId: tasks.departmentId,
        dueDate: tasks.dueDate,
        assignedToUserId: tasks.assignedToUserId,
      })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), eq(tasks.organizationId, user.organizationId)))
      .limit(1);

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

    if (
      input.assignedToUserId &&
      input.assignedToUserId !== user.id &&
      input.assignedToUserId !== existingTask?.assignedToUserId
    ) {
      const changeSummary = existingTask
        ? buildTaskChangeSummary(existingTask, {
            title: input.title,
            description: input.description ?? null,
            notes: input.notes,
            status: input.status,
            priority: input.priority,
            departmentId: input.departmentId,
            assignedToUserId: input.assignedToUserId,
            dueDate: input.dueDate ?? null,
          })
        : "";

      await createNotificationForKnownRecipient({
        organizationId: user.organizationId,
        userId: input.assignedToUserId,
        type: "task_assigned",
        title: "New task assigned",
        message: changeSummary
          ? `You were assigned to "${input.title}". ${changeSummary}`
          : `You were assigned to "${input.title}".`,
        relatedEntityType: "task",
        relatedEntityId: input.taskId,
        actionUrl: `/tasks/${input.taskId}`,
      });

      if (changeSummary) {
        await notifyDepartmentManagersOfTaskUpdate(user, {
          taskId: input.taskId,
          departmentId: input.departmentId,
          title: input.title,
          message: `"${input.title}" was updated. ${changeSummary}`,
          excludeUserIds: [input.assignedToUserId],
        });
      }
    } else if (
      existingTask?.assignedToUserId &&
      existingTask.assignedToUserId !== user.id
    ) {
      const changeSummary = buildTaskChangeSummary(existingTask, {
        title: input.title,
        description: input.description ?? null,
        notes: input.notes,
        status: input.status,
        priority: input.priority,
        departmentId: input.departmentId,
        assignedToUserId: input.assignedToUserId ?? null,
        dueDate: input.dueDate ?? null,
      });

      if (changeSummary) {
        await notifyDepartmentManagersOfTaskUpdate(user, {
          taskId: input.taskId,
          departmentId: input.departmentId,
          title: input.title,
          message: `"${input.title}" was updated. ${changeSummary}`,
          excludeUserIds: [input.assignedToUserId],
        });

        await createOrMergeNotificationForKnownRecipient({
          organizationId: user.organizationId,
          userId: existingTask.assignedToUserId,
          type: "task_updated",
          title: "Task updated",
          message: `"${input.title}" was updated. ${changeSummary}`,
          relatedEntityType: "task",
          relatedEntityId: input.taskId,
          actionUrl: `/tasks/${input.taskId}`,
        });
      }
    } else if (existingTask) {
      const changeSummary = buildTaskChangeSummary(existingTask, {
        title: input.title,
        description: input.description ?? null,
        notes: input.notes,
        status: input.status,
        priority: input.priority,
        departmentId: input.departmentId,
        assignedToUserId: input.assignedToUserId ?? null,
        dueDate: input.dueDate ?? null,
      });

      if (changeSummary) {
        await notifyDepartmentManagersOfTaskUpdate(user, {
          taskId: input.taskId,
          departmentId: input.departmentId,
          title: input.title,
          message: `"${input.title}" was updated. ${changeSummary}`,
          excludeUserIds: [input.assignedToUserId],
        });
      }
    }

    if (input.checklistItems) {
      await replaceTaskChecklistItems(user, input.taskId, input.checklistItems);
    }

    return { ok: true };
  }

  const [existingTask] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      notes: tasks.notes,
      departmentId: tasks.departmentId,
      createdByUserId: tasks.createdByUserId,
      assignedToUserId: tasks.assignedToUserId,
    })
    .from(tasks)
    .where(and(eq(tasks.id, input.taskId), eq(tasks.organizationId, user.organizationId)))
    .limit(1);

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
    .returning({
      id: tasks.id,
      title: tasks.title,
      departmentId: tasks.departmentId,
      status: tasks.status,
      createdByUserId: tasks.createdByUserId,
      assignedToUserId: tasks.assignedToUserId,
    });

  if (!updatedTask) {
    return { ok: false, error: "You do not have access to update this task." };
  }

  if (updatedTask.assignedToUserId && updatedTask.assignedToUserId !== user.id) {
    const changeSummary = existingTask
      ? buildTaskChangeSummary(existingTask, {
          status: input.status,
          notes: input.notes,
        })
      : "";

    if (changeSummary) {
      await notifyDepartmentManagersOfTaskUpdate(user, {
        taskId: updatedTask.id,
        departmentId: updatedTask.departmentId,
        title: updatedTask.title,
        message: `"${updatedTask.title}" was updated. ${changeSummary}`,
        excludeUserIds: [updatedTask.assignedToUserId],
      });

      await createOrMergeNotificationForKnownRecipient({
        organizationId: user.organizationId,
        userId: updatedTask.assignedToUserId,
        type: "task_updated",
        title: "Task updated",
        message: `"${updatedTask.title}" was updated. ${changeSummary}`,
        relatedEntityType: "task",
        relatedEntityId: updatedTask.id,
        actionUrl: `/tasks/${updatedTask.id}`,
      });
    }
  } else if (updatedTask.assignedToUserId === user.id && updatedTask.createdByUserId !== user.id) {
    const changeSummary = existingTask
      ? buildTaskChangeSummary(existingTask, {
          status: input.status,
          notes: input.notes,
        })
      : "";

    if (changeSummary) {
      await notifyDepartmentManagersOfTaskUpdate(user, {
        taskId: updatedTask.id,
        departmentId: updatedTask.departmentId,
        title: updatedTask.title,
        message:
          updatedTask.status === "completed"
            ? `${user.name} completed "${updatedTask.title}". ${changeSummary}`
            : `${user.name} updated "${updatedTask.title}". ${changeSummary}`,
        excludeUserIds: [updatedTask.createdByUserId],
      });

      await createOrMergeNotificationForKnownRecipient({
        organizationId: user.organizationId,
        userId: updatedTask.createdByUserId,
        type: "task_updated",
        title:
          updatedTask.status === "completed"
            ? "Task completed"
            : "Task updated",
        message:
          updatedTask.status === "completed"
            ? `${user.name} completed "${updatedTask.title}". ${changeSummary}`
            : `${user.name} updated "${updatedTask.title}". ${changeSummary}`,
        relatedEntityType: "task",
        relatedEntityId: updatedTask.id,
        actionUrl: `/tasks/${updatedTask.id}`,
      });
    }
  } else if (existingTask) {
    const changeSummary = buildTaskChangeSummary(existingTask, {
      status: input.status,
      notes: input.notes,
    });

    if (changeSummary) {
      await notifyDepartmentManagersOfTaskUpdate(user, {
        taskId: updatedTask.id,
        departmentId: updatedTask.departmentId,
        title: updatedTask.title,
        message: `"${updatedTask.title}" was updated. ${changeSummary}`,
      });
    }
  }

  return { ok: true };
}

export async function toggleTaskChecklistItem(
  user: CurrentUser,
  input: { taskId: number; itemId: number; isCompleted: boolean },
) {
  const [itemRows, access] = await Promise.all([
    db
      .select({
        id: taskChecklistItems.id,
        taskId: taskChecklistItems.taskId,
        title: taskChecklistItems.title,
      })
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

  await notifyTaskChecklistUpdate(
    user,
    input.taskId,
    `Checklist item "${item.title}" marked ${
      input.isCompleted ? "completed" : "incomplete"
    }.`,
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

  await notifyTaskChecklistUpdate(
    user,
    input.taskId,
    `Checklist item "${input.title}" added.`,
  );

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

  const [item] = await db
    .select({ title: taskChecklistItems.title })
    .from(taskChecklistItems)
    .where(
      and(
        eq(taskChecklistItems.id, input.itemId),
        eq(taskChecklistItems.taskId, input.taskId),
        eq(taskChecklistItems.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  await db
    .delete(taskChecklistItems)
    .where(
      and(
        eq(taskChecklistItems.id, input.itemId),
        eq(taskChecklistItems.taskId, input.taskId),
        eq(taskChecklistItems.organizationId, user.organizationId),
      ),
    );

  if (item) {
    await notifyTaskChecklistUpdate(
      user,
      input.taskId,
      `Checklist item "${item.title}" deleted.`,
    );
  }

  return { ok: true };
}

export async function deleteTask(user: CurrentUser, taskId: number) {
  const [deletedTask] = await db
    .delete(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.organizationId, user.organizationId),
        canDeleteTaskSql(user),
      ),
    )
    .returning({ id: tasks.id });

  return { ok: Boolean(deletedTask) };
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

  if (input.assignedToUserId && input.assignedToUserId !== user.id) {
    await createNotificationForKnownRecipient({
      organizationId: user.organizationId,
      userId: input.assignedToUserId,
      type: "task_assigned",
      title: "New task assigned",
      message: `You were assigned to "${input.title}".`,
      relatedEntityType: "task",
      relatedEntityId: task.id,
      actionUrl: `/tasks/${task.id}`,
    });
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

function canDeleteTaskSql(user: CurrentUser) {
  return sql`exists (
    select 1
    from ${userRoles}
    inner join ${roles} on ${userRoles.roleId} = ${roles.id}
    left join ${rolePermissions} on ${roles.id} = ${rolePermissions.roleId}
    left join ${permissions} on ${rolePermissions.permissionId} = ${permissions.id}
    where ${userRoles.userId} = ${user.id}
      and ${userRoles.organizationId} = ${user.organizationId}
      and ${roles.organizationId} = ${user.organizationId}
      and ${permissions.key} = 'tasks.delete'
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
  const rows = await db
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
    .limit(pageSize + 1)
    .offset(offset);
  const visibleRows = rows.slice(0, pageSize);
  const checklistCountsByTaskId = await getChecklistCountsByTaskId(
    user,
    visibleRows.map((row) => row.id),
  );
  const hasNextPage = rows.length > pageSize;

  return {
    rows: visibleRows.map((row) => ({
      ...row,
      checklist: checklistCountsByTaskId.get(row.id) ?? { total: 0, completed: 0 },
    })),
    total: offset + visibleRows.length + (hasNextPage ? 1 : 0),
    page: options.page,
    totalPages: hasNextPage ? options.page + 1 : options.page,
    hasPreviousPage: options.page > 1,
    hasNextPage,
  };
}

async function getChecklistCountsByTaskId(user: CurrentUser, taskIds: number[]) {
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
      {
        total: Number(row.total ?? 0),
        completed: Number(row.completed ?? 0),
      },
    ]),
  );
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

async function notifyTaskChecklistUpdate(
  user: CurrentUser,
  taskId: number,
  changeDescription: string,
) {
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      departmentId: tasks.departmentId,
      createdByUserId: tasks.createdByUserId,
      assignedToUserId: tasks.assignedToUserId,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, user.organizationId)))
    .limit(1);

  if (!task) {
    return;
  }

  const recipientId =
    task.assignedToUserId === user.id
      ? task.createdByUserId
      : task.assignedToUserId;

  if (!recipientId || recipientId === user.id) {
    await notifyDepartmentManagersOfTaskUpdate(user, {
      taskId: task.id,
      departmentId: task.departmentId,
      title: task.title,
      message: `${user.name} updated "${task.title}". Changes: ${changeDescription}`,
    });
    return;
  }

  const message = `${user.name} updated "${task.title}". Changes: ${changeDescription}`;

  await Promise.all([
    createOrMergeNotificationForKnownRecipient({
      organizationId: user.organizationId,
      userId: recipientId,
      type: "task_updated",
      title: "Task updated",
      message,
      relatedEntityType: "task",
      relatedEntityId: task.id,
      actionUrl: `/tasks/${task.id}`,
    }),
    notifyDepartmentManagersOfTaskUpdate(user, {
      taskId: task.id,
      departmentId: task.departmentId,
      title: task.title,
      message,
      excludeUserIds: [recipientId],
    }),
  ]);
}

async function notifyDepartmentManagersOfTaskUpdate(
  user: CurrentUser,
  input: {
    taskId: number;
    departmentId: number;
    title: string;
    message: string;
    excludeUserIds?: Array<number | null | undefined>;
  },
) {
  const excludedUserIds = new Set([user.id, ...(input.excludeUserIds ?? [])]);
  const managerIds = await getDepartmentManagerIds(
    user.organizationId,
    input.departmentId,
  );

  await Promise.all(
    managerIds
      .filter((managerId) => !excludedUserIds.has(managerId))
      .map((managerId) =>
        createOrMergeNotificationForKnownRecipient({
          organizationId: user.organizationId,
          userId: managerId,
          type: "task_updated",
          title: "Task updated",
          message: input.message,
          relatedEntityType: "task",
          relatedEntityId: input.taskId,
          actionUrl: `/tasks/${input.taskId}`,
        }),
      ),
  );
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

function buildTaskChangeSummary(
  previous: {
    title?: string;
    description?: string | null;
    notes?: string | null;
    status?: string;
    priority?: string;
    departmentId?: number;
    assignedToUserId?: number | null;
    dueDate?: string | null;
  },
  next: {
    title?: string;
    description?: string | null;
    notes?: string | null;
    status?: string;
    priority?: string;
    departmentId?: number;
    assignedToUserId?: number | null;
    dueDate?: string | null;
  },
) {
  const changes: string[] = [];

  if (next.title !== undefined && next.title !== previous.title) {
    changes.push(`Title changed from "${previous.title}" to "${next.title}"`);
  }

  if (next.status !== undefined && next.status !== previous.status) {
    changes.push(
      `Status changed from ${formatTaskValue(previous.status)} to ${formatTaskValue(next.status)}`,
    );
  }

  if (next.priority !== undefined && next.priority !== previous.priority) {
    changes.push(
      `Priority changed from ${formatTaskValue(previous.priority)} to ${formatTaskValue(next.priority)}`,
    );
  }

  if (
    next.dueDate !== undefined &&
    normalizeNullableValue(next.dueDate) !== normalizeNullableValue(previous.dueDate)
  ) {
    changes.push(
      `Due date changed from ${formatTaskDate(previous.dueDate)} to ${formatTaskDate(next.dueDate)}`,
    );
  }

  if (
    next.departmentId !== undefined &&
    previous.departmentId !== undefined &&
    next.departmentId !== previous.departmentId
  ) {
    changes.push("Department changed");
  }

  if (
    next.assignedToUserId !== undefined &&
    normalizeNullableValue(next.assignedToUserId) !==
      normalizeNullableValue(previous.assignedToUserId)
  ) {
    changes.push("Assignee changed");
  }

  if (
    next.description !== undefined &&
    normalizeNullableValue(next.description) !==
      normalizeNullableValue(previous.description)
  ) {
    changes.push("Description updated");
  }

  if (
    next.notes !== undefined &&
    normalizeNullableValue(next.notes) !== normalizeNullableValue(previous.notes)
  ) {
    changes.push(next.notes ? "Notes updated" : "Notes cleared");
  }

  return changes.length > 0 ? `Changes: ${changes.join("; ")}.` : "";
}

function normalizeNullableValue(value: string | number | null | undefined) {
  return value ?? null;
}

function formatTaskDate(value: string | null | undefined) {
  return value ? value : "not set";
}

function formatTaskValue(value: string | null | undefined) {
  return value ? formatLabel(value) : "not set";
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
