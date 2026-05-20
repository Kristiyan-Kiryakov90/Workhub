import Link from "next/link";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import type { CurrentUser } from "@/modules/auth/types";
import {
  getTaskListData,
  taskPriorities,
  taskStatuses,
  type TaskListFilters,
  type TaskListData,
} from "@/modules/tasks/services/task-list-service";
import { TaskFilters } from "./task-filters";

export const metadata = {
  title: "Tasks | WorkHub",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireTasksUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const data = await getCachedTaskListData(user, filters);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Tasks
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              Task workspace
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Browse the tasks available to you in {user.organizationName}.
            </p>
          </div>

          {data.canCreateTask ? (
            <Link
              href="/tasks/new"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              Create Task
            </Link>
          ) : null}
        </div>
      </div>

      <TaskFilters
        search={data.filters.search ?? ""}
        status={data.filters.status ?? ""}
        priority={data.filters.priority ?? ""}
        departmentId={data.filters.departmentId?.toString() ?? ""}
        assignedToUserId={data.filters.assignedToUserId?.toString() ?? ""}
        statusOptions={taskStatuses.map((status) => ({
          value: status,
          label: formatLabel(status),
        }))}
        priorityOptions={taskPriorities.map((priority) => ({
          value: priority,
          label: formatLabel(priority),
        }))}
        departmentOptions={data.departmentOptions.map((department) => ({
          value: department.id.toString(),
          label: department.name,
        }))}
        assigneeOptions={data.assigneeOptions.map((employee) => ({
          value: employee.id.toString(),
          label: employee.name,
        }))}
        showDepartmentFilter={data.departmentOptions.length > 1}
        showAssigneeFilter={data.canFilterByAssignee}
      />

      <div className="mt-8 space-y-10">
        <TaskSection
          title="Active Tasks"
          description="Todo and in-progress work, ordered by urgency and due date."
          emptyText={
            hasAppliedFilters(data.filters)
              ? "No tasks match the selected filters."
              : "No active tasks found."
          }
          tasks={data.activeTasks.rows}
          pagination={
            <Pagination
              page={data.activeTasks.page}
              totalPages={data.activeTasks.totalPages}
              hasPreviousPage={data.activeTasks.hasPreviousPage}
              hasNextPage={data.activeTasks.hasNextPage}
              pageParam="activePage"
              filters={data.filters}
            />
          }
        />

        <TaskSection
          title="Completed and Cancelled Tasks"
          description="Archived task history, ordered by the latest update."
          emptyText={
            hasAppliedFilters(data.filters)
              ? "No tasks match the selected filters."
              : "No completed or cancelled tasks found."
          }
          tasks={data.archivedTasks.rows}
          pagination={
            <Pagination
              page={data.archivedTasks.page}
              totalPages={data.archivedTasks.totalPages}
              hasPreviousPage={data.archivedTasks.hasPreviousPage}
              hasNextPage={data.archivedTasks.hasNextPage}
              pageParam="archivePage"
              filters={data.filters}
            />
          }
        />
      </div>
    </section>
  );
}

async function getCachedTaskListData(user: CurrentUser, filters: TaskListFilters) {
  return unstable_cache(
    async () => getTaskListData(user, filters),
    [
      "task-list",
      String(user.organizationId),
      String(user.id),
      stableTaskFiltersKey(filters),
    ],
    {
      revalidate: 30,
      tags: [
        `tasks:${user.organizationId}`,
        `tasks:${user.organizationId}:${user.id}`,
      ],
    },
  )();
}

function stableTaskFiltersKey(filters: TaskListFilters) {
  return JSON.stringify({
    status: filters.status ?? null,
    priority: filters.priority ?? null,
    departmentId: filters.departmentId ?? null,
    assignedToUserId: filters.assignedToUserId ?? null,
    search: filters.search ?? null,
    activePage: filters.activePage ?? 1,
    archivePage: filters.archivePage ?? 1,
  });
}

function TaskSection({
  title,
  description,
  emptyText,
  tasks,
  pagination,
}: {
  title: string;
  description: string;
  emptyText: string;
  tasks: TaskListData["activeTasks"]["rows"];
  pagination: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <p className="text-sm font-medium text-slate-500">{tasks.length} shown</p>
      </div>

      {tasks.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_0.7fr_0.7fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
            <span>Task</span>
            <span>Department</span>
            <span>Assigned</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Due</span>
          </div>
          <div className="divide-y divide-slate-200">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex min-h-40 rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          {emptyText}
        </div>
      )}

      {pagination}
    </section>
  );
}

function TaskRow({ task }: { task: TaskListData["activeTasks"]["rows"][number] }) {
  const overdue = task.dueDate ? isPastDate(task.dueDate) : false;
  const urgent = task.priority === "urgent";

  return (
    <Link
      href={`/tasks/${task.id}`}
      className={[
        "grid gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.5fr_1fr_1fr_0.7fr_0.7fr_0.8fr] lg:items-center",
        overdue ? "bg-red-50/60" : "",
        urgent ? "border-l-4 border-l-red-500" : "border-l-4 border-l-transparent",
      ].join(" ")}
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
        {task.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {task.description}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          Created {formatDateTime(task.createdAt)}
        </p>
        {task.checklist.total > 0 ? (
          <p className="mt-1 text-xs font-medium text-slate-500">
            Checklist {task.checklist.completed}/{task.checklist.total}
          </p>
        ) : null}
      </div>

      <MobileLabel label="Department">
        <span className="text-sm text-slate-700">{task.departmentName}</span>
      </MobileLabel>

      <MobileLabel label="Assigned">
        {task.assignedEmployeeName ? (
          <span className="text-sm text-slate-700">{task.assignedEmployeeName}</span>
        ) : (
          <Badge tone="danger">Unassigned</Badge>
        )}
      </MobileLabel>

      <MobileLabel label="Status">
        <Badge tone={statusTone(task.status)}>{formatLabel(task.status)}</Badge>
      </MobileLabel>

      <MobileLabel label="Priority">
        <Badge tone={priorityTone(task.priority)}>{formatLabel(task.priority)}</Badge>
      </MobileLabel>

      <MobileLabel label="Due">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-700">
            {task.dueDate ? formatDate(task.dueDate) : "Not set"}
          </span>
          {overdue ? <Badge tone="danger">Overdue</Badge> : null}
        </div>
      </MobileLabel>
    </Link>
  );
}

function MobileLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 lg:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:hidden">
        {label}
      </span>
      <div className="text-right lg:text-left">{children}</div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  pageParam,
  filters,
}: {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  pageParam: "activePage" | "archivePage";
  filters: TaskListFilters;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <PaginationLink
          disabled={!hasPreviousPage}
          href={buildPageHref(filters, pageParam, page - 1)}
        >
          Previous
        </PaginationLink>
        <PaginationLink
          disabled={!hasNextPage}
          href={buildPageHref(filters, pageParam, page + 1)}
        >
          Next
        </PaginationLink>
      </div>
    </div>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
    >
      {children}
    </Link>
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

function parseFilters(params: SearchParams): TaskListFilters {
  const status = firstParam(params.status);
  const priority = firstParam(params.priority);

  return {
    status: isTaskStatus(status) ? status : undefined,
    priority: isTaskPriority(priority) ? priority : undefined,
    departmentId: positiveInteger(firstParam(params.departmentId)),
    assignedToUserId: positiveInteger(firstParam(params.assignedToUserId)),
    search: cleanSearch(firstParam(params.search)),
    activePage: positiveInteger(firstParam(params.activePage)) ?? 1,
    archivePage: positiveInteger(firstParam(params.archivePage)) ?? 1,
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanSearch(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : undefined;
}

function positiveInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isTaskStatus(
  value: string | undefined,
): value is (typeof taskStatuses)[number] {
  return taskStatuses.includes(value as (typeof taskStatuses)[number]);
}

function isTaskPriority(
  value: string | undefined,
): value is (typeof taskPriorities)[number] {
  return taskPriorities.includes(value as (typeof taskPriorities)[number]);
}

function hasAppliedFilters(filters: TaskListFilters) {
  return Boolean(
    filters.status ||
      filters.priority ||
      filters.departmentId ||
      filters.assignedToUserId ||
      filters.search,
  );
}

function buildPageHref(
  filters: TaskListFilters,
  pageParam: "activePage" | "archivePage",
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.departmentId) params.set("departmentId", String(filters.departmentId));
  if (filters.assignedToUserId) {
    params.set("assignedToUserId", String(filters.assignedToUserId));
  }
  if (filters.search) params.set("search", filters.search);
  if (filters.activePage && filters.activePage > 1 && pageParam !== "activePage") {
    params.set("activePage", String(filters.activePage));
  }
  if (
    filters.archivePage &&
    filters.archivePage > 1 &&
    pageParam !== "archivePage"
  ) {
    params.set("archivePage", String(filters.archivePage));
  }
  if (page > 1) params.set(pageParam, String(page));

  const query = params.toString();
  return query ? `/tasks?${query}` : "/tasks";
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

function isPastDate(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(`${value}T00:00:00`) < today;
}

async function requireTasksUser() {
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
