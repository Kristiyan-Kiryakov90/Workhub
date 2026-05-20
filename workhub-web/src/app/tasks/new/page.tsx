import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { createTaskAction } from "@/modules/tasks/actions/task-actions";
import {
  getCreateTaskFormData,
  taskPriorities,
  taskStatuses,
} from "@/modules/tasks/services/task-list-service";
import { ChecklistBuilder } from "./checklist-builder";
import { CreateTaskButton } from "./create-task-button";

export const metadata = {
  title: "Create Task | WorkHub",
};

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireNewTaskUser();
  const params = await searchParams;
  const formData = await getCreateTaskFormData(user);

  if (!formData.canCreateTask) {
    redirect("/tasks");
  }

  const csrfToken = await createCsrfToken("task.create");
  const error = firstParam(params.error);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/tasks"
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to Tasks
      </Link>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Tasks
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            Create task
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Create a task in an accessible department for {user.organizationName}.
          </p>
        </div>

        {error ? (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {errorMessage(error)}
          </p>
        ) : null}

        <form action={createTaskAction} className="mt-6 space-y-5">
          <input type="hidden" name="csrfToken" value={csrfToken} />

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Title
            </span>
            <input
              name="title"
              required
              maxLength={220}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="Task title"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Department" name="departmentId" required>
              <option value="">Choose department</option>
              {formData.departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectField>

            <SelectField label="Assigned Employee" name="assignedToUserId">
              <option value="">Unassigned</option>
              {formData.assigneeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Status" name="status" defaultValue="todo" required>
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Priority"
              name="priority"
              defaultValue="medium"
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
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Description
            </span>
            <textarea
              name="description"
              rows={4}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="Optional description"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Notes
            </span>
            <textarea
              name="notes"
              rows={4}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="Optional task notes"
            />
          </label>

          <ChecklistBuilder />

          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            <CreateTaskButton />
            <Link
              href="/tasks"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </section>
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: string) {
  if (error === "session-expired") {
    return "Your session expired. Refresh the page and try again.";
  }

  if (error === "invalid-title") {
    return "Enter a task title up to 220 characters.";
  }

  if (error === "invalid-department") {
    return "Choose a valid department.";
  }

  if (error === "invalid-status") {
    return "Choose a valid status.";
  }

  if (error === "invalid-priority") {
    return "Choose a valid priority.";
  }

  if (error === "invalid-due-date") {
    return "Choose a valid due date.";
  }

  return "The task could not be created.";
}

async function requireNewTaskUser() {
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
