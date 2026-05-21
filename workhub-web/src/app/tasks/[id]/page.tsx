import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import {
  deleteTaskAction,
  updateTaskDetailsAction,
} from "@/modules/tasks/actions/task-actions";
import {
  getTaskDetails,
  taskPriorities,
  taskStatuses,
} from "@/modules/tasks/services/task-list-service";
import { TaskChecklist } from "./checklist-controls";
import { SaveTaskButton } from "./save-task-button";

export const metadata = {
  title: "Task Details | WorkHub",
};

export default async function TaskDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireTaskDetailsUser();
  const { id } = await params;
  const query = await searchParams;
  const taskId = Number(id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    notFound();
  }

  const task = await getTaskDetails(user, taskId);

  if (!task) {
    notFound();
  }

  const updateCsrfToken = await createCsrfToken("task.update");
  const deleteCsrfToken = task.canDeleteTask
    ? await createCsrfToken("task.delete")
    : null;
  const addChecklistCsrfToken = task.canManageTask
    ? await createCsrfToken("task.checklist.add")
    : null;
  const toggleChecklistCsrfToken = await createCsrfToken("task.checklist.toggle");
  const deleteChecklistCsrfToken = task.canManageTask
    ? await createCsrfToken("task.checklist.delete")
    : null;
  const updated = firstParam(query.updated) === "1";
  const error = firstParam(query.error);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/tasks"
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to Tasks
      </Link>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              {task.departmentName}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              {task.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(task.status)}>{formatLabel(task.status)}</Badge>
            <Badge tone={priorityTone(task.priority)}>
              {formatLabel(task.priority)}
            </Badge>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Assigned Employee">
            {task.assignedEmployeeName ?? "Unassigned"}
          </DetailItem>
          <DetailItem label="Due Date">
            {task.dueDate ? formatDate(task.dueDate) : "Not set"}
          </DetailItem>
          <DetailItem label="Created">
            {formatDateTime(task.createdAt)}
          </DetailItem>
          <DetailItem label="Updated">
            {formatDateTime(task.updatedAt)}
          </DetailItem>
        </dl>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
            {task.description ?? "No description provided."}
          </p>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Checklist
          </h2>
          <TaskChecklist
            taskId={task.id}
            initialItems={task.checklistItems}
            canManageTask={task.canManageTask}
            toggleCsrfToken={toggleChecklistCsrfToken}
            addCsrfToken={addChecklistCsrfToken}
            deleteCsrfToken={deleteChecklistCsrfToken}
          />
        </div>

        <form
          action={updateTaskDetailsAction}
          className="mt-6 border-t border-slate-200 pt-6"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="csrfToken" value={updateCsrfToken} />

          {task.canManageTask ? (
            <>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Title
                </span>
                <input
                  name="title"
                  required
                  maxLength={220}
                  defaultValue={task.title}
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Department"
                  name="departmentId"
                  defaultValue={String(task.departmentId)}
                  required
                >
                  {task.departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Assigned Employee"
                  name="assignedToUserId"
                  defaultValue={task.assignedToUserId?.toString() ?? ""}
                >
                  <option value="">Unassigned</option>
                  {task.assigneeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <SelectField
                  label="Status"
                  name="status"
                  defaultValue={task.status}
                  required
                >
                  {taskStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Priority"
                  name="priority"
                  defaultValue={task.priority}
                  required
                >
                  {taskPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatLabel(priority)}
                    </option>
                  ))}
                </SelectField>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Due Date
                  </span>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={task.dueDate ?? ""}
                    className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Description
                </span>
                <textarea
                  name="description"
                  defaultValue={task.description ?? ""}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  placeholder="Optional description"
                />
              </label>

            </>
          ) : (
            <label className="block sm:w-64">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status
              </span>
              <select
                name="status"
                defaultValue={task.status}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              >
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {updated ? (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              Task updated.
            </p>
          ) : error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorMessage(error)}
            </p>
          ) : null}

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Notes
            </span>
            <textarea
              name="notes"
              defaultValue={task.notes ?? ""}
              rows={6}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="Add task notes"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <SaveTaskButton />
            <Link
              href="/tasks"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Cancel
            </Link>
          </div>
        </form>

        {task.canDeleteTask && deleteCsrfToken ? (
          <form
            action={deleteTaskAction}
            className="mt-6 border-t border-red-100 pt-6"
          >
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="csrfToken" value={deleteCsrfToken} />
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Delete Task
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  required = false,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      >
        {children}
      </select>
    </label>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "danger" | "info" | "neutral" | "success" | "warning";
}) {
  const classes = {
    danger: "border-red-200 bg-red-50 text-red-700",
    info: "border-cyan-200 bg-cyan-50 text-cyan-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function priorityTone(priority: string) {
  if (priority === "urgent") {
    return "danger";
  }

  if (priority === "high") {
    return "warning";
  }

  return "neutral";
}

function statusTone(status: string) {
  if (status === "todo") {
    return "neutral";
  }

  if (status === "in_progress") {
    return "warning";
  }

  if (status === "completed") {
    return "success";
  }

  return "danger";
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(toDate(value));
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function errorMessage(error: string) {
  if (error === "session-expired") {
    return "Your session expired. Refresh the page and try again.";
  }

  if (error === "invalid-status") {
    return "Choose a valid task status.";
  }

  if (error === "invalid-title") {
    return "Enter a task title up to 220 characters.";
  }

  if (error === "invalid-department") {
    return "Choose a valid department.";
  }

  if (error === "invalid-priority") {
    return "Choose a valid priority.";
  }

  if (error === "invalid-due-date") {
    return "Choose a valid due date.";
  }

  if (error === "forbidden") {
    return "You do not have permission to update this task.";
  }

  return "The task could not be updated.";
}

async function requireTaskDetailsUser() {
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
