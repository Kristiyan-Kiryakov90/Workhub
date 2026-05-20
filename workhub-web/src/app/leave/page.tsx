import Link from "next/link";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import type { CurrentUser } from "@/modules/auth/types";
import {
  getLeaveListData,
  leaveRequestStatuses,
  leaveRequestTypes,
  type LeaveListData,
  type LeaveListFilters,
} from "@/modules/leave/services/leave-list-service";
import { LeaveFilters } from "./leave-filters";

export const metadata = {
  title: "Leaves | WorkHub",
};

type SearchParams = Record<string, string | string[] | undefined>;
type LeaveRow = LeaveListData["myRequests"]["rows"][number];

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireLeaveUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const data = await getCachedLeaveListData(user, filters);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Leaves
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              Leaves
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Browse request history and approval queues for {user.organizationName}.
            </p>
          </div>

          <Link
            href="/leave/new"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800"
          >
            Request Leave
          </Link>
        </div>
      </div>

      <LeaveFilters
        key={stableLeaveFiltersKey(data.filters)}
        search={data.filters.search ?? ""}
        status={data.filters.status ?? ""}
        type={data.filters.type ?? ""}
        departmentId={data.filters.departmentId?.toString() ?? ""}
        employeeId={data.filters.employeeId?.toString() ?? ""}
        statusOptions={leaveRequestStatuses.map((status) => ({
          value: status,
          label: formatStatus(status),
        }))}
        typeOptions={leaveRequestTypes.map((type) => ({
          value: type,
          label: formatType(type),
        }))}
        departmentOptions={data.departmentOptions.map((department) => ({
          value: department.id.toString(),
          label: department.name,
        }))}
        employeeOptions={data.employeeOptions.map((employee) => ({
          value: employee.id.toString(),
          label: employee.name,
        }))}
        showDepartmentFilter={data.departmentOptions.length > 1}
        showEmployeeFilter={data.canFilterByEmployee}
      />

      <div className="mt-8 space-y-10">
        <LeaveSection
          title="My Leave Requests"
          description="Requests submitted by you, with pending requests first."
          emptyText={
            hasAppliedFilters(data.filters)
              ? "No leave requests match the selected filters."
              : "You have not submitted any leave requests yet."
          }
          rows={data.myRequests.rows}
          hrefForRow={(request) => `/leave/${request.id}`}
          showEmployee={false}
          pagination={
            <Pagination
              page={data.myRequests.page}
              totalPages={data.myRequests.totalPages}
              hasPreviousPage={data.myRequests.hasPreviousPage}
              hasNextPage={data.myRequests.hasNextPage}
              pageParam="myPage"
              filters={data.filters}
            />
          }
        />

        {data.isDepartmentManager ? (
          <>
            <LeaveSection
              title="Pending Department Approvals"
              description="Pending requests from employees in departments you manage."
              emptyText={
                hasAppliedFilters(data.filters)
                  ? "No leave requests match the selected filters."
                  : "There are no leave requests waiting for approval."
              }
              rows={data.pendingRequests.rows}
              hrefForRow={(request) => `/manager/leave/${request.id}`}
              showEmployee
              pagination={
                <Pagination
                  page={data.pendingRequests.page}
                  totalPages={data.pendingRequests.totalPages}
                  hasPreviousPage={data.pendingRequests.hasPreviousPage}
                  hasNextPage={data.pendingRequests.hasNextPage}
                  pageParam="pendingPage"
                  filters={data.filters}
                />
              }
            />

            <LeaveSection
              title="Recently Reviewed Department Requests"
              description="Approved and rejected requests from departments you manage."
              emptyText={
                hasAppliedFilters(data.filters)
                  ? "No leave requests match the selected filters."
                  : "No recently reviewed department requests found."
              }
              rows={data.reviewedRequests.rows}
              hrefForRow={(request) => `/manager/leave/${request.id}`}
              showEmployee
              pagination={
                <Pagination
                  page={data.reviewedRequests.page}
                  totalPages={data.reviewedRequests.totalPages}
                  hasPreviousPage={data.reviewedRequests.hasPreviousPage}
                  hasNextPage={data.reviewedRequests.hasNextPage}
                  pageParam="reviewedPage"
                  filters={data.filters}
                />
              }
            />
          </>
        ) : null}

        {data.isMainAdmin ? (
          <>
            <LeaveSection
              title="Pending Requests Across Organization"
              description="Pending requests across your organization."
              emptyText={
                hasAppliedFilters(data.filters)
                  ? "No leave requests match the selected filters."
                  : "There are no leave requests waiting for approval."
              }
              rows={data.pendingRequests.rows}
              hrefForRow={(request) => `/admin/leave/${request.id}`}
              showEmployee
              pagination={
                <Pagination
                  page={data.pendingRequests.page}
                  totalPages={data.pendingRequests.totalPages}
                  hasPreviousPage={data.pendingRequests.hasPreviousPage}
                  hasNextPage={data.pendingRequests.hasNextPage}
                  pageParam="pendingPage"
                  filters={data.filters}
                />
              }
            />

            <LeaveSection
              title="Recently Reviewed Requests"
              description="Approved and rejected requests across the organization."
              emptyText={
                hasAppliedFilters(data.filters)
                  ? "No leave requests match the selected filters."
                  : "No recently reviewed requests found."
              }
              rows={data.reviewedRequests.rows}
              hrefForRow={(request) => `/admin/leave/${request.id}`}
              showEmployee
              pagination={
                <Pagination
                  page={data.reviewedRequests.page}
                  totalPages={data.reviewedRequests.totalPages}
                  hasPreviousPage={data.reviewedRequests.hasPreviousPage}
                  hasNextPage={data.reviewedRequests.hasNextPage}
                  pageParam="reviewedPage"
                  filters={data.filters}
                />
              }
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

async function getCachedLeaveListData(
  user: CurrentUser,
  filters: LeaveListFilters,
) {
  return unstable_cache(
    async () => getLeaveListData(user, filters),
    [
      "leave-list",
      String(user.organizationId),
      String(user.id),
      stableLeaveFiltersKey(filters),
    ],
    {
      revalidate: 30,
      tags: [
        `leave:${user.organizationId}`,
        `leave:${user.organizationId}:${user.id}`,
      ],
    },
  )();
}

function stableLeaveFiltersKey(filters: LeaveListFilters) {
  return JSON.stringify({
    status: filters.status ?? null,
    type: filters.type ?? null,
    departmentId: filters.departmentId ?? null,
    employeeId: filters.employeeId ?? null,
    search: filters.search ?? null,
    myPage: filters.myPage ?? 1,
    pendingPage: filters.pendingPage ?? 1,
    reviewedPage: filters.reviewedPage ?? 1,
  });
}

function LeaveSection({
  title,
  description,
  emptyText,
  rows,
  hrefForRow,
  showEmployee,
  pagination,
}: {
  title: string;
  description: string;
  emptyText: string;
  rows: LeaveRow[];
  hrefForRow: (request: LeaveRow) => string;
  showEmployee: boolean;
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
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.9fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
            <span>{showEmployee ? "Employee" : "Request"}</span>
            <span>Department</span>
            <span>Type</span>
            <span>Status</span>
            <span>Date Range</span>
            <span>Review</span>
          </div>
          <div className="divide-y divide-slate-200">
            {rows.map((request) => (
              <LeaveRow
                key={request.id}
                request={request}
                href={hrefForRow(request)}
                showEmployee={showEmployee}
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

function LeaveRow({
  request,
  href,
  showEmployee,
}: {
  request: LeaveRow;
  href: string;
  showEmployee: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.2fr_1fr_1fr_0.9fr_1fr_1fr] lg:items-center"
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-950">
          {showEmployee ? request.employeeName : formatType(request.type)}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
          {request.reason || "No reason provided."}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Submitted {formatDateTime(request.createdAt)}
        </p>
      </div>

      <MobileLabel label="Department">
        <span className="text-sm text-slate-700">{request.departmentName}</span>
      </MobileLabel>

      <MobileLabel label="Type">
        <span className="text-sm text-slate-700">{formatType(request.type)}</span>
      </MobileLabel>

      <MobileLabel label="Status">
        <Badge tone={statusTone(request.status)}>{formatStatus(request.status)}</Badge>
      </MobileLabel>

      <MobileLabel label="Date Range">
        <span className="text-sm text-slate-700">
          {formatDate(request.startDate)} - {formatDate(request.endDate)}
        </span>
      </MobileLabel>

      <MobileLabel label="Review">
        <div className="text-sm text-slate-700">
          {request.reviewedByName ? (
            <>
              <span>{request.reviewedByName}</span>
              {request.reviewedAt ? (
                <span className="block text-xs text-slate-500">
                  {formatDateTime(request.reviewedAt)}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-slate-500">Not reviewed</span>
          )}
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
  pageParam: "myPage" | "pendingPage" | "reviewedPage";
  filters: LeaveListFilters;
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
  tone: "danger" | "success" | "warning";
}) {
  const classes = {
    danger: "border-red-200 bg-red-50 text-red-700",
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

function parseFilters(params: SearchParams): LeaveListFilters {
  const status = firstParam(params.status);
  const type = firstParam(params.type);

  return {
    status: isLeaveStatus(status) ? status : undefined,
    type: isLeaveType(type) ? type : undefined,
    departmentId: positiveInteger(firstParam(params.departmentId)),
    employeeId: positiveInteger(firstParam(params.employeeId)),
    search: cleanSearch(firstParam(params.search)),
    myPage: positiveInteger(firstParam(params.myPage)) ?? 1,
    pendingPage: positiveInteger(firstParam(params.pendingPage)) ?? 1,
    reviewedPage: positiveInteger(firstParam(params.reviewedPage)) ?? 1,
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

function isLeaveStatus(
  value: string | undefined,
): value is (typeof leaveRequestStatuses)[number] {
  return leaveRequestStatuses.includes(
    value as (typeof leaveRequestStatuses)[number],
  );
}

function isLeaveType(
  value: string | undefined,
): value is (typeof leaveRequestTypes)[number] {
  return leaveRequestTypes.includes(value as (typeof leaveRequestTypes)[number]);
}

function hasAppliedFilters(filters: LeaveListFilters) {
  return Boolean(
    filters.status ||
      filters.type ||
      filters.departmentId ||
      filters.employeeId ||
      filters.search,
  );
}

function buildPageHref(
  filters: LeaveListFilters,
  pageParam: "myPage" | "pendingPage" | "reviewedPage",
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.departmentId) params.set("departmentId", String(filters.departmentId));
  if (filters.employeeId) params.set("employeeId", String(filters.employeeId));
  if (filters.search) params.set("search", filters.search);
  if (filters.myPage && filters.myPage > 1 && pageParam !== "myPage") {
    params.set("myPage", String(filters.myPage));
  }
  if (
    filters.pendingPage &&
    filters.pendingPage > 1 &&
    pageParam !== "pendingPage"
  ) {
    params.set("pendingPage", String(filters.pendingPage));
  }
  if (
    filters.reviewedPage &&
    filters.reviewedPage > 1 &&
    pageParam !== "reviewedPage"
  ) {
    params.set("reviewedPage", String(filters.reviewedPage));
  }
  if (page > 1) params.set(pageParam, String(page));

  const query = params.toString();
  return query ? `/leave?${query}` : "/leave";
}

function statusTone(status: string) {
  if (status === "approved") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  return "warning";
}

function formatStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatType(value: string) {
  const labels: Record<string, string> = {
    sick: "Sick Leave",
    vacation: "Vacation Leave",
    unpaid: "Unpaid Leave",
    remote: "Remote Work Day",
    personal: "Personal Leave",
    training: "Training Leave",
  };

  return labels[value] ?? value;
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
  }).format(value instanceof Date ? value : new Date(value));
}

async function requireLeaveUser() {
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
