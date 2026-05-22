# WorkHub Database Schema

Use Neon PostgreSQL with Drizzle ORM.
Use Drizzle migrations only. Never edit the database manually.
Use simple serial numeric IDs for core business tables unless a token/session table explicitly needs a string ID.
Use indexes for filtering, paging, joins, and authorization checks.
Use foreign keys and normalized schema.

Install:

- Drizzle ORM
- Drizzle Kit
- Neon DB driver
- dotenv

Commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Enums

### leave_request_status

- pending
- approved
- rejected
- cancelled

### leave_request_type

- sick
- vacation
- personal
- unpaid
- other

### shift_status

- draft
- scheduled
- in_progress
- completed
- cancelled

### task_priority

- low
- medium
- high
- urgent

### task_status

- todo
- in_progress
- blocked
- done
- cancelled

## Organizations

### organizations

- id: serial primary key
- name: varchar(255), required
- slug: varchar(120), required, unique
- createdAt
- updatedAt

Indexes:

- unique `organizations_slug_unique` on slug

## Users, Auth, Roles, Permissions

### users

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- email: varchar(320), required
- passwordHash: text, required
- name: varchar(255), required
- phone: varchar(40), optional
- avatarUrl: text, optional
- isActive: boolean, default true
- createdAt
- updatedAt

Indexes:

- unique `users_email_unique` on email
- unique `users_organization_email_unique` on organizationId + email
- `users_organization_idx`
- `users_active_idx`

### sessions

- id: varchar(64), primary key
- userId: fk users.id, cascade delete, required
- organizationId: fk organizations.id, cascade delete, required
- expiresAt: timestamp with timezone, required
- revokedAt: timestamp with timezone, optional
- createdAt

Indexes:

- `sessions_user_idx`
- `sessions_organization_idx`
- `sessions_expires_at_idx`
- `sessions_revoked_at_idx`

### csrf_tokens

- nonce: varchar(64), primary key
- action: varchar(120), required
- expiresAt: timestamp with timezone, required
- usedAt: timestamp with timezone, optional
- createdAt

This table records consumed CSRF nonces. Token creation should not require a database write; verification inserts the nonce atomically so replay attempts fail on the primary key.

Indexes:

- `csrf_tokens_action_idx`
- `csrf_tokens_expires_at_idx`
- `csrf_tokens_used_at_idx`

### audit_logs

- id: serial primary key
- organizationId: fk organizations.id, set null, optional
- userId: fk users.id, set null, optional
- event: varchar(120), required
- email: varchar(320), optional
- ipAddress: varchar(120), optional
- userAgent: text, optional
- metadata: text, optional JSON string
- createdAt

Indexes:

- `audit_logs_organization_idx`
- `audit_logs_user_idx`
- `audit_logs_event_idx`
- `audit_logs_created_at_idx`

### roles

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- name: varchar(120), required
- description: text, optional
- createdAt
- updatedAt

Indexes:

- unique `roles_organization_name_unique` on organizationId + name
- `roles_organization_idx`

### permissions

- id: serial primary key
- key: varchar(160), required, unique
- description: text, optional

Indexes:

- unique `permissions_key_unique` on key

### role_permissions

- id: serial primary key
- roleId: fk roles.id, cascade delete, required
- permissionId: fk permissions.id, cascade delete, required

Indexes:

- unique `role_permissions_role_permission_unique` on roleId + permissionId
- `role_permissions_role_idx`
- `role_permissions_permission_idx`

### user_roles

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- userId: fk users.id, cascade delete, required
- roleId: fk roles.id, cascade delete, required

Indexes:

- unique `user_roles_organization_user_role_unique` on organizationId + userId + roleId
- `user_roles_user_idx`
- `user_roles_role_idx`

## Departments

### departments

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- name: varchar(180), required
- description: text, optional
- createdAt
- updatedAt

Indexes:

- unique `departments_organization_name_unique` on organizationId + name
- `departments_organization_idx`

### department_members

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- departmentId: fk departments.id, cascade delete, required
- userId: fk users.id, cascade delete, required
- isManager: boolean, default false
- createdAt

Indexes:

- unique `department_members_department_user_unique` on departmentId + userId
- `department_members_organization_idx`
- `department_members_user_idx`
- `department_members_manager_idx`

## Leave Requests

### leave_requests

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- departmentId: fk departments.id, restrict delete, required
- userId: fk users.id, cascade delete, required
- type: leave_request_type, required
- startDate: date, required
- endDate: date, required
- reason: text, optional
- status: leave_request_status, default pending
- reviewedByUserId: fk users.id, set null, optional
- reviewComment: text, optional
- reviewedAt: timestamp with timezone, optional
- createdAt
- updatedAt

Indexes:

- `leave_requests_organization_idx`
- `leave_requests_department_status_idx` on departmentId + status
- `leave_requests_user_idx`
- `leave_requests_start_date_idx`

## Shifts

### shifts

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- departmentId: fk departments.id, restrict delete, required
- title: varchar(180), required
- startTime: timestamp with timezone, required
- endTime: timestamp with timezone, required
- location: varchar(255), optional
- notes: text, optional
- status: shift_status, default draft
- createdByUserId: fk users.id, restrict delete, required
- createdAt
- updatedAt

Indexes:

- `shifts_organization_idx`
- `shifts_department_start_time_idx` on departmentId + startTime
- `shifts_status_idx`

### shift_assignments

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- shiftId: fk shifts.id, cascade delete, required
- userId: fk users.id, cascade delete, required
- assignedByUserId: fk users.id, restrict delete, required
- createdAt

Indexes:

- unique `shift_assignments_shift_user_unique` on shiftId + userId
- `shift_assignments_organization_idx`
- `shift_assignments_user_idx`

## Tasks

### tasks

- id: serial primary key
- organizationId: fk organizations.id, cascade delete, required
- departmentId: fk departments.id, restrict delete, required
- title: varchar(220), required
- description: text, optional
- status: task_status, default todo
- priority: task_priority, default medium
- dueDate: date, optional
- createdByUserId: fk users.id, restrict delete, required
- assignedToUserId: fk users.id, set null, optional
- createdAt
- updatedAt

Indexes:

- `tasks_organization_idx`
- `tasks_department_status_idx` on departmentId + status
- `tasks_assigned_to_user_idx`
- `tasks_due_date_idx`

## Auth Cleanup

Add a scheduled cleanup job later to delete expired:

- sessions
- csrf_tokens

Keep audit logs unless a retention policy requires deletion.
