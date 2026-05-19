import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { getActiveUserById } from "./auth-service";
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

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const [session] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, payload.jti),
        eq(sessions.userId, Number(payload.sub)),
        eq(sessions.organizationId, payload.organizationId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) {
    return null;
  }

  return getActiveUserById(Number(payload.sub), payload.organizationId);
}
