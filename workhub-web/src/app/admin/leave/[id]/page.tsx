import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { reviewLeaveRequestAction } from "@/modules/leave/actions/leave-actions";
import { getLeaveRequestDetails } from "@/modules/leave/services/leave-list-service";

export const metadata = {
  title: "Organization Leave Request | Leaves | WorkHub",
};

export default async function AdminLeaveDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireLeaveUser();
  const { id } = await params;
  const query = await searchParams;
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    notFound();
  }

  const request = await getLeaveRequestDetails(user, requestId, "admin");

  if (!request) {
    notFound();
  }

  const csrfToken =
    request.status === "pending" ? await createCsrfToken("leave.review") : "";
  const error = firstParam(query.error);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/leave"
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to Leaves
      </Link>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Organization Leave Request
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
          {request.employeeName} - {formatType(request.type)}
        </h1>
        <DetailsGrid request={request} />
        <ReviewPanel
          requestId={request.id}
          status={request.status}
          csrfToken={csrfToken}
          error={error}
          scope="admin"
        />
      </div>
    </main>
  );
}

function ReviewPanel({
  requestId,
  status,
  csrfToken,
  error,
  scope,
}: {
  requestId: number;
  status: string;
  csrfToken: string;
  error: string | undefined;
  scope: "manager" | "admin";
}) {
  if (status !== "pending") {
    return null;
  }

  return (
    <form
      action={reviewLeaveRequestAction}
      className="mt-6 border-t border-slate-200 pt-6"
    >
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="csrfToken" value={csrfToken} />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Review Comment
        </span>
        <textarea
          name="reviewComment"
          rows={4}
          maxLength={1000}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          placeholder="Optional decision note"
        />
      </label>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {errorMessage(error)}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="approved"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800"
        >
          Reject
        </button>
      </div>
    </form>
  );
}

function DetailsGrid({
  request,
}: {
  request: NonNullable<Awaited<ReturnType<typeof getLeaveRequestDetails>>>;
}) {
  return (
    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
      <Detail label="Employee" value={`${request.employeeName} (${request.employeeEmail})`} />
      <Detail label="Department" value={request.departmentName} />
      <Detail label="Status" value={formatStatus(request.status)} />
      <Detail
        label="Date Range"
        value={`${formatDate(request.startDate)} - ${formatDate(request.endDate)}`}
      />
      <Detail label="Submitted" value={formatDateTime(request.createdAt)} />
      <Detail label="Reviewed By" value={request.reviewedByName ?? "Not reviewed"} />
      <div className="sm:col-span-2">
        <Detail label="Reason" value={request.reason ?? "No reason provided."} />
      </div>
      <div className="sm:col-span-2">
        <Detail label="Review Comment" value={request.reviewComment ?? "No review comment."} />
      </div>
    </dl>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm text-slate-950">{value}</dd>
    </div>
  );
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function errorMessage(error: string) {
  if (error === "session-expired") {
    return "Your session expired. Refresh the page and try again.";
  }

  if (error === "invalid-decision") {
    return "Choose approve or reject.";
  }

  if (error === "invalid-comment") {
    return "Keep the review comment under 1000 characters.";
  }

  if (error === "forbidden") {
    return "You do not have permission to review this leave request.";
  }

  return "The leave request could not be reviewed.";
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
