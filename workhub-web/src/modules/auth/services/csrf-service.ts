import { jwtVerify, SignJWT } from "jose";

import { db } from "@/db";
import { csrfTokens } from "@/db/schema";

const textEncoder = new TextEncoder();
const csrfTokenDurationSeconds = 15 * 60;

function getSigningKey() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  return textEncoder.encode(secret);
}

export async function createCsrfToken(action: string) {
  const nonce = crypto.randomUUID();

  return new SignJWT({ action, nonce })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(`${csrfTokenDurationSeconds}s`)
    .sign(getSigningKey());
}

export async function verifyCsrfToken(token: string, action: string) {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
      typ: "JWT",
    });

    if (payload.action !== action || typeof payload.nonce !== "string") {
      return false;
    }

    const [consumedToken] = await db
      .insert(csrfTokens)
      .values({
        nonce: payload.nonce,
        action,
        expiresAt: new Date((payload.exp ?? 0) * 1000),
        usedAt: new Date(),
      })
      .returning({ nonce: csrfTokens.nonce });

    return Boolean(consumedToken);
  } catch {
    return false;
  }
}
