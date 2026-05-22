## Login / Logout and Organization Registration

Implement secure authentication for WorkHub users using Next.js App Router best practices.

### Product Rules

- Regular users cannot register publicly.
- New organizations and their first Main Admin are created through the organization registration flow.
- Employees and Department Managers receive accounts through invitations or admin-created onboarding in a later step.
- Existing seeded or created users must be able to log in.
- Do not show a public Register link for normal user registration.
- Show organization registration only as the first-admin organization creation flow.

### Required Libraries

- `bcryptjs` or bcrypt-compatible package for password hashing.
- `jose` for JWT signing and verification.
- Drizzle ORM with PostgreSQL/Neon.

### Environment

- Generate a strong random `JWT_SECRET` in `.env`.
- Use `DATABASE_URL` from `.env`.

### Pages

Implement server-rendered auth pages:

- `(auth)/login`
- `(auth)/register-organization`

Use client components only for interactive forms.
Use Server Actions for submit workflows.

### Login Form

Fields:

- Email
- Password

Flow:

- Validate input client-side and server-side.
- Normalize email to lowercase.
- Find the user by globally unique email.
- Verify password with bcrypt.
- Ensure the user account is active.
- Create a DB-backed session row.
- Generate a signed JWT session token with `jose`.
- Include a small payload only: session id/JTI, user id, organization id, email, expiration.
- Store JWT in an HTTP-only cookie.
- Cookie rules:
  - `httpOnly: true`
  - `sameSite: "lax"`
  - `secure: true` in production
  - reasonable expiration, for example 8 hours
- Redirect to `/dashboard`.

### Logout

- Implement logout as a Server Action.
- Verify a CSRF token before logout.
- Revoke the current DB session.
- Clear the authentication cookie.
- Redirect to `/login` or home.

### Organization Registration

Fields:

- Organization name
- Admin full name
- Admin email
- Password
- Confirm password

Flow:

- Validate input client-side and server-side.
- Validate password strength.
- Normalize admin email to lowercase.
- Enforce global unique user email.
- Return specific field errors, for example:
  - `This email address already exists.`
  - `This organization name is already in use.`
- Create organization.
- Create default roles:
  - Main Admin
  - Department Manager
  - Employee
- Seed/ensure permissions.
- Assign all permissions to Main Admin.
- Create first Main Admin user with bcrypt password hash.
- Assign Main Admin role to the user.
- Create session and log the new Main Admin in.
- Redirect to `/dashboard`.

### Session Storage

Use a `sessions` table:

- id
- userId
- organizationId
- expiresAt
- revokedAt
- createdAt

`getCurrentUser()` must:

- Read the session cookie.
- Verify the JWT signature and expiration.
- Verify the session exists in DB.
- Reject revoked sessions.
- Reject expired sessions.
- Load the active user and organization.
- Never return password hashes.

### CSRF Protection

Use signed, time-limited, single-use CSRF tokens for:

- Login
- Logout
- Organization registration

Use a `csrf_tokens` table to record consumed nonces:

- nonce
- action
- expiresAt
- usedAt
- createdAt

Token creation:

- Generate a random nonce.
- Sign action + nonce + expiration into a JWT.
- Do not require a database write during page render.

On verification:

- Verify JWT signature.
- Verify action matches.
- Verify token is not expired.
- Insert the nonce/action into `csrf_tokens` with `usedAt`.
- The nonce is the primary key, so replay attempts fail atomically.

### Rate Limiting

Rate limit:

- Login attempts by IP + email.
- Organization registration by IP + email.

In-memory rate limiting is acceptable for development.
Use Redis/Upstash or a shared store for production.

### Audit Logging

Write auth events to `audit_logs`, including:

- Login succeeded
- Login failed
- Login rate limited
- CSRF failed
- Logout
- Organization registration succeeded
- Organization registration failed

Audit fields should include:

- organizationId, when available
- userId, when available
- event
- email
- IP address
- user agent
- metadata
- createdAt

### Authorization

Do not rely only on proxy/middleware.

Protected pages, Server Actions, and API routes must verify auth server-side with reusable helpers:

- `getCurrentUser()`
- `requireCurrentUser()`
- `requirePermission(permission)`
- `userHasPermission(user, permission)`
- `userHasRole(user, roleName)`
- `requireDepartmentAccess(departmentId, options)`
- `userCanAccessDepartment(user, departmentId, options)`

Department Managers must only access assigned departments unless they are Main Admin.

### Route Protection

Public routes:

- `/`
- `/login`
- `/register-organization`

Protected examples:

- `/dashboard`
- `/tasks`
- `/leave`
- `/shifts`
- `/admin/*`
- `/manager/*`

Use Next.js `proxy.ts` for coarse route protection, but always keep server-side checks in protected pages/actions/APIs.

### Header

- Guest users: show Login where relevant.
- Authenticated users: show user name, organization name, and Logout.
- Do not expose JWTs to client JavaScript.

### Cleanup

Plan a scheduled cleanup job for expired:

- `sessions`
- `csrf_tokens`

Use Drizzle migrations for all schema changes.
