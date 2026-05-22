"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { clearSession, createSession } from "@/modules/auth/services/session-service";
import {
  acceptInvitation,
  cancelInvitation,
  changeOwnPassword,
  createInvitation,
  createRole,
  deleteAdminUser,
  deleteOwnProfile,
  ProfileError,
  updateAdminUser,
  updateOwnProfile,
  updateRole,
} from "../services/profile-service";

export type ProfileActionState = {
  error?: string;
  success?: string;
  inviteLink?: string;
};

export async function updateOwnProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireCurrentUser();
    await updateOwnProfile(user, {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });
    revalidatePath("/profile");
    return { success: "Profile updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function changeOwnPasswordAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireCurrentUser();
    await changeOwnPassword(user, {
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });
    return { success: "Password changed." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteOwnProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireCurrentUser();
    await deleteOwnProfile(user, String(formData.get("confirmation") ?? ""));
    await clearSession();
  } catch (error) {
    return actionError(error);
  }

  redirect("/");
}

export async function updateAdminUserAction(userId: number, formData: FormData) {
  const user = await requireCurrentUser();
  await updateAdminUser(user, userId, {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    roleId: Number(formData.get("roleId")),
    departmentAssignments: parseDepartmentAssignments(formData),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}`);
}

export async function deleteAdminUserAction(userId: number) {
  const user = await requireCurrentUser();
  await deleteAdminUser(user, userId);

  revalidatePath("/admin/users");

  if (user.id === userId) {
    await clearSession();
    redirect("/");
  }

  redirect("/admin/users");
}

export async function createRoleAction(formData: FormData) {
  const user = await requireCurrentUser();
  const roleId = await createRole(user, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    permissionIds: parseNumberList(formData.getAll("permissionIds")),
  });

  revalidatePath("/admin/roles");
  redirect(`/admin/roles/${roleId}`);
}

export async function updateRoleAction(roleId: number, formData: FormData) {
  const user = await requireCurrentUser();
  await updateRole(user, roleId, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    permissionIds: parseNumberList(formData.getAll("permissionIds")),
  });

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${roleId}`);
  redirect(`/admin/roles/${roleId}`);
}

export async function createInvitationAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await requireCurrentUser();
    const headerStore = await headers();
    const host = headerStore.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const inviteLink = await createInvitation(user, {
      email: String(formData.get("email") ?? ""),
      roleId: Number(formData.get("roleId")),
      departmentAssignments: parseDepartmentAssignments(formData),
      expiresAt: String(formData.get("expiresAt") ?? ""),
      origin: `${protocol}://${host}`,
    });

    revalidatePath("/admin/invitations");
    return { success: "Invitation created.", inviteLink };
  } catch (error) {
    return actionError(error);
  }
}

export async function cancelInvitationAction(invitationId: number) {
  const user = await requireCurrentUser();
  await cancelInvitation(user, invitationId);

  revalidatePath("/admin/invitations");
  redirect("/admin/invitations");
}

export async function acceptInvitationAction(
  token: string,
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const user = await acceptInvitation(token, {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });
    await createSession(user);
  } catch (error) {
    return actionError(error);
  }

  redirect("/dashboard");
}

function actionError(error: unknown): ProfileActionState {
  if (error instanceof ProfileError || error instanceof AuthorizationError) {
    return { error: error.message };
  }

  console.error(error);
  return { error: "The request could not be completed. Try again." };
}

function parseNumberList(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
}

function parseDepartmentAssignments(formData: FormData): DepartmentAssignment[] {
  const departmentIds = parseNumberList(formData.getAll("departmentIds"));

  return departmentIds.map((departmentId) => ({
    departmentId,
    isManager: false,
  }));
}

type DepartmentAssignment = {
  departmentId: number;
  isManager: boolean;
};
