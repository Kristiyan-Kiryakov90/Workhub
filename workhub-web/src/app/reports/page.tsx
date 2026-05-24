import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import {
  getReportsData,
  reportPeriods,
  type ReportFilters,
} from "@/modules/reports/services/report-service";
import { AnalyticsFilters } from "./report-filters";

export const metadata = {
  title: "Analytics | WorkHub",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireReportsUser();
  const params = await searchParams;
  const filters = parseReportFilters(params);
  const reports = await getReportsData(user, filters);

  if (!reports.canViewReports) {
    return (
      <ReportsShell
        title="Analytics"
        description="Operational analytics for departments, work, leave, and shifts."
      >
        <EmptyState text="You are not assigned as manager to any department." />
      </ReportsShell>
    );
  }

  const summaryCards: { label: string; value: number }[] = reports.isMainAdmin
    ? [
        { label: "Departments", value: reports.summary?.totalDepartments ?? 0 },
        { label: "Active Users", value: reports.summary?.totalActiveUsers ?? 0 },
        {
          label: "Department Managers",
          value: reports.summary?.totalDepartmentManagers ?? 0,
        },
        { label: "Active Tasks", value: reports.summary?.totalActiveTasks ?? 0 },
        {
          label: "Pending Leave",
          value: reports.summary?.totalPendingLeaveRequests ?? 0,
        },
        {
          label: "Upcoming Shifts",
          value: reports.summary?.totalUpcomingShifts ?? 0,
        },
      ]
    : [
        { label: "Employees", value: reports.summary?.totalEmployees ?? 0 },
        { label: "Active Tasks", value: reports.summary?.totalActiveTasks ?? 0 },
        {
          label: "Completed Tasks",
          value: reports.summary?.totalCompletedTasks ?? 0,
        },
        {
          label: "Pending Leave",
          value: reports.summary?.totalPendingLeaveRequests ?? 0,
        },
        {
          label: "Approved Leave",
          value: reports.summary?.totalApprovedLeaveRequests ?? 0,
        },
        {
          label: "Upcoming Shifts",
          value: reports.summary?.totalUpcomingShifts ?? 0,
        },
        {
          label: "Completed Shifts",
          value: reports.summary?.totalCompletedShifts ?? 0,
        },
      ];

  const hasAnyReportData =
    summaryCards.some((card) => card.value > 0) ||
    reports.departmentComparison.some(
      (department) =>
        department.employees +
          department.activeTasks +
          department.completedTasks +
          department.pendingLeaveRequests +
          department.upcomingShifts >
        0,
    );

  return (
    <ReportsShell
      title={
        reports.isMainAdmin ? "Organization Analytics" : "Department Analytics"
      }
      description={`${reports.dateRange.label}: ${formatDate(
        reports.dateRange.startDate,
      )} - ${formatDate(reports.dateRange.endDate)}`}
    >
      <AnalyticsFilters
        filters={filters}
        departmentOptions={reports.departmentOptions}
        selectedDepartmentId={reports.selectedDepartmentId}
        periodOptions={toOptions(reportPeriods)}
      />

      {!hasAnyReportData ? (
        <EmptyState text="No report data available for the selected filters." />
      ) : null}

      <ReportSection
        title={reports.isMainAdmin ? "Organization Summary" : "Department Summary"}
      >
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]">
          {summaryCards.map((card) => (
            <MetricCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      </ReportSection>

      {reports.isMainAdmin ? (
        <ReportSection title="Department Comparison">
          {reports.departmentComparison.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Employees</th>
                      <th className="px-4 py-3">Active Tasks</th>
                      <th className="px-4 py-3">Completed Tasks</th>
                      <th className="px-4 py-3">Pending Leave</th>
                      <th className="px-4 py-3">Upcoming Shifts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.departmentComparison.map((department) => (
                      <tr key={department.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-950">
                          {department.name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {department.employees}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {department.activeTasks}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {department.completedTasks}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {department.pendingLeaveRequests}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {department.upcomingShifts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState text="No organization activity found yet." />
          )}
        </ReportSection>
      ) : null}

      <div className="grid items-stretch gap-6 xl:grid-cols-3">
        <ReportSection
          title={reports.isMainAdmin ? "Organization Task Report" : "Task Report"}
        >
          <div className="h-full space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <BarList title="Tasks by Status" rows={reports.taskReport?.byStatus ?? []} />
            <BarList
              title="Tasks by Priority"
              rows={reports.taskReport?.byPriority ?? []}
            />
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric
                label="Overdue"
                value={reports.taskReport?.overdueTasks ?? 0}
              />
              <MiniMetric
                label="Due This Week"
                value={reports.taskReport?.tasksDueThisWeek ?? 0}
              />
            </div>
            {reports.isMainAdmin ? (
              <BarList
                title="Active Tasks by Department"
                rows={reports.taskReport?.activeByDepartment ?? []}
              />
            ) : null}
          </div>
        </ReportSection>

        <ReportSection
          title={reports.isMainAdmin ? "Organization Leave Report" : "Leave Report"}
        >
          <div className="h-full space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <BarList title="Leave by Status" rows={reports.leaveReport?.byStatus ?? []} />
            <BarList title="Leave by Type" rows={reports.leaveReport?.byType ?? []} />
            <MiniMetric
              label="Upcoming Approved Leave"
              value={reports.leaveReport?.upcomingApprovedLeave ?? 0}
            />
            {reports.isMainAdmin ? (
              <BarList
                title="Leave by Department"
                rows={reports.leaveReport?.leaveRequestsByDepartment ?? []}
              />
            ) : null}
          </div>
        </ReportSection>

        <ReportSection
          title={reports.isMainAdmin ? "Organization Shift Report" : "Shift Report"}
        >
          <div className="h-full space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <BarList title="Shifts by Status" rows={reports.shiftReport?.byStatus ?? []} />
            {reports.isMainAdmin ? (
              <BarList
                title="Shifts by Department"
                rows={reports.shiftReport?.shiftsByDepartment ?? []}
              />
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric
                label="Upcoming"
                value={reports.shiftReport?.upcomingShifts ?? 0}
              />
              <MiniMetric
                label="Completed"
                value={reports.shiftReport?.completedShifts ?? 0}
              />
              <MiniMetric
                label="Cancelled"
                value={reports.shiftReport?.cancelledShifts ?? 0}
              />
              <MiniMetric
                label="Unassigned"
                value={reports.shiftReport?.shiftsWithoutAssignedEmployees ?? 0}
              />
              <MiniMetric
                label="This Week"
                value={reports.shiftReport?.shiftsThisWeek ?? 0}
              />
              <MiniMetric
                label="This Month"
                value={reports.shiftReport?.shiftsThisMonth ?? 0}
              />
            </div>
          </div>
        </ReportSection>
      </div>
    </ReportsShell>
  );
}

function ReportsShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Analytics
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
      <div className="mt-8 space-y-8">{children}</div>
    </section>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col">
      <h2 className="text-lg font-semibold tracking-normal text-slate-950">
        {title}
      </h2>
      <div className="mt-3 flex-1">{children}</div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-full min-h-32 flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-h-24 flex-col justify-between rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function BarList({
  title,
  rows,
}: {
  title: string;
  rows: { key?: string; name?: string; total: number }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.total));

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-2 space-y-2">
        {rows.length > 0 ? (
          rows.map((row) => {
            const label = row.name ?? formatLabel(row.key ?? "");
            const width = `${Math.max(4, Math.round((row.total / max) * 100))}%`;

            return (
              <div key={label}>
                <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
                  <span>{label}</span>
                  <span>{row.total}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-cyan-700"
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">No data available.</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-40 rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
      {text}
    </div>
  );
}

function parseReportFilters(
  params: Record<string, string | string[] | undefined>,
): ReportFilters {
  const period = cleanOption(firstParam(params.period), reportPeriods) ?? "this_month";

  return {
    departmentId: cleanPositiveInteger(firstParam(params.departmentId)),
    period,
    customStartDate: cleanIsoDate(firstParam(params.customStartDate)),
    customEndDate: cleanIsoDate(firstParam(params.customEndDate)),
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanPositiveInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function cleanIsoDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function cleanOption<T extends string>(
  value: string | undefined,
  options: readonly T[],
): T | undefined {
  return options.includes(value as T) ? (value as T) : undefined;
}

function toOptions(values: readonly string[]) {
  return values.map((value) => ({
    value,
    label: formatLabel(value),
  }));
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

async function requireReportsUser() {
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
