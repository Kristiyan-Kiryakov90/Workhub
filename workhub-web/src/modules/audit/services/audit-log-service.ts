import { db } from "@/db";
import { auditLogs } from "@/db/schema";

type AuditLogInput = {
  event: string;
  organizationId?: number | null;
  userId?: number | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordAuditLog(input: AuditLogInput) {
  try {
    await db.insert(auditLogs).values({
      event: input.event,
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      email: input.email?.trim().toLowerCase() ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
