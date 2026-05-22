import { compare, hash } from "bcryptjs";
import { and, asc, count, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  departmentMembers,
  departments,
  invitations,
  organizations,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/db/schema";
import type { PermissionKey } from "@/modules/permissions/constants";
import type { CurrentUser } from "@/modules/auth/types";
import { userHasRole } from "@/modules/auth/services/authorization-service";

export class ProfileError extends Error {
  constructor(
    readonly code:
      | "forbidden"
      | "not_found"
      | "validation"
      | "current_password"
      | "last_main_admin"
      | "invite_invalid",
    message: string,
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

export type DepartmentAssignment = {
  departmentId: number;
  isManager: boolean;
};

export async function getOwnProfileData(user: CurrentUser) {
  const [profile] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
      organizationName: organizations.name,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(and(eq(users.id, user.id), eq(users.organizationId, user.organizationId)))
    .limit(1);

  if (!profile) {
    throw new ProfileError("not_found", "Profile not found.");
  }

  const [roleRows, departmentRows, canSelfDelete] = await Promise.all([
    getUserRoles(user.organizationId, user.id),
    getUserDepartments(user.organizationId, user.id),
    canDeleteUser(user.organizationId, user.id),
  ]);

  return {
    profile,
    roles: roleRows,
    departments: departmentRows,
    canSelfDelete,
  };
}

export async function updateOwnProfile(
  user: CurrentUser,
  fields: { name: string; phone: string },
) {
  const name = fields.name.trim();
  const phone = fields.phone.trim() || null;

  if (!name) {
    throw new ProfileError("validation", "Full name is required.");
  }

  await db
    .update(users)
    .set({ name, phone, updatedAt: new Date() })
    .where(and(eq(users.id, user.id), eq(users.organizationId, user.organizationId)));
}

export async function changeOwnPassword(
  user: CurrentUser,
  fields: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
) {
  validatePassword(fields.newPassword);

  if (fields.newPassword !== fields.confirmPassword) {
    throw new ProfileError("validation", "New password and confirmation must match.");
  }

  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.id, user.id), eq(users.organizationId, user.organizationId)))
    .limit(1);

  if (!row || !(await compare(fields.currentPassword, row.passwordHash))) {
    throw new ProfileError("current_password", "Current password is incorrect.");
  }

  await db
    .update(users)
    .set({
      passwordHash: await hash(fields.newPassword, 12),
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, user.id), eq(users.organizationId, user.organizationId)));
}

export async function deleteOwnProfile(user: CurrentUser, confirmation: string) {
  if (confirmation !== "DELETE") {
    throw new ProfileError("validation", "Type DELETE to confirm profile deletion.");
  }

  if (!(await canDeleteUser(user.organizationId, user.id))) {
    throw new ProfileError(
      "last_main_admin",
      "You cannot delete your profile because you are the only Main Admin of this organization.",
    );
  }

  await db
    .delete(users)
    .where(and(eq(users.id, user.id), eq(users.organizationId, user.organizationId)));
}

export async function getAdminUsers(user: CurrentUser) {
  await requireMainAdmin(user);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.organizationId, user.organizationId), ne(users.id, user.id)))
    .orderBy(asc(users.name));
  const userIds = rows.map((row) => row.id);

  const [rolesByUserId, departmentsByUserId, permissionsByUserId] =
    await Promise.all([
      getUsersRoles(user.organizationId, userIds),
      getUsersDepartments(user.organizationId, userIds),
      getUsersPermissions(user.organizationId, userIds),
    ]);

  return rows.map((row) => ({
      ...row,
      roles: rolesByUserId.get(row.id) ?? [],
      departments: departmentsByUserId.get(row.id) ?? [],
      permissions: permissionsByUserId.get(row.id) ?? [],
    }));
}

export async function getAdminUser(user: CurrentUser, userId: number) {
  await requireMainAdmin(user);
  ensureNotSelfAdminTarget(user, userId);

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
      organizationName: organizations.name,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(and(eq(users.id, userId), eq(users.organizationId, user.organizationId)))
    .limit(1);

  if (!row) {
    throw new ProfileError("not_found", "User not found.");
  }

  return {
    user: row,
    roles: await getUserRoles(user.organizationId, userId),
    departments: await getUserDepartments(user.organizationId, userId),
    permissions: await getUserPermissions(user.organizationId, userId),
  };
}

export async function getAdminUserEditData(user: CurrentUser, userId: number) {
  const details = await getAdminUser(user, userId);
  const [roleOptions, departmentOptions] = await Promise.all([
    db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.organizationId, user.organizationId))
      .orderBy(asc(roles.name)),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.organizationId, user.organizationId))
      .orderBy(asc(departments.name)),
  ]);

  return { ...details, roleOptions, departmentOptions };
}

export async function updateAdminUser(
  actor: CurrentUser,
  targetUserId: number,
  fields: {
    name: string;
    phone: string;
    roleId: number;
    departmentAssignments: DepartmentAssignment[];
  },
) {
  await requireMainAdmin(actor);
  ensureNotSelfAdminTarget(actor, targetUserId);

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, targetUserId), eq(users.organizationId, actor.organizationId)))
    .limit(1);

  if (!target) {
    throw new ProfileError("not_found", "User not found.");
  }

  const name = fields.name.trim();
  const phone = fields.phone.trim() || null;

  if (!name) {
    throw new ProfileError("validation", "Full name is required.");
  }

  const selectedRoleNames = await assertOrganizationRoles(
    actor.organizationId,
    [fields.roleId],
  );
  await assertOrganizationDepartments(
    actor.organizationId,
    fields.departmentAssignments.map((assignment) => assignment.departmentId),
  );
  const departmentAssignments = applyManagerRoleToDepartments(
    fields.departmentAssignments,
    selectedRoleNames,
  );

  await db
    .update(users)
    .set({ name, phone, updatedAt: new Date() })
    .where(and(eq(users.id, targetUserId), eq(users.organizationId, actor.organizationId)));

  await db
    .delete(userRoles)
    .where(
      and(
        eq(userRoles.userId, targetUserId),
        eq(userRoles.organizationId, actor.organizationId),
      ),
    );

  await db.insert(userRoles).values({
    organizationId: actor.organizationId,
    userId: targetUserId,
    roleId: fields.roleId,
  });

  await db
    .delete(departmentMembers)
    .where(
      and(
        eq(departmentMembers.userId, targetUserId),
        eq(departmentMembers.organizationId, actor.organizationId),
      ),
    );

  if (departmentAssignments.length > 0) {
    await db.insert(departmentMembers).values(
      departmentAssignments.map((assignment) => ({
        organizationId: actor.organizationId,
        userId: targetUserId,
        departmentId: assignment.departmentId,
        isManager: assignment.isManager,
      })),
    );
  }
}

export async function deleteAdminUser(actor: CurrentUser, targetUserId: number) {
  await requireMainAdmin(actor);
  ensureNotSelfAdminTarget(actor, targetUserId);

  await db
    .delete(users)
    .where(and(eq(users.id, targetUserId), eq(users.organizationId, actor.organizationId)));
}

export async function getRolesAdminData(user: CurrentUser) {
  await requireMainAdmin(user);

  const roleRows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      createdAt: roles.createdAt,
    })
    .from(roles)
    .where(eq(roles.organizationId, user.organizationId))
    .orderBy(asc(roles.name));
  const permissionsByRoleId = await getRolesPermissions(
    roleRows.map((role) => role.id),
  );

  return roleRows.map((role) => ({
      ...role,
      permissions: permissionsByRoleId.get(role.id) ?? [],
    }));
}

export async function getRoleAdminData(user: CurrentUser, roleId: number) {
  await requireMainAdmin(user);

  const [role] = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      createdAt: roles.createdAt,
    })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, user.organizationId)))
    .limit(1);

  if (!role) {
    throw new ProfileError("not_found", "Role not found.");
  }

  return {
    role,
    permissions: await getRolePermissions(roleId),
    allPermissions: await db
      .select({ id: permissions.id, key: permissions.key })
      .from(permissions)
      .orderBy(asc(permissions.key)),
  };
}

export async function getRoleCreateData(user: CurrentUser) {
  await requireMainAdmin(user);

  return db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .orderBy(asc(permissions.key));
}

export async function createRole(
  user: CurrentUser,
  fields: { name: string; description: string; permissionIds: number[] },
) {
  await requireMainAdmin(user);

  const name = fields.name.trim();
  if (!name) {
    throw new ProfileError("validation", "Role name is required.");
  }

  await assertPermissionIds(fields.permissionIds);

  const [role] = await db
    .insert(roles)
    .values({
      organizationId: user.organizationId,
      name,
      description: fields.description.trim() || null,
    })
    .returning({ id: roles.id });

  if (fields.permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      fields.permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    );
  }

  return role.id;
}

export async function updateRole(
  user: CurrentUser,
  roleId: number,
  fields: { name: string; description: string; permissionIds: number[] },
) {
  await requireMainAdmin(user);
  await getRoleAdminData(user, roleId);

  const name = fields.name.trim();
  if (!name) {
    throw new ProfileError("validation", "Role name is required.");
  }

  await assertPermissionIds(fields.permissionIds);

  await db
    .update(roles)
    .set({
      name,
      description: fields.description.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, user.organizationId)));

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  if (fields.permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      fields.permissionIds.map((permissionId) => ({ roleId, permissionId })),
    );
  }
}

export async function getInvitationsAdminData(user: CurrentUser) {
  await requireMainAdmin(user);

  const [roleOptions, departmentOptions, invitationRows] = await Promise.all([
    db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.organizationId, user.organizationId))
      .orderBy(asc(roles.name)),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.organizationId, user.organizationId))
      .orderBy(asc(departments.name)),
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        roleName: roles.name,
        departmentAssignments: invitations.departmentAssignments,
      })
      .from(invitations)
      .innerJoin(roles, eq(invitations.roleId, roles.id))
      .where(eq(invitations.organizationId, user.organizationId))
      .orderBy(desc(invitations.createdAt)),
  ]);

  return {
    roleOptions,
    departmentOptions,
    invitations: invitationRows.map((invitation) => ({
      ...invitation,
      departmentAssignments: parseDepartmentAssignments(
        invitation.departmentAssignments,
      ),
    })),
  };
}

export async function createInvitation(
  user: CurrentUser,
  fields: {
    email: string;
    roleId: number;
    departmentAssignments: DepartmentAssignment[];
    expiresAt: string;
    origin: string;
  },
) {
  await requireMainAdmin(user);

  const email = fields.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new ProfileError("validation", "Enter a valid email address.");
  }

  const expiresAt = new Date(`${fields.expiresAt}T23:59:59`);
  if (!fields.expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new ProfileError("validation", "Expiration date must be in the future.");
  }

  const selectedRoleNames = await assertOrganizationRoles(user.organizationId, [
    fields.roleId,
  ]);
  await assertOrganizationDepartments(
    user.organizationId,
    fields.departmentAssignments.map((assignment) => assignment.departmentId),
  );
  const departmentAssignments = applyManagerRoleToDepartments(
    fields.departmentAssignments,
    selectedRoleNames,
  );

  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const tokenHash = await hashToken(token);

  await db.insert(invitations).values({
    organizationId: user.organizationId,
    email,
    tokenHash,
    roleId: fields.roleId,
    departmentAssignments: JSON.stringify(departmentAssignments),
    expiresAt,
    createdByUserId: user.id,
  });

  return `${fields.origin}/invite/${token}`;
}

export async function cancelInvitation(user: CurrentUser, invitationId: number) {
  await requireMainAdmin(user);

  await db
    .update(invitations)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.organizationId, user.organizationId),
        eq(invitations.status, "pending"),
      ),
    );
}

export async function getInvitationAcceptanceData(token: string) {
  const invitation = await getPendingInvitationByToken(token);

  return {
    organizationName: invitation.organizationName,
    email: invitation.email,
    expiresAt: invitation.expiresAt,
  };
}

export async function acceptInvitation(
  token: string,
  fields: {
    name: string;
    phone: string;
    password: string;
    confirmPassword: string;
  },
) {
  const invitation = await getPendingInvitationByToken(token);
  const name = fields.name.trim();

  if (!name) {
    throw new ProfileError("validation", "Full name is required.");
  }

  validatePassword(fields.password);
  if (fields.password !== fields.confirmPassword) {
    throw new ProfileError("validation", "Password and confirmation must match.");
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, invitation.email))
    .limit(1);

  if (existingUser) {
    throw new ProfileError("validation", "A user with this email already exists.");
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      organizationId: invitation.organizationId,
      email: invitation.email,
      name,
      phone: fields.phone.trim() || null,
      passwordHash: await hash(fields.password, 12),
    })
    .returning({
      id: users.id,
      organizationId: users.organizationId,
      email: users.email,
      name: users.name,
    });

  await db.insert(userRoles).values({
    organizationId: invitation.organizationId,
    userId: createdUser.id,
    roleId: invitation.roleId,
  });

  const departmentAssignments = parseDepartmentAssignments(
    invitation.departmentAssignments,
  );
  if (departmentAssignments.length > 0) {
    await db.insert(departmentMembers).values(
      departmentAssignments.map((assignment) => ({
        organizationId: invitation.organizationId,
        userId: createdUser.id,
        departmentId: assignment.departmentId,
        isManager: assignment.isManager,
      })),
    );
  }

  await db
    .update(invitations)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedByUserId: createdUser.id,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitation.id));

  return {
    ...createdUser,
    organizationName: invitation.organizationName,
    organizationSlug: invitation.organizationSlug,
  };
}

async function getPendingInvitationByToken(token: string) {
  const tokenHash = await hashToken(token);
  const [invitation] = await db
    .select({
      id: invitations.id,
      organizationId: invitations.organizationId,
      email: invitations.email,
      roleId: invitations.roleId,
      departmentAssignments: invitations.departmentAssignments,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(invitations)
    .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1);

  if (!invitation || invitation.status !== "pending" || invitation.expiresAt <= new Date()) {
    throw new ProfileError("invite_invalid", "This invitation link is invalid or expired.");
  }

  return invitation;
}

async function requireMainAdmin(user: CurrentUser) {
  if (!(await userHasRole(user, "Main Admin"))) {
    throw new ProfileError("forbidden", "Main Admin access is required.");
  }
}

function ensureNotSelfAdminTarget(actor: CurrentUser, targetUserId: number) {
  if (actor.id === targetUserId) {
    throw new ProfileError(
      "forbidden",
      "Use the profile page to manage your own account.",
    );
  }
}

async function canDeleteUser(organizationId: number, userId: number) {
  const isMainAdmin = await db
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.organizationId, organizationId),
        eq(userRoles.userId, userId),
        eq(roles.organizationId, organizationId),
        eq(roles.name, "Main Admin"),
      ),
    )
    .limit(1);

  if (isMainAdmin.length === 0) {
    return true;
  }

  const [mainAdminCount] = await db
    .select({ total: count() })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(
      and(
        eq(userRoles.organizationId, organizationId),
        eq(roles.organizationId, organizationId),
        eq(roles.name, "Main Admin"),
        eq(users.isActive, true),
      ),
    );

  return mainAdminCount.total > 1;
}

async function getUserRoles(organizationId: number, userId: number) {
  return (await getUsersRoles(organizationId, [userId])).get(userId) ?? [];
}

async function getUsersRoles(organizationId: number, userIds: number[]) {
  if (userIds.length === 0) {
    return new Map<number, { id: number; name: string }[]>();
  }

  const rows = await db
    .select({ userId: userRoles.userId, id: roles.id, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        inArray(userRoles.userId, userIds),
        eq(userRoles.organizationId, organizationId),
        eq(roles.organizationId, organizationId),
      ),
    )
    .orderBy(asc(roles.name));

  const rolesByUserId = new Map<number, { id: number; name: string }[]>();

  for (const row of rows) {
    const userRoleRows = rolesByUserId.get(row.userId) ?? [];
    userRoleRows.push({ id: row.id, name: row.name });
    rolesByUserId.set(row.userId, userRoleRows);
  }

  return rolesByUserId;
}

async function getUserDepartments(organizationId: number, userId: number) {
  return (await getUsersDepartments(organizationId, [userId])).get(userId) ?? [];
}

async function getUsersDepartments(organizationId: number, userIds: number[]) {
  if (userIds.length === 0) {
    return new Map<
      number,
      { id: number; name: string; isManager: boolean; createdAt: Date }[]
    >();
  }

  const rows = await db
    .select({
      userId: departmentMembers.userId,
      id: departments.id,
      name: departments.name,
      isManager: departmentMembers.isManager,
      createdAt: departmentMembers.createdAt,
    })
    .from(departmentMembers)
    .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(
      and(
        inArray(departmentMembers.userId, userIds),
        eq(departmentMembers.organizationId, organizationId),
        eq(departments.organizationId, organizationId),
      ),
    )
    .orderBy(asc(departments.name));

  const departmentsByUserId = new Map<
    number,
    { id: number; name: string; isManager: boolean; createdAt: Date }[]
  >();

  for (const row of rows) {
    const userDepartmentRows = departmentsByUserId.get(row.userId) ?? [];
    userDepartmentRows.push({
      id: row.id,
      name: row.name,
      isManager: row.isManager,
      createdAt: row.createdAt,
    });
    departmentsByUserId.set(row.userId, userDepartmentRows);
  }

  return departmentsByUserId;
}

async function getUserPermissions(organizationId: number, userId: number) {
  return (await getUsersPermissions(organizationId, [userId])).get(userId) ?? [];
}

async function getUsersPermissions(organizationId: number, userIds: number[]) {
  if (userIds.length === 0) {
    return new Map<number, PermissionKey[]>();
  }

  const rows = await db
    .select({ userId: userRoles.userId, key: permissions.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        inArray(userRoles.userId, userIds),
        eq(userRoles.organizationId, organizationId),
        eq(roles.organizationId, organizationId),
      ),
    )
    .orderBy(asc(permissions.key));

  const permissionsByUserId = new Map<number, PermissionKey[]>();

  for (const row of rows) {
    const userPermissionRows = permissionsByUserId.get(row.userId) ?? [];
    const permissionKey = row.key as PermissionKey;

    if (!userPermissionRows.includes(permissionKey)) {
      userPermissionRows.push(permissionKey);
    }

    permissionsByUserId.set(row.userId, userPermissionRows);
  }

  return permissionsByUserId;
}

async function getRolePermissions(roleId: number) {
  return (await getRolesPermissions([roleId])).get(roleId) ?? [];
}

async function getRolesPermissions(roleIds: number[]) {
  if (roleIds.length === 0) {
    return new Map<number, { id: number; key: string }[]>();
  }

  const rows = await db
    .select({
      roleId: rolePermissions.roleId,
      id: permissions.id,
      key: permissions.key,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds))
    .orderBy(asc(permissions.key));

  const permissionsByRoleId = new Map<number, { id: number; key: string }[]>();

  for (const row of rows) {
    const rolePermissionRows = permissionsByRoleId.get(row.roleId) ?? [];
    rolePermissionRows.push({ id: row.id, key: row.key });
    permissionsByRoleId.set(row.roleId, rolePermissionRows);
  }

  return permissionsByRoleId;
}

async function assertOrganizationRoles(organizationId: number, roleIds: number[]) {
  if (roleIds.length === 0) {
    return [];
  }

  if (roleIds.some((roleId) => !Number.isInteger(roleId) || roleId <= 0)) {
    throw new ProfileError("validation", "Select a valid role.");
  }

  const rows = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(and(eq(roles.organizationId, organizationId), inArray(roles.id, roleIds)));

  if (rows.length !== new Set(roleIds).size) {
    throw new ProfileError("forbidden", "One or more selected roles are invalid.");
  }

  return rows.map((role) => role.name);
}

function applyManagerRoleToDepartments(
  departmentAssignments: DepartmentAssignment[],
  selectedRoleNames: string[],
) {
  const isDepartmentManager = selectedRoleNames.includes("Department Manager");

  return departmentAssignments.map((assignment) => ({
    ...assignment,
    isManager: isDepartmentManager,
  }));
}

async function assertOrganizationDepartments(
  organizationId: number,
  departmentIds: number[],
) {
  const uniqueIds = Array.from(new Set(departmentIds));
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.organizationId, organizationId),
        inArray(departments.id, uniqueIds),
      ),
    );

  if (rows.length !== uniqueIds.length) {
    throw new ProfileError("forbidden", "One or more selected departments are invalid.");
  }
}

async function assertPermissionIds(permissionIds: number[]) {
  const uniqueIds = Array.from(new Set(permissionIds));
  if (uniqueIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(inArray(permissions.id, uniqueIds));

  if (rows.length !== uniqueIds.length) {
    throw new ProfileError("forbidden", "One or more selected permissions are invalid.");
  }
}

function parseDepartmentAssignments(value: string): DepartmentAssignment[] {
  try {
    const parsed = JSON.parse(value) as DepartmentAssignment[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((assignment) => ({
        departmentId: Number(assignment.departmentId),
        isManager: Boolean(assignment.isManager),
      }))
      .filter((assignment) => Number.isInteger(assignment.departmentId));
  } catch {
    return [];
  }
}

function validatePassword(password: string) {
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new ProfileError(
      "validation",
      "Use at least 8 characters with uppercase, lowercase, and a number.",
    );
  }
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
