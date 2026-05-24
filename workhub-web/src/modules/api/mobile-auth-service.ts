import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  organizations,
  roles,
  sessions,
  userRoles,
  users,
} from "@/db/schema";
import { authenticateUser } from "@/modules/auth/services/auth-service";
import { signSessionToken, verifySessionToken } from "@/modules/auth/services/jwt-service";
import type { CurrentUser } from "@/modules/auth/types";

const sessionDurationSeconds = 60 * 60 * 8;

export type MobileAuthContext = {
  user: CurrentUser;
  roles: Array<{ id: number; name: string; description: string | null }>;
};

type RequireBearerAuthOptions = {
  includeRoles?: boolean;
};

export async function loginForMobile(email: string, password: string) {
  const user = await authenticateUser(email, password);

  if (!user) {
    return null;
  }

  const token = await createMobileToken(user);
  const roles = await getUserRoles(user);

  return {
    token,
    expiresIn: sessionDurationSeconds,
    user: toSafeUser(user),
    organization: {
      id: user.organizationId,
      name: user.organizationName,
      slug: user.organizationSlug,
    },
    roles,
  };
}

export async function requireBearerAuth(
  request: Request,
  options: RequireBearerAuthOptions = {},
): Promise<MobileAuthContext> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new MobileApiError(401, "Authentication is required.");
  }

  const payload = await verifySessionToken(match[1]);

  if (!payload) {
    throw new MobileApiError(401, "Invalid or expired token.");
  }

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
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(organizations, eq(sessions.organizationId, organizations.id))
    .where(
      and(
        eq(sessions.id, payload.jti),
        eq(sessions.userId, Number(payload.sub)),
        eq(sessions.organizationId, payload.organizationId),
        eq(users.organizationId, payload.organizationId),
        eq(users.isActive, true),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row || !row.isActive) {
    throw new MobileApiError(401, "Invalid or expired token.");
  }

  const user = {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    name: row.name,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
  };

  return {
    user,
    roles: options.includeRoles ? await getUserRoles(user) : [],
  };
}

export class MobileApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MobileApiError";
  }
}

async function createMobileToken(user: CurrentUser) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds;

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    organizationId: user.organizationId,
    expiresAt: new Date(expiresAt * 1000),
  });

  return signSessionToken({
    jti: sessionId,
    sub: String(user.id),
    organizationId: user.organizationId,
    email: user.email,
    name: user.name,
    organizationName: user.organizationName,
    organizationSlug: user.organizationSlug,
    exp: expiresAt,
  });
}

async function getUserRoles(user: CurrentUser) {
  return db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.organizationId, user.organizationId),
        eq(roles.organizationId, user.organizationId),
      ),
    );
}

function toSafeUser(user: CurrentUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
  };
}
