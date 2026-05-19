import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  departmentMembers,
  departments,
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from "@/db/schema";
import type { PermissionKey } from "@/modules/permissions/constants";
import type { CurrentUser } from "../types";
import { getCurrentUser } from "./session-service";

export class AuthorizationError extends Error {
  constructor(
    readonly code: "unauthenticated" | "forbidden" | "department_forbidden",
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError("unauthenticated", "Authentication is required.");
  }

  return user;
}

export async function getCurrentUserPermissions(user: CurrentUser) {
  const rows = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.organizationId, user.organizationId),
        eq(roles.organizationId, user.organizationId),
      ),
    );

  return new Set(rows.map((row) => row.key as PermissionKey));
}

export async function userHasPermission(
  user: CurrentUser,
  permission: PermissionKey,
) {
  const permissions = await getCurrentUserPermissions(user);

  return permissions.has(permission);
}

export async function requirePermission(permission: PermissionKey) {
  const user = await requireCurrentUser();

  if (!(await userHasPermission(user, permission))) {
    throw new AuthorizationError(
      "forbidden",
      `Missing required permission: ${permission}`,
    );
  }

  return user;
}

export async function userHasRole(user: CurrentUser, roleName: string) {
  const [role] = await db
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.organizationId, user.organizationId),
        eq(roles.organizationId, user.organizationId),
        eq(roles.name, roleName),
      ),
    )
    .limit(1);

  return Boolean(role);
}

export async function userCanAccessDepartment(
  user: CurrentUser,
  departmentId: number,
  options: { requireManager?: boolean } = {},
) {
  if (await userHasRole(user, "Main Admin")) {
    return true;
  }

  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.id, departmentId),
        eq(departments.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!department) {
    return false;
  }

  const conditions = [
    eq(departmentMembers.userId, user.id),
    eq(departmentMembers.departmentId, departmentId),
    eq(departmentMembers.organizationId, user.organizationId),
  ];

  if (options.requireManager) {
    conditions.push(eq(departmentMembers.isManager, true));
  }

  const [membership] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .where(and(...conditions))
    .limit(1);

  return Boolean(membership);
}

export async function requireDepartmentAccess(
  departmentId: number,
  options: { requireManager?: boolean } = {},
) {
  const user = await requireCurrentUser();

  if (!(await userCanAccessDepartment(user, departmentId, options))) {
    throw new AuthorizationError(
      "department_forbidden",
      "You do not have access to this department.",
    );
  }

  return user;
}
