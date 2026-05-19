import { jwtVerify, SignJWT } from "jose";

import type { SessionPayload } from "../types";

const textEncoder = new TextEncoder();

function getSigningKey() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  return textEncoder.encode(secret);
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({
    email: payload.email,
    organizationId: payload.organizationId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setJti(payload.jti)
    .setSubject(payload.sub)
    .setExpirationTime(payload.exp)
    .sign(getSigningKey());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
      typ: "JWT",
    });

    if (
      typeof payload.jti !== "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.organizationId !== "number"
    ) {
      return null;
    }

    return {
      jti: payload.jti,
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      exp: payload.exp,
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}
