import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { createShiftAction } from "@/modules/shifts/actions/shift-actions";
import { getShiftFormData } from "@/modules/shifts/services/shift-list-service";
import { ShiftForm, type ShiftFormDraft } from "../shift-form";

export const metadata = {
  title: "Create Shift | WorkHub",
};

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireNewShiftUser();
  const params = await searchParams;
  const formData = await getShiftFormData(user);
  const defaultDate = cleanDate(firstParam(params.date));

  if (!formData.canCreateShift) {
    redirect("/shifts");
  }

  const csrfToken = await createCsrfToken("shift.create");
  const error = firstParam(params.error);
  const draft = parseShiftFormDraft(params);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/shifts"
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to shifts
      </Link>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Shifts
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            Create shift
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Schedule a shift in an accessible department for {user.organizationName}.
          </p>
        </div>

        <ShiftForm
          action={createShiftAction}
          csrfToken={csrfToken}
          formData={formData}
          error={error}
          detailHrefPrefix={
            formData.isDepartmentManager ? "/manager/shifts" : "/shifts"
          }
          defaultDate={defaultDate}
          draft={draft}
        />
      </div>
    </section>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function parseShiftFormDraft(
  params: Record<string, string | string[] | undefined>,
): ShiftFormDraft | undefined {
  if (!firstParam(params.error)) {
    return undefined;
  }

  return {
    title: firstParam(params.title),
    departmentId: firstParam(params.departmentId),
    status: firstParam(params.status),
    startDate: firstParam(params.startDate),
    startHour: firstParam(params.startHour),
    startMinute: firstParam(params.startMinute),
    endDate: firstParam(params.endDate),
    endHour: firstParam(params.endHour),
    endMinute: firstParam(params.endMinute),
    location: firstParam(params.location),
    color: firstParam(params.color),
    notes: firstParam(params.notes),
    assignedUserIds: valuesParam(params.assignedUserIds)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  };
}

function valuesParam(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function requireNewShiftUser() {
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
