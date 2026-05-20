import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { createLeaveRequestAction } from "@/modules/leave/actions/leave-actions";
import {
  getCreateLeaveFormData,
  leaveRequestTypes,
} from "@/modules/leave/services/leave-list-service";
import { CreateLeaveButton } from "./create-leave-button";

export const metadata = {
  title: "Request Leave | Leaves | WorkHub",
};

export default async function NewLeaveRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireLeaveUser();
  const params = await searchParams;
  const [formData, csrfToken] = await Promise.all([
    getCreateLeaveFormData(user),
    createCsrfToken("leave.create"),
  ]);
  const error = firstParam(params.error);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/leave"
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to Leaves
      </Link>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Leaves
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            New leave request
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Submit a leave request for review in {user.organizationName}.
          </p>
        </div>

        {error ? (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {errorMessage(error)}
          </p>
        ) : null}

        {formData.departmentOptions.length > 0 ? (
          <form action={createLeaveRequestAction} className="mt-6 space-y-5">
            <input type="hidden" name="csrfToken" value={csrfToken} />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Department" name="departmentId" required>
                <option value="">Choose department</option>
                {formData.departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </SelectField>

              <SelectField label="Leave Type" name="type" required>
                <option value="">Choose type</option>
                {leaveRequestTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatType(type)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Start Date
                </span>
                <input
                  name="startDate"
                  type="date"
                  required
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  End Date
                </span>
                <input
                  name="endDate"
                  type="date"
                  required
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Reason
              </span>
              <textarea
                name="reason"
                rows={5}
                maxLength={1000}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                placeholder="Optional context for reviewers"
              />
            </label>

            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
              <CreateLeaveButton />
              <Link
                href="/leave"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            You need to belong to a department before you can request leave.
          </p>
        )}
      </div>
    </main>
  );
}

function SelectField({
  label,
  name,
  required = false,
  children,
}: {
  label: string;
  name: string;
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

function errorMessage(error: string) {
  if (error === "session-expired") {
    return "Your session expired. Refresh the page and try again.";
  }

  if (error === "invalid-department") {
    return "Choose a valid department.";
  }

  if (error === "invalid-type") {
    return "Choose a valid leave type.";
  }

  if (error === "invalid-dates" || error === "invalid-range") {
    return "Choose a valid date range.";
  }

  if (error === "invalid-reason") {
    return "Keep the reason under 1000 characters.";
  }

  return "The leave request could not be created.";
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
