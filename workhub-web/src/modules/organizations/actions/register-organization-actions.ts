"use server";

import { redirect } from "next/navigation";

import { recordAuditLog } from "@/modules/audit/services/audit-log-service";
import { verifyCsrfToken } from "@/modules/auth/services/csrf-service";
import { checkRateLimit } from "@/modules/auth/services/rate-limit-service";
import { getRequestMetadata } from "@/modules/auth/services/request-service";
import { createSession } from "@/modules/auth/services/session-service";
import {
  OrganizationRegistrationError,
  registerOrganizationWithMainAdmin,
} from "../services/organization-registration-service";

type RegisterOrganizationFields = {
  organizationName: string;
  adminFullName: string;
  adminEmail: string;
  password: string;
  confirmPassword: string;
  csrfToken: string;
};

export type RegisterOrganizationActionState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof RegisterOrganizationFields, string>>;
};

export async function registerOrganizationAction(
  _previousState: RegisterOrganizationActionState,
  formData: FormData,
): Promise<RegisterOrganizationActionState> {
  const fields = {
    organizationName: String(formData.get("organizationName") ?? ""),
    adminFullName: String(formData.get("adminFullName") ?? ""),
    adminEmail: String(formData.get("adminEmail") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    csrfToken: String(formData.get("csrfToken") ?? ""),
  };
  const metadata = await getRequestMetadata();
  const normalizedEmail = fields.adminEmail.trim().toLowerCase();

  if (!(await verifyCsrfToken(fields.csrfToken, "register-organization"))) {
    await recordAuditLog({
      event: "auth.register_organization.csrf_failed",
      email: normalizedEmail,
      ...metadata,
    });

    return { error: "Your session expired. Refresh the page and try again." };
  }

  const rateLimit = checkRateLimit({
    key: `register-organization:${metadata.ipAddress ?? "unknown"}:${normalizedEmail}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    await recordAuditLog({
      event: "auth.register_organization.rate_limited",
      email: normalizedEmail,
      metadata: { retryAfterSeconds: rateLimit.retryAfterSeconds },
      ...metadata,
    });

    return {
      error: `Too many registration attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const fieldErrors = validateRegistrationFields(fields);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const user = await registerOrganizationWithMainAdmin(fields);
    await createSession(user);
    await recordAuditLog({
      event: "auth.register_organization.succeeded",
      organizationId: user.organizationId,
      userId: user.id,
      email: user.email,
      ...metadata,
    });
  } catch (error) {
    console.error(error);
    const errorState = getRegistrationErrorState(error);

    await recordAuditLog({
      event: "auth.register_organization.failed",
      email: normalizedEmail,
      metadata: {
        organizationName: fields.organizationName,
        reason: error instanceof Error ? error.message : "unknown",
      },
      ...metadata,
    });

    return errorState;
  }

  redirect("/dashboard");
}

function getRegistrationErrorState(
  error: unknown,
): RegisterOrganizationActionState {
  if (error instanceof OrganizationRegistrationError) {
    if (error.code === "email_exists") {
      return {
        fieldErrors: {
          adminEmail: "This email address already exists.",
        },
      };
    }

    if (error.code === "organization_slug_unavailable") {
      return {
        fieldErrors: {
          organizationName:
            "This organization name is too similar to existing organizations. Use a more specific name.",
        },
      };
    }

    return { error: error.message };
  }

  if (isPostgresUniqueViolation(error)) {
    if (String(error.constraint).includes("users_email_unique")) {
      return {
        fieldErrors: {
          adminEmail: "This email address already exists.",
        },
      };
    }

    if (String(error.constraint).includes("organizations_slug_unique")) {
      return {
        fieldErrors: {
          organizationName:
            "This organization name is already in use. Use a more specific name.",
        },
      };
    }
  }

  return {
    error:
      "We could not create the organization because of a server error. Try again in a moment.",
  };
}

function isPostgresUniqueViolation(
  error: unknown,
): error is { code: string; constraint?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

function validateRegistrationFields(fields: RegisterOrganizationFields) {
  const errors: RegisterOrganizationActionState["fieldErrors"] = {};

  if (!fields.organizationName.trim()) {
    errors.organizationName = "Organization name is required.";
  }

  if (!fields.adminFullName.trim()) {
    errors.adminFullName = "Admin full name is required.";
  }

  if (!fields.adminEmail.trim()) {
    errors.adminEmail = "Admin email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(fields.adminEmail)) {
    errors.adminEmail = "Enter a valid admin email address.";
  }

  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (
    fields.password.length < 8 ||
    !/[A-Z]/.test(fields.password) ||
    !/[a-z]/.test(fields.password) ||
    !/\d/.test(fields.password)
  ) {
    errors.password =
      "Use at least 8 characters with uppercase, lowercase, and a number.";
  }

  if (!fields.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (fields.confirmPassword !== fields.password) {
    errors.confirmPassword = "Passwords must match.";
  }

  return errors;
}
