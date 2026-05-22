import "server-only";

import { and, count, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/db";
import { departmentMembers, notifications, users } from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/types";

export const notificationTypes = [
  "task_assigned",
  "task_updated",
  "leave_submitted",
  "leave_approved",
  "leave_rejected",
  "shift_assigned",
  "shift_updated",
  "shift_cancelled",
  "role_assigned",
  "department_assigned",
] as const;

export const notificationGroups = [
  "tasks",
  "leave",
  "shifts",
  "roles",
  "departments",
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type NotificationGroup = (typeof notificationGroups)[number];
export type NotificationStatusFilter = "read" | "unread";
export type NotificationListFilters = {
  status?: NotificationStatusFilter;
  type?: NotificationGroup;
  unreadPage?: number;
  recentPage?: number;
};
export type CreateNotificationInput = {
  organizationId: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  actionUrl?: string | null;
};

const pageSize = 8;
const notificationGroupTypes: Record<NotificationGroup, NotificationType[]> = {
  tasks: ["task_assigned", "task_updated"],
  leave: ["leave_submitted", "leave_approved", "leave_rejected"],
  shifts: ["shift_assigned", "shift_updated", "shift_cancelled"],
  roles: ["role_assigned"],
  departments: ["department_assigned"],
};

export type NotificationListData = Awaited<ReturnType<typeof getNotificationListData>>;

export async function getNotificationListData(
  user: CurrentUser,
  filters: NotificationListFilters,
) {
  const [unreadNotifications, recentNotifications, unreadCount] =
    await Promise.all([
      filters.status === "read"
        ? Promise.resolve(emptyPage(filters.unreadPage ?? 1))
        : getNotificationsPage(user, filters, {
            isRead: false,
            page: filters.unreadPage ?? 1,
          }),
      filters.status === "unread"
        ? Promise.resolve(emptyPage(filters.recentPage ?? 1))
        : getNotificationsPage(user, filters, {
            isRead: true,
            page: filters.recentPage ?? 1,
          }),
      getUnreadNotificationCount(user),
    ]);

  return {
    filters,
    pageSize,
    unreadCount,
    unreadNotifications,
    recentNotifications,
  };
}

export async function getUnreadNotificationCount(user: CurrentUser) {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, user.organizationId),
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false),
      ),
    );

  return Number(row?.value ?? 0);
}

export async function markNotificationAsRead(user: CurrentUser, notificationId: number) {
  const [notification] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.organizationId, user.organizationId),
        eq(notifications.userId, user.id),
      ),
    )
    .returning({ actionUrl: notifications.actionUrl });

  return notification ?? null;
}

export async function markAllNotificationsAsRead(user: CurrentUser) {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.organizationId, user.organizationId),
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false),
      ),
    );
}

export async function createNotification(input: CreateNotificationInput) {
  const [recipient] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, input.userId),
        eq(users.organizationId, input.organizationId),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  if (!recipient) {
    return { ok: false, error: "recipient-not-found" } as const;
  }

  await db.insert(notifications).values({
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    title: input.title.slice(0, 180),
    message: input.message,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    actionUrl: input.actionUrl ?? null,
  });
  revalidateNotificationRecipient(input.organizationId, input.userId);

  return { ok: true } as const;
}

export async function createNotificationForKnownRecipient(
  input: CreateNotificationInput,
) {
  await db.insert(notifications).values({
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    title: input.title.slice(0, 180),
    message: input.message,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    actionUrl: input.actionUrl ?? null,
  });
  revalidateNotificationRecipient(input.organizationId, input.userId);
}

export async function createNotificationForKnownRecipientOnce(
  input: CreateNotificationInput,
  options: { dedupeSeconds?: number } = {},
) {
  const dedupeSince = new Date(
    Date.now() - (options.dedupeSeconds ?? 10) * 1000,
  );
  const [existingNotification] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, input.organizationId),
        eq(notifications.userId, input.userId),
        eq(notifications.type, input.type),
        eq(notifications.title, input.title.slice(0, 180)),
        eq(notifications.message, input.message),
        input.relatedEntityType
          ? eq(notifications.relatedEntityType, input.relatedEntityType)
          : isNull(notifications.relatedEntityType),
        input.relatedEntityId
          ? eq(notifications.relatedEntityId, input.relatedEntityId)
          : isNull(notifications.relatedEntityId),
        gt(notifications.createdAt, dedupeSince),
      ),
    )
    .limit(1);

  if (existingNotification) {
    return;
  }

  await createNotificationForKnownRecipient(input);
}

export async function createOrMergeNotificationForKnownRecipient(
  input: CreateNotificationInput,
  options: { mergeSeconds?: number } = {},
) {
  const mergeSince = new Date(Date.now() - (options.mergeSeconds ?? 60) * 1000);
  const [existingNotification] = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, input.organizationId),
        eq(notifications.userId, input.userId),
        eq(notifications.type, input.type),
        eq(notifications.isRead, false),
        input.relatedEntityType
          ? eq(notifications.relatedEntityType, input.relatedEntityType)
          : isNull(notifications.relatedEntityType),
        input.relatedEntityId
          ? eq(notifications.relatedEntityId, input.relatedEntityId)
          : isNull(notifications.relatedEntityId),
        gt(notifications.createdAt, mergeSince),
      ),
    )
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(1);

  if (!existingNotification) {
    await createNotificationForKnownRecipient(input);
    return;
  }

  const mergedMessage = mergeNotificationMessages(
    existingNotification.message,
    input.message,
  );

  await db
    .update(notifications)
    .set({
      title:
        existingNotification.title === "Task checklist updated"
          ? input.title
          : existingNotification.title,
      message: mergedMessage,
    })
    .where(eq(notifications.id, existingNotification.id));
  revalidateNotificationRecipient(input.organizationId, input.userId);
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  const uniqueInputs = dedupeNotificationInputs(inputs);

  if (uniqueInputs.length === 0) {
    return;
  }

  const recipientIds = Array.from(new Set(uniqueInputs.map((input) => input.userId)));
  const organizationId = uniqueInputs[0]?.organizationId;

  if (!organizationId) {
    return;
  }

  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true),
        inArray(users.id, recipientIds),
      ),
    );
  const activeRecipientIds = new Set(recipients.map((recipient) => recipient.id));
  const values = uniqueInputs
    .filter((input) => activeRecipientIds.has(input.userId))
    .map((input) => ({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 180),
      message: input.message,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      actionUrl: input.actionUrl ?? null,
    }));

  if (values.length > 0) {
    await db.insert(notifications).values(values);
    revalidateNotificationRecipients(
      values.map((value) => ({
        organizationId: value.organizationId,
        userId: value.userId,
      })),
    );
  }
}

export async function getDepartmentManagerIds(
  organizationId: number,
  departmentId: number,
) {
  const rows = await db
    .select({ userId: departmentMembers.userId })
    .from(departmentMembers)
    .innerJoin(users, eq(departmentMembers.userId, users.id))
    .where(
      and(
        eq(departmentMembers.organizationId, organizationId),
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.isManager, true),
        eq(users.organizationId, organizationId),
        eq(users.isActive, true),
      ),
    );

  return rows.map((row) => row.userId);
}

export function getNotificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    task_assigned: "Task Assigned",
    task_updated: "Task Updated",
    leave_submitted: "Leave Submitted",
    leave_approved: "Leave Approved",
    leave_rejected: "Leave Rejected",
    shift_assigned: "Shift Assigned",
    shift_updated: "Shift Updated",
    shift_cancelled: "Shift Cancelled",
    role_assigned: "Role Assigned",
    department_assigned: "Department Assigned",
  };

  return labels[type] ?? formatLabel(type);
}

async function getNotificationsPage(
  user: CurrentUser,
  filters: NotificationListFilters,
  options: { isRead: boolean; page: number },
) {
  const where = buildNotificationWhere(user, filters, options.isRead);
  const offset = (options.page - 1) * pageSize;
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        actionUrl: notifications.actionUrl,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(notifications).where(where),
  ]);
  const total = Number(totals[0]?.value ?? 0);

  return {
    rows,
    total,
    page: options.page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasPreviousPage: options.page > 1,
    hasNextPage: offset + rows.length < total,
  };
}

function buildNotificationWhere(
  user: CurrentUser,
  filters: NotificationListFilters,
  isRead: boolean,
) {
  const conditions = [
    eq(notifications.organizationId, user.organizationId),
    eq(notifications.userId, user.id),
    eq(notifications.isRead, isRead),
  ];

  if (filters.type) {
    conditions.push(inArray(notifications.type, notificationGroupTypes[filters.type]));
  }

  return and(...conditions);
}

function emptyPage(page: number) {
  return {
    rows: [],
    total: 0,
    page,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function dedupeNotificationInputs(inputs: CreateNotificationInput[]) {
  return Array.from(
    new Map(
      inputs.map((input) => [
        [
          input.organizationId,
          input.userId,
          input.type,
          input.relatedEntityType ?? "",
          input.relatedEntityId ?? "",
          input.title,
        ].join(":"),
        input,
      ]),
    ).values(),
  );
}

function revalidateNotificationRecipient(organizationId: number, userId: number) {
  revalidateTag(`notifications:${organizationId}:${userId}`, { expire: 0 });
}

function revalidateNotificationRecipients(
  recipients: { organizationId: number; userId: number }[],
) {
  for (const recipient of dedupeRecipients(recipients)) {
    revalidateNotificationRecipient(recipient.organizationId, recipient.userId);
  }
}

function dedupeRecipients(
  recipients: { organizationId: number; userId: number }[],
) {
  return Array.from(
    new Map(
      recipients.map((recipient) => [
        `${recipient.organizationId}:${recipient.userId}`,
        recipient,
      ]),
    ).values(),
  );
}

function mergeNotificationMessages(existingMessage: string, nextMessage: string) {
  const existing = splitNotificationChangeMessage(existingMessage);
  const next = splitNotificationChangeMessage(nextMessage);
  const base = existing.base || next.base;
  const changes = Array.from(new Set([...existing.changes, ...next.changes]));

  if (changes.length === 0) {
    return nextMessage;
  }

  return `${base} Changes: ${changes.join("; ")}.`;
}

function splitNotificationChangeMessage(message: string) {
  const [basePart, changesPart] = message.split(" Changes: ");
  const changes = changesPart
    ? changesPart
        .replace(/\.$/, "")
        .split("; ")
        .map((change) => change.trim())
        .filter(Boolean)
    : [];

  return {
    base: basePart.endsWith(".") ? basePart : `${basePart}.`,
    changes,
  };
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
