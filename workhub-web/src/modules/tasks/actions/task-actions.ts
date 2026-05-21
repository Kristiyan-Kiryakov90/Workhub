"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { verifyCsrfToken } from "@/modules/auth/services/csrf-service";
import {
  addTaskChecklistItem,
  createTask,
  deleteTaskChecklistItem,
  deleteTask,
  taskPriorities,
  taskStatuses,
  toggleTaskChecklistItem,
  updateTaskDetails,
  type TaskPriority,
  type TaskStatus,
} from "../services/task-list-service";

export async function updateTaskDetailsAction(formData: FormData) {
  let user;

  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (
      error instanceof AuthorizationError &&
      error.code === "unauthenticated"
    ) {
      redirect("/login");
    }

    throw error;
  }

  const taskId = Number(formData.get("taskId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const priority = String(formData.get("priority") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const departmentId = Number(formData.get("departmentId"));
  const assignedToUserId = optionalPositiveInteger(formData.get("assignedToUserId"));
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!Number.isInteger(taskId) || taskId <= 0) {
    redirect("/tasks");
  }

  if (!(await verifyCsrfToken(csrfToken, "task.update"))) {
    redirect(`/tasks/${taskId}?error=session-expired`);
  }

  if (!isTaskStatus(status)) {
    redirect(`/tasks/${taskId}?error=invalid-status`);
  }

  const hasFullEditFields = formData.has("title");

  if (hasFullEditFields) {
    if (!title || title.length > 220) {
      redirect(`/tasks/${taskId}?error=invalid-title`);
    }

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      redirect(`/tasks/${taskId}?error=invalid-department`);
    }

    if (!isTaskPriority(priority)) {
      redirect(`/tasks/${taskId}?error=invalid-priority`);
    }

    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      redirect(`/tasks/${taskId}?error=invalid-due-date`);
    }
  }

  const result = await updateTaskDetails(user, {
    taskId,
    status,
    notes: notes || null,
    ...(hasFullEditFields
      ? {
          title,
          description: description || null,
          priority: priority as TaskPriority,
          departmentId,
          assignedToUserId,
          dueDate: dueDate || null,
        }
      : {}),
  });

  if (!result.ok) {
    redirect(`/tasks/${taskId}?error=forbidden`);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskCaches(user);
  redirect("/tasks");
}

export async function createTaskAction(formData: FormData) {
  let user;

  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (
      error instanceof AuthorizationError &&
      error.code === "unauthenticated"
    ) {
      redirect("/login");
    }

    throw error;
  }

  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!(await verifyCsrfToken(csrfToken, "task.create"))) {
    redirect("/tasks/new?error=session-expired");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const checklist = checklistInputFromForm(formData);
  const status = String(formData.get("status") ?? "");
  const priority = String(formData.get("priority") ?? "");
  const departmentId = Number(formData.get("departmentId"));
  const assignedToUserId = optionalPositiveInteger(formData.get("assignedToUserId"));
  const dueDate = String(formData.get("dueDate") ?? "").trim();

  if (!title || title.length > 220) {
    redirect("/tasks/new?error=invalid-title");
  }

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    redirect("/tasks/new?error=invalid-department");
  }

  if (!isTaskStatus(status)) {
    redirect("/tasks/new?error=invalid-status");
  }

  if (!isTaskPriority(priority)) {
    redirect("/tasks/new?error=invalid-priority");
  }

  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    redirect("/tasks/new?error=invalid-due-date");
  }

  const result = await createTask(user, {
    title,
    description: description || null,
    notes: notes || null,
    status,
    priority,
    departmentId,
    assignedToUserId,
    dueDate: dueDate || null,
    checklistItems: parseChecklistItems(checklist),
  });

  if (!result.ok) {
    redirect("/tasks/new?error=forbidden");
  }

  revalidatePath("/tasks");
  revalidateTaskCaches(user);
  redirect("/tasks");
}

export async function toggleChecklistItemAction(formData: FormData) {
  const user = await requireActionUser();
  const taskId = Number(formData.get("taskId"));
  const itemId = Number(formData.get("itemId"));
  const nextValue = String(formData.get("isCompleted") ?? "") === "true";
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!Number.isInteger(taskId) || taskId <= 0) {
    redirect("/tasks");
  }

  if (!(await verifyCsrfToken(csrfToken, "task.checklist.toggle"))) {
    redirect(`/tasks/${taskId}?error=session-expired`);
  }

  if (!Number.isInteger(itemId) || itemId <= 0) {
    redirect(`/tasks/${taskId}?error=invalid-checklist`);
  }

  const result = await toggleTaskChecklistItem(user, {
    taskId,
    itemId,
    isCompleted: nextValue,
  });

  if (!result.ok) {
    redirect(`/tasks/${taskId}?error=forbidden`);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskCaches(user);
  redirect(`/tasks/${taskId}`);
}

export async function addChecklistItemAction(formData: FormData) {
  const user = await requireActionUser();
  const taskId = Number(formData.get("taskId"));
  const title = String(formData.get("title") ?? "").trim();
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!Number.isInteger(taskId) || taskId <= 0) {
    redirect("/tasks");
  }

  if (!(await verifyCsrfToken(csrfToken, "task.checklist.add"))) {
    redirect(`/tasks/${taskId}?error=session-expired`);
  }

  if (!title || title.length > 255) {
    redirect(`/tasks/${taskId}?error=invalid-checklist`);
  }

  const result = await addTaskChecklistItem(user, {
    taskId,
    title,
  });

  if (!result.ok) {
    redirect(`/tasks/${taskId}?error=forbidden`);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskCaches(user);
  redirect(`/tasks/${taskId}`);
}

export async function deleteChecklistItemAction(formData: FormData) {
  const user = await requireActionUser();
  const taskId = Number(formData.get("taskId"));
  const itemId = Number(formData.get("itemId"));
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!Number.isInteger(taskId) || taskId <= 0) {
    redirect("/tasks");
  }

  if (!(await verifyCsrfToken(csrfToken, "task.checklist.delete"))) {
    redirect(`/tasks/${taskId}?error=session-expired`);
  }

  if (!Number.isInteger(itemId) || itemId <= 0) {
    redirect(`/tasks/${taskId}?error=invalid-checklist`);
  }

  const result = await deleteTaskChecklistItem(user, {
    taskId,
    itemId,
  });

  if (!result.ok) {
    redirect(`/tasks/${taskId}?error=forbidden`);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidateTaskCaches(user);
  redirect(`/tasks/${taskId}`);
}

export async function deleteTaskAction(formData: FormData) {
  const user = await requireActionUser();
  const taskId = Number(formData.get("taskId"));
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!Number.isInteger(taskId) || taskId <= 0) {
    redirect("/tasks");
  }

  if (!(await verifyCsrfToken(csrfToken, "task.delete"))) {
    redirect(`/tasks/${taskId}?error=session-expired`);
  }

  const result = await deleteTask(user, taskId);

  if (!result.ok) {
    redirect(`/tasks/${taskId}?error=forbidden`);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidateTaskCaches(user);
  redirect("/tasks");
}

export async function toggleChecklistItemInlineAction(input: {
  taskId: number;
  itemId: number;
  isCompleted: boolean;
  csrfToken: string;
}) {
  const user = await requireActionUser();

  if (!Number.isInteger(input.taskId) || input.taskId <= 0) {
    return { ok: false, error: "invalid-task" };
  }

  if (!Number.isInteger(input.itemId) || input.itemId <= 0) {
    return { ok: false, error: "invalid-checklist" };
  }

  if (!(await verifyCsrfToken(input.csrfToken, "task.checklist.toggle"))) {
    return { ok: false, error: "session-expired" };
  }

  const result = await toggleTaskChecklistItem(user, {
    taskId: input.taskId,
    itemId: input.itemId,
    isCompleted: input.isCompleted,
  });

  if (result.ok) {
    return { ok: true };
  }

  return { ok: false, error: "forbidden" };
}

export async function addChecklistItemInlineAction(input: {
  taskId: number;
  title: string;
  csrfToken: string;
}) {
  const user = await requireActionUser();
  const title = input.title.trim();

  if (!Number.isInteger(input.taskId) || input.taskId <= 0) {
    return { ok: false, error: "invalid-task" };
  }

  if (!title || title.length > 255) {
    return { ok: false, error: "invalid-checklist" };
  }

  if (!(await verifyCsrfToken(input.csrfToken, "task.checklist.add"))) {
    return { ok: false, error: "session-expired" };
  }

  const result = await addTaskChecklistItem(user, {
    taskId: input.taskId,
    title,
  });

  if (result.ok && result.item) {
    return { ok: true, item: result.item };
  }

  return { ok: false, error: "forbidden" };
}

export async function deleteChecklistItemInlineAction(input: {
  taskId: number;
  itemId: number;
  csrfToken: string;
}) {
  const user = await requireActionUser();

  if (!Number.isInteger(input.taskId) || input.taskId <= 0) {
    return { ok: false, error: "invalid-task" };
  }

  if (!Number.isInteger(input.itemId) || input.itemId <= 0) {
    return { ok: false, error: "invalid-checklist" };
  }

  if (!(await verifyCsrfToken(input.csrfToken, "task.checklist.delete"))) {
    return { ok: false, error: "session-expired" };
  }

  const result = await deleteTaskChecklistItem(user, {
    taskId: input.taskId,
    itemId: input.itemId,
  });

  if (result.ok) {
    return { ok: true };
  }

  return { ok: false, error: "forbidden" };
}

function revalidateTaskCaches(user: Awaited<ReturnType<typeof requireCurrentUser>>) {
  updateTag(`tasks:${user.organizationId}`);
  updateTag(`tasks:${user.organizationId}:${user.id}`);
  updateTag(`dashboard:${user.organizationId}`);
  updateTag(`dashboard:${user.organizationId}:${user.id}`);
}

function isTaskStatus(value: string): value is TaskStatus {
  return taskStatuses.includes(value as TaskStatus);
}

function isTaskPriority(value: string): value is TaskPriority {
  return taskPriorities.includes(value as TaskPriority);
}

function optionalPositiveInteger(value: FormDataEntryValue | null) {
  const raw = String(value ?? "");

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseChecklistItems(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((line) => {
      const completed = /^\[x\]\s*/i.test(line);
      const unchecked = /^\[\s\]\s*/.test(line);
      const title = line
        .replace(/^\[x\]\s*/i, "")
        .replace(/^\[\s\]\s*/, "")
        .trim()
        .slice(0, 255);

      return {
        title,
        isCompleted: completed && !unchecked,
      };
    })
    .filter((item) => item.title);
}

function checklistInputFromForm(formData: FormData) {
  const checklistItems = formData
    .getAll("checklistItem")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (checklistItems.length > 0) {
    return checklistItems.join("\n");
  }

  return String(formData.get("checklist") ?? "");
}

async function requireActionUser() {
  try {
    return await requireCurrentUser();
  } catch (error) {
    if (
      error instanceof AuthorizationError &&
      error.code === "unauthenticated"
    ) {
      redirect("/login");
    }

    throw error;
  }
}
