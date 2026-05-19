import { hash } from "bcryptjs";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  organizations,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/db/schema";
import { permissionKeys } from "@/modules/permissions/constants";
import type { CurrentUser } from "@/modules/auth/types";

type RegisterOrganizationInput = {
  organizationName: string;
  adminFullName: string;
  adminEmail: string;
  password: string;
};

const roleNames = ["Main Admin", "Department Manager", "Employee"] as const;

export class OrganizationRegistrationError extends Error {
  constructor(
    readonly code:
      | "email_exists"
      | "organization_slug_unavailable"
      | "main_admin_role_missing",
    message: string,
  ) {
    super(message);
    this.name = "OrganizationRegistrationError";
  }
}

export async function registerOrganizationWithMainAdmin({
  organizationName,
  adminFullName,
  adminEmail,
  password,
}: RegisterOrganizationInput): Promise<CurrentUser> {
  const normalizedEmail = adminEmail.trim().toLowerCase();
  const organizationDisplayName = organizationName.trim();
  const adminName = adminFullName.trim();
  const organizationSlug = await createAvailableOrganizationSlug(
    organizationDisplayName,
  );
  const passwordHash = await hash(password, 12);
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser) {
    throw new OrganizationRegistrationError(
      "email_exists",
      "A user with this email address already exists.",
    );
  }

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: organizationDisplayName,
        slug: organizationSlug,
      })
      .returning();

    await tx
      .insert(permissions)
      .values(
        permissionKeys.map((key) => ({
          key,
          description: key
            .split(".")
            .map((part) => part.replaceAll("_", " "))
            .join(" "),
        })),
      )
      .onConflictDoNothing({ target: permissions.key });

    const permissionRows = await tx
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.key, [...permissionKeys]));

    const roleRows = await tx
      .insert(roles)
      .values(
        roleNames.map((roleName) => ({
          organizationId: organization.id,
          name: roleName,
          description: `${roleName} role for ${organization.name}`,
        })),
      )
      .returning();

    const mainAdminRole = roleRows.find((role) => role.name === "Main Admin");

    if (!mainAdminRole) {
      throw new OrganizationRegistrationError(
        "main_admin_role_missing",
        "The Main Admin role could not be created.",
      );
    }

    if (permissionRows.length > 0) {
      await tx.insert(rolePermissions).values(
        permissionRows.map((permission) => ({
          roleId: mainAdminRole.id,
          permissionId: permission.id,
        })),
      );
    }

    const [adminUser] = await tx
      .insert(users)
      .values({
        organizationId: organization.id,
        email: normalizedEmail,
        passwordHash,
        name: adminName,
        isActive: true,
      })
      .returning();

    await tx.insert(userRoles).values({
      organizationId: organization.id,
      userId: adminUser.id,
      roleId: mainAdminRole.id,
    });

    return {
      id: adminUser.id,
      organizationId: organization.id,
      email: adminUser.email,
      name: adminUser.name,
      organizationName: organization.name,
      organizationSlug: organization.slug,
    };
  });
}

async function createAvailableOrganizationSlug(organizationName: string) {
  const baseSlug = slugify(organizationName).slice(0, 100) || "organization";

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const [existingOrganization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);

    if (!existingOrganization) {
      return candidate;
    }
  }

  throw new OrganizationRegistrationError(
    "organization_slug_unavailable",
    "This organization name is too similar to existing organizations. Use a more specific name.",
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
