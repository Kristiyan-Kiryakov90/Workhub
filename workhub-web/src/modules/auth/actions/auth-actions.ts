"use server";

import { redirect } from "next/navigation";

import { recordAuditLog } from "@/modules/audit/services/audit-log-service";
import { authenticateUser } from "../services/auth-service";
import { verifyCsrfToken } from "../services/csrf-service";
import { checkRateLimit } from "../services/rate-limit-service";
import { getRequestMetadata } from "../services/request-service";
import {
  clearSession,
  createSession,
  getCurrentUser,
} from "../services/session-service";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const csrfToken = String(formData.get("csrfToken") ?? "");
  const metadata = await getRequestMetadata();
  const normalizedEmail = email.trim().toLowerCase();

  if (!(await verifyCsrfToken(csrfToken, "login"))) {
    await recordAuditLog({
      event: "auth.login.csrf_failed",
      email: normalizedEmail,
      ...metadata,
    });

    return { error: "Your session expired. Refresh the page and try again." };
  }

  const rateLimit = checkRateLimit({
    key: `login:${metadata.ipAddress ?? "unknown"}:${normalizedEmail}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    await recordAuditLog({
      event: "auth.login.rate_limited",
      email: normalizedEmail,
      metadata: { retryAfterSeconds: rateLimit.retryAfterSeconds },
      ...metadata,
    });

    return {
      error: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  if (!email.trim() || !password) {
    return { error: "Email and password are required." };
  }

  const user = await authenticateUser(email, password);

  if (!user) {
    await recordAuditLog({
      event: "auth.login.failed",
      email: normalizedEmail,
      ...metadata,
    });

    return { error: "Invalid email or password." };
  }

  await createSession(user);
  await recordAuditLog({
    event: "auth.login.succeeded",
    organizationId: user.organizationId,
    userId: user.id,
    email: user.email,
    ...metadata,
  });
  redirect("/dashboard");
}

export async function logoutAction(formData?: FormData) {
  const metadata = await getRequestMetadata();
  const user = await getCurrentUser();
  const csrfToken = String(formData?.get("csrfToken") ?? "");

  if (!(await verifyCsrfToken(csrfToken, "logout"))) {
    await recordAuditLog({
      event: "auth.logout.csrf_failed",
      organizationId: user?.organizationId,
      userId: user?.id,
      email: user?.email,
      ...metadata,
    });

    redirect("/dashboard");
  }

  await clearSession();
  await recordAuditLog({
    event: "auth.logout",
    organizationId: user?.organizationId,
    userId: user?.id,
    email: user?.email,
    ...metadata,
  });
  redirect("/login");
}
