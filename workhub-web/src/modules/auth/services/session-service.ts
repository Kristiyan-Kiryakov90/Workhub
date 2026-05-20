import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { organizations, sessions, users } from "@/db/schema";
import { signSessionToken, verifySessionToken } from "./jwt-service";
import { sessionCookieName } from "../constants";
import type { CurrentUser } from "../types";

const sessionDurationSeconds = 60 * 60 * 8;

export async function createSession(user: CurrentUser) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds;
  const expiresAtDate = new Date(expiresAt * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    organizationId: user.organizationId,
    expiresAt: expiresAtDate,
  });

  const token = await signSessionToken({
    jti: sessionId,
    sub: String(user.id),
    organizationId: user.organizationId,
    email: user.email,
    name: user.name,
    organizationName: user.organizationName,
    organizationSlug: user.organizationSlug,
    exp: expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    const payload = await verifySessionToken(token);

    if (payload) {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.id, payload.jti));
    }
  }

  cookieStore.delete(sessionCookieName);
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const [row] = await db
    .select({
      id: users.id,
      organizationId: users.organizationId,
      email: users.email,
      name: users.name,
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

  if (!row) {
    return null;
  }

  return row;
});

export const getCurrentSessionPayload = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  return token ? verifySessionToken(token) : null;
});
