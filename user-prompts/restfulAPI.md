## 6. Minimalistic RESTful API

Build a minimalistic RESTful API in the Next.js project for Expo mobile app clients.

Start from the very basic mobile functionality:

- login
- load dashboard with calendar view
- list tasks
- list shifts
- list leave requests
- create leave request
- mark notifications as read



---

### API Endpoints

- `POST /api/auth/login` – login by email + password → return JWT token, user info, organization info and role info.

- `GET /api/dashboard` – return the user dashboard summary, with JWT auth.

  The dashboard response should include:

  - active tasks count
  - upcoming shifts count
  - pending leave requests count
  - unread notifications count
  - calendar events for the selected date range

- `GET /api/tasks` – list tasks visible to the logged-in user, with JWT auth and paging.

  Visibility rules:

  - Employees see their assigned tasks.
  - Department Managers see tasks from departments they manage.
  - Main Admins see tasks from their organization.

- `GET /api/tasks/[id]` – get task details, with JWT auth.

  Return:

  - title
  - description
  - department
  - assigned user
  - status
  - priority
  - due date

- `POST /api/tasks/[id]/status` – update task status, with JWT auth.

  Allowed statuses:

  - `todo`
  - `in_progress`
  - `completed`
  - `cancelled`

- `GET /api/shifts` – list shifts visible to the logged-in user, with JWT auth and paging.

  Visibility rules:

  - Employees see assigned shifts.
  - Department Managers see shifts from departments they manage.
  - Main Admins see shifts from their organization.

- `GET /api/shifts/[id]` – get shift details, with JWT auth.

  Return:

  - title
  - department
  - start time
  - end time
  - location
  - status
  - assigned employees

- `GET /api/leave` – list leave requests visible to the logged-in user, with JWT auth and paging.

  Visibility rules:

  - Employees see their own leave requests.
  - Department Managers see leave requests from departments they manage.
  - Main Admins see leave requests from their organization.


- `POST /api/leave` – create a new leave request for the logged-in user, with JWT auth.

  Request body:

  - leave type
  - start date
  - end date
  - reason

  Initial status should be:

  ```txt
  pending
  ```

- `POST /api/leave/[id]/approve` – approve a leave request, with JWT auth.

  Rules:

  - Department Managers can approve requests only from departments they manage.
  - Main Admins can approve requests from their organization.
  - Employees cannot approve leave requests.

- `POST /api/leave/[id]/reject` – reject a leave request, with JWT auth.

  Request body:

  - review comment

  Rules:

  - Department Managers can reject requests only from departments they manage.
  - Main Admins can reject requests from their organization.
  - Employees cannot reject leave requests.

- `GET /api/notifications` – list current user notifications, with JWT auth and paging.

- `POST /api/notifications/[id]/read` – mark one notification as read, with JWT auth.

- `POST /api/notifications/read-all` – mark all current user notifications as read, with JWT auth.

- `GET /api/docs` – display the API documentation as HTML, needed for the Expo app.

---

## Dashboard Calendar

The dashboard API must support calendar data.

`GET /api/dashboard` should accept optional query parameters:

```txt
startDate
endDate
departmentId
```

Calendar events should include:

```txt
id
title
type
start
end
departmentName
actionUrl
```

Supported calendar event types:

```txt
task_due
shift
leave
```

Calendar visibility rules:

- Employees see only their own assigned shifts, task due dates and leave requests.
- Department Managers see calendar events from departments they manage.
- Main Admins see calendar events from their own organization.
- No user can see calendar data from another organization.

---

## API Authentication Rules

All endpoints except these require JWT Bearer authentication:

```txt
POST /api/auth/login
GET /api/docs
```

Mobile clients must send the token as:

```txt
Authorization: Bearer <token>
```

Every protected endpoint must:

- validate the JWT token
- load the current user
- check that the user is active
- enforce organization access
- enforce department access when needed
- return safe error messages

---

## Paging

List endpoints should support paging.

Query parameters:

```txt
page
pageSize
```

Default values:

```txt
page = 1
pageSize = 20
```

Response format:

```txt
items
page
pageSize
totalCount
totalPages
```

---

## Expected Result

After implementation:

- mobile users can log in and receive a JWT token
- mobile app can load dashboard summary
- dashboard response includes calendar events
- mobile app can list and view tasks
- mobile app can update task status
- mobile app can list and view shifts
- mobile app can list and create leave requests
- Department Managers can approve or reject leave requests
- mobile app can list and update notifications
- API documentation is available at `/api/docs`
