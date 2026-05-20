import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { getLeaveRequestDetails } from "@/modules/leave/services/leave-list-service";

export const metadata = {
  title: "Leave Request | Leaves | WorkHub",
};

export default async function LeaveDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireLeaveUser();
  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    notFound();
  }

  const request = await getLeaveRequestDetails(user, requestId, "self");

  if (!request) {
    notFound();
  }

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
          My Leave Request
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
          {formatType(request.type)}
        </h1>
        <DetailsGrid request={request} />
      </div>
    </main>
  );
}

function DetailsGrid({
  request,
}: {
  request: NonNullable<Awaited<ReturnType<typeof getLeaveRequestDetails>>>;
}) {
  return (
    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
      <Detail label="Employee" value={request.employeeName} />
      <Detail label="Department" value={request.departmentName} />
      <Detail label="Status" value={formatStatus(request.status)} />
      <Detail
        label="Date Range"
        value={`${formatDate(request.startDate)} - ${formatDate(request.endDate)}`}
      />
      <Detail label="Submitted" value={formatDateTime(request.createdAt)} />
      <Detail
        label="Reviewed By"
        value={request.reviewedByName ?? "Not reviewed"}
      />
      <div className="sm:col-span-2">
        <Detail label="Reason" value={request.reason ?? "No reason provided."} />
      </div>
      <div className="sm:col-span-2">
        <Detail
          label="Review Comment"
          value={request.reviewComment ?? "No review comment."}
        />
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
