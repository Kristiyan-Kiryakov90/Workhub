import Link from "next/link";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import type { CurrentUser } from "@/modules/auth/types";
import { getDashboardData } from "@/modules/dashboard/services/dashboard-service";
import { getShiftCalendarData } from "@/modules/shifts/services/shift-list-service";
import { ShiftCalendar } from "@/app/shifts/shift-calendar";

export const metadata = {
  title: "Dashboard | WorkHub",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireDashboardUser();
  const params = await searchParams;
  const dashboard = await getCachedDashboardData(user);
  const shiftCalendar = dashboard.isDepartmentManager
    ? await getCachedDashboardShiftCalendar(user, cleanMonth(firstParam(params.month)))
    : null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              Welcome back, {user.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {user.organizationName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {dashboard.roles.map((role) => (
              <Badge key={role} tone="neutral">
                {role}
              </Badge>
            ))}
            {dashboard.managedDepartments.map((department) => (
              <Badge key={department.id} tone="info">
                {department.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {dashboard.organizationSummary ? (
          <DashboardSection title="Organization Summary">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <SummaryCard
                label="Departments"
                value={dashboard.organizationSummary.totalDepartments}
              />
              <SummaryCard
                label="Active Users"
                value={dashboard.organizationSummary.totalActiveUsers}
              />
              <SummaryCard
                label="Managers"
                value={dashboard.organizationSummary.totalDepartmentManagers}
              />
              <SummaryCard
                label="Pending Leave"
                value={dashboard.organizationSummary.totalPendingLeaveRequests}
              />
              <SummaryCard
                label="Upcoming Shifts"
                value={dashboard.organizationSummary.totalUpcomingShifts}
              />
              <SummaryCard
                label="Active Tasks"
                value={dashboard.organizationSummary.totalActiveTasks}
              />
            </div>
          </DashboardSection>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          <DashboardSection title="My Active Tasks">
            <CardList emptyText="You have no active tasks.">
              {dashboard.myActiveTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  title={task.title}
                  department={task.department}
                  assignedEmployee={null}
                  showAssignment={false}
                  status={task.status}
                  priority={task.priority}
                  dueDate={task.dueDate}
                />
              ))}
            </CardList>
          </DashboardSection>

          <DashboardSection title="My Upcoming Shifts">
            <CardList emptyText="You have no upcoming shifts.">
              {dashboard.myUpcomingShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  href={`/shifts/${shift.id}`}
                  title={shift.title}
                  department={shift.department}
                  startTime={shift.startTime}
                  endTime={shift.endTime}
                  location={shift.location}
                  status={shift.status}
                />
              ))}
            </CardList>
          </DashboardSection>

          <DashboardSection title="My Leave Requests">
            <CardList emptyText="You have not submitted any leave requests yet.">
              {dashboard.myLeaveRequests.map((request) => (
                <LeaveRequestCard
                  key={request.id}
                  href={`/leave/${request.id}`}
                  type={request.type}
                  startDate={request.startDate}
                  endDate={request.endDate}
                  status={request.status}
                />
              ))}
            </CardList>
          </DashboardSection>
        </div>

        {dashboard.isDepartmentManager ? (
          <>
            {shiftCalendar ? (
              <DashboardSection title="Department Schedule Calendar">
                <ShiftCalendar
                  data={shiftCalendar}
                  baseHref="/dashboard"
                  shiftHrefPrefix="/manager/shifts"
                />
              </DashboardSection>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-3">
            <DashboardSection title="Pending Leave Approvals">
              <CardList emptyText="There are no leave requests waiting for approval.">
                {dashboard.pendingLeaveApprovals.map((request) => (
                  <ManagerLeaveCard
                    key={request.id}
                    href={`/manager/leave/${request.id}`}
                    employeeName={request.employeeName}
                    department={request.department}
                    type={request.type}
                    startDate={request.startDate}
                    endDate={request.endDate}
                    reason={request.reason}
                  />
                ))}
              </CardList>
            </DashboardSection>

            <DashboardSection title="Upcoming Department Shifts">
              <CardList emptyText="There are no upcoming department shifts.">
                {dashboard.upcomingDepartmentShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    href={`/manager/shifts/${shift.id}`}
                    title={shift.title}
                    department={shift.department}
                    startTime={shift.startTime}
                    endTime={shift.endTime}
                    location={shift.location}
                    status={`${shift.assignedEmployees} assigned`}
                  />
                ))}
              </CardList>
            </DashboardSection>

            <DashboardSection title="Department Tasks Overview">
              <CardList emptyText="There are no active department tasks.">
                {dashboard.departmentTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    title={task.title}
                    department={task.department}
                    assignedEmployee={task.assignedEmployee}
                    showAssignment
                    status={task.status}
                    priority={task.priority}
                    dueDate={task.dueDate}
                  />
                ))}
              </CardList>
            </DashboardSection>
            </div>
          </>
        ) : null}

        {dashboard.isMainAdmin ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardSection title="Pending Leave Requests Across Organization">
              <CardList emptyText="There are no pending leave requests.">
                {dashboard.organizationPendingLeaveRequests.map((request) => (
                  <AdminLeaveCard
                    key={request.id}
                    href={`/admin/leave/${request.id}`}
                    employeeName={request.employeeName}
                    department={request.department}
                    type={request.type}
                    startDate={request.startDate}
                    endDate={request.endDate}
                    status={request.status}
                  />
                ))}
              </CardList>
            </DashboardSection>

            <DashboardSection title="Recently Created Tasks">
              <CardList emptyText="There are no recently created active tasks.">
                {dashboard.recentlyCreatedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    title={task.title}
                    department={task.department}
                    assignedEmployee={task.assignedEmployee}
                    showAssignment
                    status={task.status}
                    priority={task.priority}
                    dueDate={task.dueDate}
                  />
                ))}
              </CardList>
            </DashboardSection>
          </div>
        ) : null}
      </div>
    </section>
  );
}

async function getCachedDashboardData(user: CurrentUser) {
  return unstable_cache(
    async () => getDashboardData(user),
    ["dashboard", String(user.organizationId), String(user.id)],
    {
      revalidate: 30,
      tags: [
        `dashboard:${user.organizationId}`,
        `dashboard:${user.organizationId}:${user.id}`,
      ],
    },
  )();
}

async function getCachedDashboardShiftCalendar(
  user: CurrentUser,
  month?: string,
) {
  return unstable_cache(
    async () => getShiftCalendarData(user, { month }),
    [
      "dashboard-shift-calendar",
      String(user.organizationId),
      String(user.id),
      month ?? "current",
    ],
    {
      revalidate: 30,
      tags: [
        `dashboard:${user.organizationId}`,
        `dashboard:${user.organizationId}:${user.id}`,
        `shifts:${user.organizationId}`,
        `shifts:${user.organizationId}:${user.id}`,
        `leave:${user.organizationId}`,
      ],
    },
  )();
}

function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-normal text-slate-950">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CardList({
  emptyText,
  children,
}: {
  emptyText: string;
  children: React.ReactNode[];
}) {
  return children.length > 0 ? (
    <div className="space-y-3">{children}</div>
  ) : (
    <div className="flex min-h-40 rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
      {emptyText}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function TaskCard({
  href,
  title,
  department,
  assignedEmployee,
  showAssignment = true,
  status,
  priority,
  dueDate,
}: {
  href: string;
  title: string;
  department: string;
  assignedEmployee: string | null;
  showAssignment?: boolean;
  status: string;
  priority: string;
  dueDate: string | null;
}) {
  const overdue = dueDate ? isPastDate(dueDate) : false;
  const priorityTone =
    priority === "urgent" ? "danger" : priority === "high" ? "warning" : "neutral";

  return (
    <Link
      href={href}
      className={[
        "flex min-h-40 flex-col rounded-lg border bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md",
        overdue ? "border-red-300" : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 text-slate-950">
          {title}
        </h3>
        <Badge tone={priorityTone}>{formatLabel(priority)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="info">{department}</Badge>
        <Badge tone="neutral">{formatLabel(status)}</Badge>
        {showAssignment && assignedEmployee ? (
          <Badge tone="neutral">{assignedEmployee}</Badge>
        ) : showAssignment ? (
          <Badge tone="danger">Unassigned</Badge>
        ) : null}
        {overdue ? <Badge tone="danger">Overdue</Badge> : null}
      </div>
      <p className="mt-auto pt-4 text-sm text-slate-600">
        Due {dueDate ? formatDate(dueDate) : "Not set"}
      </p>
    </Link>
  );
}

function ShiftCard({
  href,
  title,
  department,
  startTime,
  endTime,
  location,
  status,
}: {
  href: string;
  title: string;
  department: string;
  startTime: Date | string;
  endTime: Date | string;
  location: string | null;
  status: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-40 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 text-slate-950">
          {title}
        </h3>
        <Badge tone="info">{status.includes("_") ? formatLabel(status) : status}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="neutral">{department}</Badge>
        {location ? <Badge tone="neutral">{location}</Badge> : null}
      </div>
      <p className="mt-auto pt-4 text-sm text-slate-600">
        {formatDateTime(startTime)} - {formatTime(endTime)}
      </p>
    </Link>
  );
}

function LeaveRequestCard({
  href,
  type,
  startDate,
  endDate,
  status,
}: {
  href: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-40 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 text-slate-950">
          {formatLabel(type)} leave
        </h3>
        <Badge tone={leaveStatusTone(status)}>
          {formatLabel(status)}
        </Badge>
      </div>
      <p className="mt-auto pt-4 text-sm text-slate-600">
        {formatDate(startDate)} - {formatDate(endDate)}
      </p>
    </Link>
  );
}

function ManagerLeaveCard({
  href,
  employeeName,
  department,
  type,
  startDate,
  endDate,
  reason,
}: {
  href: string;
  employeeName: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-40 flex-col rounded-lg border border-amber-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 text-slate-950">
          {employeeName}
        </h3>
        <Badge tone="warning">{formatLabel(type)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="neutral">{department}</Badge>
        <Badge tone="warning">Pending</Badge>
      </div>
      <p className="mt-auto pt-4 text-sm text-slate-600">
        {formatDate(startDate)} - {formatDate(endDate)}
      </p>
      {reason ? (
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{reason}</p>
      ) : null}
    </Link>
  );
}

function AdminLeaveCard({
  href,
  employeeName,
  department,
  type,
  startDate,
  endDate,
  status,
}: {
  href: string;
  employeeName: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-40 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 text-slate-950">
          {employeeName}
        </h3>
        <Badge tone={leaveStatusTone(status)}>{formatLabel(status)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="neutral">{department}</Badge>
        <Badge tone="info">{formatLabel(type)}</Badge>
      </div>
      <p className="mt-auto pt-4 text-sm text-slate-600">
        {formatDate(startDate)} - {formatDate(endDate)}
      </p>
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

function leaveStatusTone(status: string) {
  if (status === "approved") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  return "warning";
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
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(toDate(value));
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanMonth(value: string | undefined) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

async function requireDashboardUser() {
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
