"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { verifyCsrfToken } from "@/modules/auth/services/csrf-service";
import {
  createShift,
  shiftColors,
  shiftStatuses,
  updateShift,
  type ShiftColor,
  type ShiftStatus,
} from "../services/shift-list-service";

export async function createShiftAction(formData: FormData) {
  const user = await requireActionUser();
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!(await verifyCsrfToken(csrfToken, "shift.create"))) {
    redirect(`/shifts/new?${buildShiftFormQuery(formData, "session-expired")}`);
  }

  const input = parseShiftForm(formData);

  if (!input.ok) {
    redirect(`/shifts/new?${buildShiftFormQuery(formData, input.error)}`);
  }

  const result = await createShift(user, input.value);

  if (!result.ok || !("shiftId" in result)) {
    redirect(
      `/shifts/new?${buildShiftFormQuery(formData, resultError(result))}`,
    );
  }

  revalidateShiftCaches(user);
  redirect("/shifts");
}

export async function updateShiftAction(formData: FormData) {
  const user = await requireActionUser();
  const shiftId = Number(formData.get("shiftId"));

  if (!Number.isInteger(shiftId) || shiftId <= 0) {
    redirect("/shifts");
  }

  const csrfToken = String(formData.get("csrfToken") ?? "");
  const editPath = `${safeDetailHrefPrefix(formData)}/${shiftId}/edit`;

  if (!(await verifyCsrfToken(csrfToken, "shift.update"))) {
    redirect(`${editPath}?${buildShiftFormQuery(formData, "session-expired")}`);
  }

  const input = parseShiftForm(formData);

  if (!input.ok) {
    redirect(`${editPath}?${buildShiftFormQuery(formData, input.error)}`);
  }

  const result = await updateShift(user, {
    shiftId,
    ...input.value,
  });

  if (!result.ok || !("shiftId" in result)) {
    redirect(
      `${editPath}?${buildShiftFormQuery(formData, resultError(result))}`,
    );
  }

  revalidateShiftCaches(user);
  redirect("/shifts");
}

function parseShiftForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const departmentId = Number(formData.get("departmentId"));
  const startTime = parseDateTimeParts(formData, "start");
  const endTime = parseDateTimeParts(formData, "end");
  const location = String(formData.get("location") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const assignedUserIds = Array.from(
    new Set(
      formData
        .getAll("assignedUserIds")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );

  if (!title || title.length > 180) {
    return { ok: false, error: "invalid-title" } as const;
  }

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return { ok: false, error: "invalid-department" } as const;
  }

  if (!startTime || !endTime || endTime <= startTime) {
    return { ok: false, error: "invalid-time" } as const;
  }

  if (!shiftStatuses.includes(status as ShiftStatus)) {
    return { ok: false, error: "invalid-status" } as const;
  }

  if (location.length > 255) {
    return { ok: false, error: "invalid-location" } as const;
  }

  if (!shiftColors.includes(color as ShiftColor)) {
    return { ok: false, error: "invalid-color" } as const;
  }

  return {
    ok: true,
    value: {
      title,
      departmentId,
      startTime,
      endTime,
      location: location || null,
      color: color as ShiftColor,
      notes: notes || null,
      status: status as ShiftStatus,
      assignedUserIds,
    },
  } as const;
}

function parseDateTimeParts(formData: FormData, prefix: "end" | "start") {
  const date = String(formData.get(`${prefix}Date`) ?? "");
  const hour = String(formData.get(`${prefix}Hour`) ?? "");
  const minute = String(formData.get(`${prefix}Minute`) ?? "");

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^(?:[01]\d|2[0-3])$/.test(hour) ||
    !/^[0-5]\d$/.test(minute)
  ) {
    return null;
  }

  const parsed = new Date(`${date}T${hour}:${minute}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function revalidateShiftCaches(user: Awaited<ReturnType<typeof requireCurrentUser>>) {
  revalidatePath("/shifts");
  revalidatePath("/dashboard");
  updateTag(`shifts:${user.organizationId}`);
  updateTag(`shifts:${user.organizationId}:${user.id}`);
  updateTag(`dashboard:${user.organizationId}`);
  updateTag(`dashboard:${user.organizationId}:${user.id}`);
}

function resultError(result: unknown) {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }

  return "forbidden";
}

function buildShiftFormQuery(formData: FormData, error: string) {
  const params = new URLSearchParams();
  const singleValueFields = [
    "title",
    "departmentId",
    "status",
    "startDate",
    "startHour",
    "startMinute",
    "endDate",
    "endHour",
    "endMinute",
    "location",
    "color",
    "notes",
  ];

  params.set("error", error);

  for (const field of singleValueFields) {
    const value = String(formData.get(field) ?? "");

    if (value) {
      params.set(field, value);
    }
  }

  for (const userId of formData.getAll("assignedUserIds")) {
    params.append("assignedUserIds", String(userId));
  }

  return params.toString();
}

function safeDetailHrefPrefix(formData: FormData) {
  const value = String(formData.get("detailHrefPrefix") ?? "");
  return value === "/manager/shifts" ? "/manager/shifts" : "/shifts";
}

async function requireActionUser() {
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
