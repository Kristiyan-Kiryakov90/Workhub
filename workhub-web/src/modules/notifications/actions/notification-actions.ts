"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notification-service";

export async function markNotificationAsReadAction(formData: FormData) {
  const user = await requireActionUser();
  const notificationId = Number(formData.get("notificationId"));

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    redirect("/notifications");
  }

  await markNotificationAsRead(user, notificationId);
  revalidateNotifications(user);
  redirect(returnPath(formData));
}

export async function openNotificationAction(formData: FormData) {
  const user = await requireActionUser();
  const notificationId = Number(formData.get("notificationId"));

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    redirect("/notifications");
  }

  const notification = await markNotificationAsRead(user, notificationId);
  revalidateNotifications(user);
  redirect(safeActionUrl(notification?.actionUrl) ?? returnPath(formData));
}

export async function markAllNotificationsAsReadAction(formData: FormData) {
  const user = await requireActionUser();

  await markAllNotificationsAsRead(user);
  revalidateNotifications(user);
  redirect(returnPath(formData));
}

function revalidateNotifications(
  user: Awaited<ReturnType<typeof requireCurrentUser>>,
) {
  revalidatePath("/notifications");
  revalidatePath("/");
  updateTag(`notifications:${user.organizationId}:${user.id}`);
}

function returnPath(formData: FormData) {
  const value = String(formData.get("returnPath") ?? "");

  if (value.startsWith("/notifications")) {
    return value;
  }

  return "/notifications";
}

function safeActionUrl(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
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
