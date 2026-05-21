import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { updateShiftAction } from "@/modules/shifts/actions/shift-actions";
import {
  getShiftDetails,
  getShiftFormData,
} from "@/modules/shifts/services/shift-list-service";
import { ShiftForm, type ShiftFormDraft } from "@/app/shifts/shift-form";

export const metadata = {
  title: "Edit Department Shift | WorkHub",
};

export default async function EditManagerShiftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireEditShiftUser();
  const { id } = await params;
  const query = await searchParams;
  const shiftId = Number(id);

  if (!Number.isInteger(shiftId) || shiftId <= 0) {
    notFound();
  }

  const [formData, shift] = await Promise.all([
    getShiftFormData(user),
    getShiftDetails(user, shiftId, "manager"),
  ]);

  if (!shift || !formData.canManageShift) {
    notFound();
  }

  const csrfToken = await createCsrfToken("shift.update");
  const error = firstParam(query.error);
  const draft = parseShiftFormDraft(query);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/manager/shifts/${shift.id}`}
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to shift
      </Link>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Shifts
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            Edit shift
          </h1>
        </div>

        <ShiftForm
          action={updateShiftAction}
          csrfToken={csrfToken}
          formData={formData}
          shift={shift}
          error={error}
          detailHrefPrefix="/manager/shifts"
          draft={draft}
        />
      </div>
    </section>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

async function requireEditShiftUser() {
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
