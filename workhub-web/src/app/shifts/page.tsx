import Link from "next/link";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import type { CurrentUser } from "@/modules/auth/types";
import {
  getShiftCalendarData,
  getShiftListData,
  shiftDateRanges,
  shiftStatuses,
  type ShiftListData,
  type ShiftListFilters,
} from "@/modules/shifts/services/shift-list-service";
import { ShiftCalendar } from "./shift-calendar";
import { ShiftFilters } from "./shift-filters";

export const metadata = {
  title: "Shifts | WorkHub",
};

type SearchParams = Record<string, string | string[] | undefined>;
type ShiftRow = ShiftListData["myUpcomingShifts"]["rows"][number];
type PageParam =
  | "myUpcomingPage"
  | "myArchivePage"
  | "departmentUpcomingPage"
  | "departmentArchivePage"
  | "organizationUpcomingPage"
  | "organizationArchivePage";

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireShiftsUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const view = firstParam(params.view) === "list" ? "list" : "calendar";
  const month = cleanMonth(firstParam(params.month));
  const calendar = await getCachedShiftCalendarData(user, month);
  const data =
    view === "list"
      ? await getCachedShiftListData(user, filters, true)
      : null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Shifts
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              Shift schedule
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Browse scheduled, completed, and cancelled shifts for {user.organizationName}.
            </p>
          </div>

          {calendar.canCreateShift ? (
            <Link
              href="/shifts/new"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              Create Shift
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/shifts?month=${calendar.month}`}
          className={`inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold transition ${
            view === "calendar"
              ? "bg-cyan-700 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          Calendar
        </Link>
        <Link
          href="/shifts?view=list"
          className={`inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold transition ${
            view === "list"
              ? "bg-cyan-700 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          Lists and Filters
        </Link>
      </div>

      {view === "calendar" ? (
        <div className="mt-6">
          <ShiftCalendar
            data={calendar}
            shiftHrefPrefix={calendar.isDepartmentManager ? "/manager/shifts" : "/shifts"}
          />
        </div>
      ) : (
        <>
          <ShiftFilters
            key={stableShiftFiltersKey(data!.filters)}
            search={data!.filters.search ?? ""}
            status={data!.filters.status ?? ""}
            departmentId={data!.filters.departmentId?.toString() ?? ""}
            assignedToUserId={data!.filters.assignedToUserId?.toString() ?? ""}
            dateRange={data!.filters.dateRange ?? ""}
            statusOptions={shiftStatuses.map((status) => ({
              value: status,
              label: formatLabel(status),
            }))}
            dateRangeOptions={shiftDateRanges.map((range) => ({
              value: range,
              label: formatDateRange(range),
            }))}
            departmentOptions={data!.departmentOptions.map((department) => ({
              value: department.id.toString(),
              label: department.name,
            }))}
            employeeOptions={uniqueEmployeeFilterOptions(data!.employeeOptions)}
            showDepartmentFilter={data!.departmentOptions.length > 1}
            showEmployeeFilter={data!.canFilterByEmployee}
          />

          <div className="mt-8 space-y-10">
        {!data!.isMainAdmin ? (
          <>
            <ShiftSection
              title="My Upcoming Shifts"
              description="Scheduled shifts assigned to you, ordered by start time."
              emptyText={
                hasAppliedFilters(data!.filters)
                  ? "No shifts match the selected filters."
                  : "You have no upcoming shifts."
              }
              rows={data!.myUpcomingShifts.rows}
              hrefForRow={(shift) => `/shifts/${shift.id}`}
              showAssignedCount={false}
              pagination={
                <Pagination
                  page={data!.myUpcomingShifts.page}
                  hasPreviousPage={data!.myUpcomingShifts.hasPreviousPage}
                  hasNextPage={data!.myUpcomingShifts.hasNextPage}
                  pageParam="myUpcomingPage"
                  filters={data!.filters}
                />
              }
            />

            <ShiftSection
              title="My Past and Cancelled Shifts"
              description="Completed, cancelled, and past shifts assigned to you."
              emptyText={
                hasAppliedFilters(data!.filters)
                  ? "No shifts match the selected filters."
                  : "No completed or cancelled shifts found."
              }
              rows={data!.myArchivedShifts.rows}
              hrefForRow={(shift) => `/shifts/${shift.id}`}
              showAssignedCount={false}
              pagination={
                <Pagination
                  page={data!.myArchivedShifts.page}
                  hasPreviousPage={data!.myArchivedShifts.hasPreviousPage}
                  hasNextPage={data!.myArchivedShifts.hasNextPage}
                  pageParam="myArchivePage"
                  filters={data!.filters}
                />
              }
            />
          </>
        ) : null}

        {data!.isDepartmentManager ? (
          <>
            <ShiftSection
              title="Upcoming Department Shifts"
              description="Scheduled shifts in departments you manage."
              emptyText={
                hasAppliedFilters(data!.filters)
                  ? "No shifts match the selected filters."
                  : "There are no scheduled shifts for your departments."
              }
              rows={data!.departmentUpcomingShifts.rows}
              hrefForRow={(shift) => `/manager/shifts/${shift.id}`}
              showAssignedCount
              pagination={
                <Pagination
                  page={data!.departmentUpcomingShifts.page}
                  hasPreviousPage={data!.departmentUpcomingShifts.hasPreviousPage}
                  hasNextPage={data!.departmentUpcomingShifts.hasNextPage}
                  pageParam="departmentUpcomingPage"
                  filters={data!.filters}
                />
              }
            />

            <ShiftSection
              title="Completed or Cancelled Department Shifts"
              description="Archived shift history for departments you manage."
              emptyText={
                hasAppliedFilters(data!.filters)
                  ? "No shifts match the selected filters."
                  : "No completed or cancelled shifts found."
              }
              rows={data!.departmentArchivedShifts.rows}
              hrefForRow={(shift) => `/manager/shifts/${shift.id}`}
              showAssignedCount
              pagination={
                <Pagination
                  page={data!.departmentArchivedShifts.page}
                  hasPreviousPage={data!.departmentArchivedShifts.hasPreviousPage}
                  hasNextPage={data!.departmentArchivedShifts.hasNextPage}
                  pageParam="departmentArchivePage"
                  filters={data!.filters}
                />
              }
            />
          </>
        ) : null}

        {data!.isMainAdmin ? (
          <>
            <ShiftSection
              title="Upcoming Shifts Across Organization"
              description="Scheduled upcoming shifts across all departments."
              emptyText={
                hasAppliedFilters(data!.filters)
                  ? "No shifts match the selected filters."
                  : "There are no scheduled shifts for this organization."
              }
              rows={data!.organizationUpcomingShifts.rows}
              hrefForRow={(shift) => `/shifts/${shift.id}`}
              showAssignedCount
              pagination={
                <Pagination
                  page={data!.organizationUpcomingShifts.page}
                  hasPreviousPage={data!.organizationUpcomingShifts.hasPreviousPage}
                  hasNextPage={data!.organizationUpcomingShifts.hasNextPage}
                  pageParam="organizationUpcomingPage"
                  filters={data!.filters}
                />
              }
            />

            <ShiftSection
              title="Shift Archive"
              description="Recently completed, cancelled, and past shifts."
              emptyText={
                hasAppliedFilters(data!.filters)
                  ? "No shifts match the selected filters."
                  : "No completed or cancelled shifts found."
              }
              rows={data!.organizationArchivedShifts.rows}
              hrefForRow={(shift) => `/shifts/${shift.id}`}
              showAssignedCount
              pagination={
                <Pagination
                  page={data!.organizationArchivedShifts.page}
                  hasPreviousPage={data!.organizationArchivedShifts.hasPreviousPage}
                  hasNextPage={data!.organizationArchivedShifts.hasNextPage}
                  pageParam="organizationArchivePage"
                  filters={data!.filters}
                />
              }
            />
          </>
        ) : null}
          </div>
        </>
      )}
    </section>
  );
}

async function getCachedShiftListData(
  user: CurrentUser,
  filters: ShiftListFilters,
  includeLists: boolean,
) {
  return unstable_cache(
    async () => getShiftListData(user, filters, { includeLists }),
    [
      "shift-list",
      String(user.organizationId),
      String(user.id),
      includeLists ? "with-lists" : "options-only",
      stableShiftFiltersKey(filters),
    ],
    {
      revalidate: 30,
      tags: [
        `shifts:${user.organizationId}`,
        `shifts:${user.organizationId}:${user.id}`,
      ],
    },
  )();
}

async function getCachedShiftCalendarData(user: CurrentUser, month?: string) {
  return unstable_cache(
    async () => getShiftCalendarData(user, { month }),
    ["shift-calendar", String(user.organizationId), String(user.id), month ?? "current"],
    {
      revalidate: 30,
      tags: [
        `shifts:${user.organizationId}`,
        `shifts:${user.organizationId}:${user.id}`,
        `leave:${user.organizationId}`,
      ],
    },
  )();
}

function stableShiftFiltersKey(filters: ShiftListFilters) {
  return JSON.stringify({
    status: filters.status ?? null,
    departmentId: filters.departmentId ?? null,
    assignedToUserId: filters.assignedToUserId ?? null,
    dateRange: filters.dateRange ?? null,
    search: filters.search ?? null,
    myUpcomingPage: filters.myUpcomingPage ?? 1,
    myArchivePage: filters.myArchivePage ?? 1,
    departmentUpcomingPage: filters.departmentUpcomingPage ?? 1,
    departmentArchivePage: filters.departmentArchivePage ?? 1,
    organizationUpcomingPage: filters.organizationUpcomingPage ?? 1,
    organizationArchivePage: filters.organizationArchivePage ?? 1,
  });
}

function ShiftSection({
  title,
  description,
  emptyText,
  rows,
  hrefForRow,
  showAssignedCount,
  pagination,
}: {
  title: string;
  description: string;
  emptyText: string;
  rows: ShiftRow[];
  hrefForRow: (shift: ShiftRow) => string;
  showAssignedCount: boolean;
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
        <p className="text-sm font-medium text-slate-500">{rows.length} shown</p>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.8fr_0.8fr_1fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
            <span>Shift</span>
            <span>Department</span>
            <span>Date</span>
            <span>Start</span>
            <span>End</span>
            <span>Location</span>
            <span>{showAssignedCount ? "Assigned" : "Status"}</span>
          </div>
          <div className="divide-y divide-slate-200">
            {rows.map((shift) => (
              <ShiftRow
                key={shift.id}
                shift={shift}
                href={hrefForRow(shift)}
                showAssignedCount={showAssignedCount}
              />
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

function ShiftRow({
  shift,
  href,
  showAssignedCount,
}: {
  shift: ShiftRow;
  href: string;
  showAssignedCount: boolean;
}) {
  return (
    <Link
      href={href}
      className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.4fr_1fr_0.9fr_0.8fr_0.8fr_1fr_0.8fr] lg:items-center"
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{shift.title}</h3>
        <p className="mt-2 lg:hidden">
          <Badge tone={statusTone(shift.status)}>{formatLabel(shift.status)}</Badge>
        </p>
      </div>

      <MobileLabel label="Department">
        <span className="text-sm text-slate-700">{shift.departmentName}</span>
      </MobileLabel>

      <MobileLabel label="Date">
        <span className="text-sm text-slate-700">{formatDate(shift.startTime)}</span>
      </MobileLabel>

      <MobileLabel label="Start">
        <span className="text-sm text-slate-700">{formatTime(shift.startTime)}</span>
      </MobileLabel>

      <MobileLabel label="End">
        <span className="text-sm text-slate-700">{formatTime(shift.endTime)}</span>
      </MobileLabel>

      <MobileLabel label="Location">
        <span className="text-sm text-slate-700">{shift.location || "Not set"}</span>
      </MobileLabel>

      <MobileLabel label={showAssignedCount ? "Assigned" : "Status"}>
        <div className="flex flex-wrap justify-end gap-2 lg:justify-start">
          {showAssignedCount ? (
            <span className="text-sm font-medium text-slate-700">
              {shift.assignedEmployeeCount}
            </span>
          ) : null}
          <span className={showAssignedCount ? "" : "hidden lg:inline-flex"}>
            <Badge tone={statusTone(shift.status)}>{formatLabel(shift.status)}</Badge>
          </span>
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
  hasPreviousPage,
  hasNextPage,
  pageParam,
  filters,
}: {
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  pageParam: PageParam;
  filters: ShiftListFilters;
}) {
  if (!hasPreviousPage && !hasNextPage) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-500">Page {page}</p>
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
  tone: "danger" | "neutral" | "success";
}) {
  const classes = {
    danger: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function parseFilters(params: SearchParams): ShiftListFilters {
  const status = firstParam(params.status);
  const dateRange = firstParam(params.dateRange);

  return {
    status: isShiftStatus(status) ? status : undefined,
    dateRange: isShiftDateRange(dateRange) ? dateRange : undefined,
    departmentId: positiveInteger(firstParam(params.departmentId)),
    assignedToUserId: positiveInteger(firstParam(params.assignedToUserId)),
    search: cleanSearch(firstParam(params.search)),
    myUpcomingPage: positiveInteger(firstParam(params.myUpcomingPage)) ?? 1,
    myArchivePage: positiveInteger(firstParam(params.myArchivePage)) ?? 1,
    departmentUpcomingPage:
      positiveInteger(firstParam(params.departmentUpcomingPage)) ?? 1,
    departmentArchivePage:
      positiveInteger(firstParam(params.departmentArchivePage)) ?? 1,
    organizationUpcomingPage:
      positiveInteger(firstParam(params.organizationUpcomingPage)) ?? 1,
    organizationArchivePage:
      positiveInteger(firstParam(params.organizationArchivePage)) ?? 1,
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanSearch(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : undefined;
}

function cleanMonth(value: string | undefined) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

function positiveInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isShiftStatus(
  value: string | undefined,
): value is (typeof shiftStatuses)[number] {
  return shiftStatuses.includes(value as (typeof shiftStatuses)[number]);
}

function isShiftDateRange(
  value: string | undefined,
): value is (typeof shiftDateRanges)[number] {
  return shiftDateRanges.includes(value as (typeof shiftDateRanges)[number]);
}

function hasAppliedFilters(filters: ShiftListFilters) {
  return Boolean(
    filters.status ||
      filters.departmentId ||
      filters.assignedToUserId ||
      filters.dateRange ||
      filters.search,
  );
}

function buildPageHref(
  filters: ShiftListFilters,
  pageParam: PageParam,
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.departmentId) params.set("departmentId", String(filters.departmentId));
  if (filters.assignedToUserId) {
    params.set("assignedToUserId", String(filters.assignedToUserId));
  }
  if (filters.dateRange) params.set("dateRange", filters.dateRange);
  if (filters.search) params.set("search", filters.search);

  const pageParams: PageParam[] = [
    "myUpcomingPage",
    "myArchivePage",
    "departmentUpcomingPage",
    "departmentArchivePage",
    "organizationUpcomingPage",
    "organizationArchivePage",
  ];

  for (const currentPageParam of pageParams) {
    const value = filters[currentPageParam];
    if (value && value > 1 && currentPageParam !== pageParam) {
      params.set(currentPageParam, String(value));
    }
  }

  if (page > 1) params.set(pageParam, String(page));

  const query = params.toString();
  return query ? `/shifts?${query}` : "/shifts";
}

function statusTone(status: string) {
  if (status === "completed") {
    return "success";
  }

  if (status === "cancelled") {
    return "danger";
  }

  return "neutral";
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateRange(value: string) {
  const labels: Record<string, string> = {
    upcoming: "Upcoming",
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
  };

  return labels[value] ?? formatLabel(value);
}

function uniqueEmployeeFilterOptions(
  employees: Array<{ id: number; name: string }>,
) {
  return Array.from(
    new Map(
      employees.map((employee) => [
        employee.id,
        {
          value: employee.id.toString(),
          label: employee.name,
        },
      ]),
    ).values(),
  ).sort((first, second) => first.label.localeCompare(second.label));
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

async function requireShiftsUser() {
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
