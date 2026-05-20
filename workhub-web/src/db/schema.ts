import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const leaveRequestStatus = pgEnum("leave_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const leaveRequestType = pgEnum("leave_request_type", [
  "sick",
  "vacation",
  "personal",
  "unpaid",
  "other",
]);

export const shiftStatus = pgEnum("shift_status", [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskStatus = pgEnum("task_status", [
  "todo",
  "in_progress",
  "completed",
  "cancelled",
]);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("organizations_slug_unique").on(table.slug)],
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_organization_email_unique").on(
      table.organizationId,
      table.email,
    ),
    index("users_organization_idx").on(table.organizationId),
    index("users_active_idx").on(table.isActive),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_organization_idx").on(table.organizationId),
    index("sessions_expires_at_idx").on(table.expiresAt),
    index("sessions_revoked_at_idx").on(table.revokedAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").references(
      () => organizations.id,
      { onDelete: "set null" },
    ),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    event: varchar("event", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }),
    ipAddress: varchar("ip_address", { length: 120 }),
    userAgent: text("user_agent"),
    metadata: text("metadata"),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_logs_organization_idx").on(table.organizationId),
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_event_idx").on(table.event),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const csrfTokens = pgTable(
  "csrf_tokens",
  {
    nonce: varchar("nonce", { length: 64 }).primaryKey(),
    action: varchar("action", { length: 120 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("csrf_tokens_action_idx").on(table.action),
    index("csrf_tokens_expires_at_idx").on(table.expiresAt),
    index("csrf_tokens_used_at_idx").on(table.usedAt),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("roles_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    index("roles_organization_idx").on(table.organizationId),
  ],
);

export const permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 160 }).notNull(),
    description: text("description"),
  },
  (table) => [uniqueIndex("permissions_key_unique").on(table.key)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("role_permissions_role_permission_unique").on(
      table.roleId,
      table.permissionId,
    ),
    index("role_permissions_role_idx").on(table.roleId),
    index("role_permissions_permission_idx").on(table.permissionId),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("user_roles_organization_user_role_unique").on(
      table.organizationId,
      table.userId,
      table.roleId,
    ),
    index("user_roles_user_idx").on(table.userId),
    index("user_roles_role_idx").on(table.roleId),
  ],
);

export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("departments_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    index("departments_organization_idx").on(table.organizationId),
  ],
);

export const departmentMembers = pgTable(
  "department_members",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isManager: boolean("is_manager").default(false).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("department_members_department_user_unique").on(
      table.departmentId,
      table.userId,
    ),
    index("department_members_organization_idx").on(table.organizationId),
    index("department_members_user_idx").on(table.userId),
    index("department_members_manager_idx").on(table.isManager),
  ],
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: leaveRequestType("type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason"),
    status: leaveRequestStatus("status").default("pending").notNull(),
    reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewComment: text("review_comment"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("leave_requests_organization_idx").on(table.organizationId),
    index("leave_requests_department_status_idx").on(
      table.departmentId,
      table.status,
    ),
    index("leave_requests_user_idx").on(table.userId),
    index("leave_requests_start_date_idx").on(table.startDate),
  ],
);

export const shifts = pgTable(
  "shifts",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 180 }).notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 255 }),
    notes: text("notes"),
    status: shiftStatus("status").default("draft").notNull(),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("shifts_organization_idx").on(table.organizationId),
    index("shifts_department_start_time_idx").on(
      table.departmentId,
      table.startTime,
    ),
    index("shifts_status_idx").on(table.status),
  ],
);

export const shiftAssignments = pgTable(
  "shift_assignments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shiftId: integer("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedByUserId: integer("assigned_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("shift_assignments_shift_user_unique").on(
      table.shiftId,
      table.userId,
    ),
    index("shift_assignments_organization_idx").on(table.organizationId),
    index("shift_assignments_user_idx").on(table.userId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    notes: text("notes"),
    status: taskStatus("status").default("todo").notNull(),
    priority: taskPriority("priority").default("medium").notNull(),
    dueDate: date("due_date"),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedToUserId: integer("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("tasks_organization_idx").on(table.organizationId),
    index("tasks_department_status_idx").on(table.departmentId, table.status),
    index("tasks_assigned_to_user_idx").on(table.assignedToUserId),
    index("tasks_due_date_idx").on(table.dueDate),
  ],
);

export const taskChecklistItems = pgTable(
  "task_checklist_items",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("task_checklist_items_organization_idx").on(table.organizationId),
    index("task_checklist_items_task_position_idx").on(
      table.taskId,
      table.position,
    ),
  ],
);
