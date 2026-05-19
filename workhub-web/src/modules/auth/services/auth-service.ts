import { compare } from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import type { CurrentUser } from "../types";

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [row] = await db
    .select({
      id: users.id,
      organizationId: users.organizationId,
      email: users.email,
      passwordHash: users.passwordHash,
      name: users.name,
      isActive: users.isActive,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!row || !row.isActive) {
    return null;
  }

  const isPasswordValid = await compare(password, row.passwordHash);

  if (!isPasswordValid) {
    return null;
  }

  return toCurrentUser(row);
}

export async function getActiveUserById(userId: number, organizationId: number) {
  const [row] = await db
    .select({
      id: users.id,
      organizationId: users.organizationId,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(
      and(
        eq(users.id, userId),
        eq(users.organizationId, organizationId),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  return row ? toCurrentUser(row) : null;
}

function toCurrentUser(row: {
  id: number;
  organizationId: number;
  email: string;
  name: string;
  organizationName: string;
  organizationSlug: string;
}): CurrentUser {
  return {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    name: row.name,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
  };
}
