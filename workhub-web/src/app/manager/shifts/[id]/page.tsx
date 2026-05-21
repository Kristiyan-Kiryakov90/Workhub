import { notFound, redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { getShiftDetails } from "@/modules/shifts/services/shift-list-service";
import { ShiftDetailsCard } from "@/app/shifts/shift-details-card";

export const metadata = {
  title: "Department Shift Details | WorkHub",
};

export default async function ManagerShiftDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireManagerShiftDetailsUser();
  const { id } = await params;
  const shiftId = Number(id);

  if (!Number.isInteger(shiftId) || shiftId <= 0) {
    notFound();
  }

  const shift = await getShiftDetails(user, shiftId, "manager");

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
      editHref={`/manager/shifts/${shift.id}/edit`}
    />
  );
}

async function requireManagerShiftDetailsUser() {
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
