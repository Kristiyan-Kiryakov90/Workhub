# WorkHub Web

Next.js App Router web app for WorkHub, an enterprise workforce and operations management platform.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Neon PostgreSQL
- Drizzle ORM

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run lint
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
```

Required environment variables:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

## Authentication

Authentication is implemented with Server Actions, JWT cookies, and DB-backed sessions.

Current auth features:

- Organization registration creates a new organization and its first Main Admin.
- Regular users do not self-register publicly.
- Login validates email/password server-side.
- Passwords are hashed with bcrypt.
- JWTs are signed with `jose`.
- Session JWTs are stored in an HTTP-only cookie named `workhub_session`.
- Cookies use `sameSite: "lax"` and `secure: true` in production.
- Sessions are stored in the `sessions` table and can be revoked.
- Logout revokes the DB session and clears the cookie.
- `getCurrentUser()` validates JWT signature, expiration, DB session, revocation state, and active user status.
- Login, logout, and organization registration use signed, time-limited, single-use CSRF tokens. Nonces are recorded in `csrf_tokens` on first successful verification, so replay attempts fail.
- Login and organization registration are rate limited.
- Auth events are written to `audit_logs`.
- User emails are globally unique to avoid ambiguous login.
- Header shows Login for guests and user/org info plus Logout for authenticated users.

Public routes:

- `/`
- `/login`
- `/register-organization`

Protected routes are guarded by `src/proxy.ts`, but protected pages, Server Actions, and APIs must also use server-side authorization helpers.

Reusable auth helpers:

- `getCurrentUser()`
- `requireCurrentUser()`
- `requirePermission(permission)`
- `userHasPermission(user, permission)`
- `userHasRole(user, roleName)`
- `requireDepartmentAccess(departmentId, options)`
- `userCanAccessDepartment(user, departmentId, options)`

Production notes:

- Email verification is not implemented yet.
- Rate limiting is currently in-memory. Use Redis, Upstash, or another shared store for multi-instance production.
- Expired `sessions` and `csrf_tokens` should be deleted by a scheduled cleanup job.

## Database

Schema lives in `src/db/schema.ts`.

Migrations live in `drizzle/` and must be generated/applied through Drizzle:

```bash
npm run db:generate
npm run db:migrate
```

Main tables:

- `organizations`
- `users`
- `sessions`
- `csrf_tokens`
- `audit_logs`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `departments`
- `department_members`
- `leave_requests`
- `shifts`
- `shift_assignments`
- `tasks`
