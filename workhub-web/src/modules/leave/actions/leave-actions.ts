"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { verifyCsrfToken } from "@/modules/auth/services/csrf-service";
import {
  createLeaveRequest,
  leaveRequestTypes,
  reviewLeaveRequest,
  type LeaveRequestType,
} from "../services/leave-list-service";

export async function createLeaveRequestAction(formData: FormData) {
  const user = await requireActionUser();
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!(await verifyCsrfToken(csrfToken, "leave.create"))) {
    redirect("/leave/new?error=session-expired");
  }

  const departmentId = Number(formData.get("departmentId"));
  const type = String(formData.get("type") ?? "");
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    redirect("/leave/new?error=invalid-department");
  }

  if (!isLeaveRequestType(type)) {
    redirect("/leave/new?error=invalid-type");
  }

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    redirect("/leave/new?error=invalid-dates");
  }

  if (endDate < startDate) {
    redirect("/leave/new?error=invalid-range");
  }

  if (reason.length > 1000) {
    redirect("/leave/new?error=invalid-reason");
  }

  const result = await createLeaveRequest(user, {
    departmentId,
    type,
    startDate,
    endDate,
    reason: reason || null,
  });

  if (!result.ok) {
    redirect("/leave/new?error=forbidden");
  }

  revalidatePath("/leave");
  revalidateLeaveCaches(user);
  redirect("/leave");
}

export async function reviewLeaveRequestAction(formData: FormData) {
  const user = await requireActionUser();
  const requestId = Number(formData.get("requestId"));
  const scope = String(formData.get("scope") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewComment = String(formData.get("reviewComment") ?? "").trim();
  const csrfToken = String(formData.get("csrfToken") ?? "");

  if (!Number.isInteger(requestId) || requestId <= 0) {
    redirect("/leave");
  }

  const returnPath =
    scope === "admin" ? `/admin/leave/${requestId}` : `/manager/leave/${requestId}`;

  if (!(await verifyCsrfToken(csrfToken, "leave.review"))) {
    redirect(`${returnPath}?error=session-expired`);
  }

  if (scope !== "manager" && scope !== "admin") {
    redirect("/leave");
  }

  if (decision !== "approved" && decision !== "rejected") {
    redirect(`${returnPath}?error=invalid-decision`);
  }

  if (reviewComment.length > 1000) {
    redirect(`${returnPath}?error=invalid-comment`);
  }

  const result = await reviewLeaveRequest(user, {
    requestId,
    scope,
    decision,
    reviewComment: reviewComment || null,
  });

  if (!result.ok) {
    redirect(`${returnPath}?error=forbidden`);
  }

  revalidatePath("/leave");
  revalidatePath(returnPath);
  revalidateLeaveCaches(user);
  redirect(returnPath);
}

function revalidateLeaveCaches(user: Awaited<ReturnType<typeof requireCurrentUser>>) {
  updateTag(`leave:${user.organizationId}`);
  updateTag(`leave:${user.organizationId}:${user.id}`);
  updateTag(`dashboard:${user.organizationId}`);
  updateTag(`dashboard:${user.organizationId}:${user.id}`);
}

function isLeaveRequestType(value: string): value is LeaveRequestType {
  return leaveRequestTypes.includes(value as LeaveRequestType);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
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
