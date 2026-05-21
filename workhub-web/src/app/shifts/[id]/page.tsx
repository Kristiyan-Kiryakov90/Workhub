import { notFound, redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { getShiftDetails } from "@/modules/shifts/services/shift-list-service";
import { ShiftDetailsCard } from "../shift-details-card";

export const metadata = {
  title: "Shift Details | WorkHub",
};

export default async function ShiftDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireShiftDetailsUser();
  const { id } = await params;
  const shiftId = Number(id);

  if (!Number.isInteger(shiftId) || shiftId <= 0) {
    notFound();
  }

  const [selfShift, adminShift] = await Promise.all([
    getShiftDetails(user, shiftId, "self"),
    getShiftDetails(user, shiftId, "admin"),
  ]);
  const shift = selfShift ?? adminShift;

  if (!shift) {
    notFound();
  }

  return (
    <ShiftDetailsCard
      backHref="/shifts"
      title={shift.title}
      departmentName={shift.departmentName}
      startTime={shift.startTime}
      endTime={shift.endTime}
      location={shift.location}
      status={shift.status}
      notes={shift.notes}
      assignedEmployees={shift.assignedEmployees}
      editHref={adminShift ? `/shifts/${shift.id}/edit` : undefined}
    />
  );
}

async function requireShiftDetailsUser() {
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
