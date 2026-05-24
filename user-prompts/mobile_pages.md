## Implement Core Mobile Functionality

The Home and Login screens are already implemented.

Now implement the core WorkHub mobile app functionality using the RESTful API from the Next.js backend.

The mobile app should stay focused on everyday user actions.

Admin management pages should stay in the Web app.

---

# Mobile App Scope

Implement these screens:

```txt
Dashboard
Tasks
Task Details
Shifts
Shift Details
Leave Requests
Leave Details
Create Leave Request
Notifications
Profile
```

---

# API Configuration

The API client should:

- use the configured API URL
- attach JWT token to protected requests
- handle JSON responses
- handle API errors
- support loading states

JWT header format:

```txt
Authorization: Bearer <token>
```

---

# Authentication State

After login:

- save the JWT token securely
- navigate to Dashboard

On app start:

- check if a token exists
- if token exists, load `/api/me`
- if token is invalid or expired, clear token and return to Login

logout:

- clear stored token
- clear user state
- navigate to Home or Login

---

# Dashboard Screen

Create screen:

```txt
Dashboard
```

The Dashboard screen should show **only the calendar**.

Do not show summary cards on the mobile Dashboard.

Do not show task count, shift count, leave count or notification count on the mobile Dashboard.

Load calendar data from:

```txt
GET /api/dashboard
```

---

# Dashboard Calendar

The calendar must show different data depending on the logged-in user’s role.

The backend must enforce what events each user is allowed to see.

The mobile app should only display the returned calendar events.

---

## Employee Calendar

Employees see only their own events:

```txt
assigned shifts
own leave requests
own task due dates
```

Employees must not see:

```txt
other users' shifts
other users' leave requests
department-wide events
organization-wide events
```

---

## Department Manager Calendar

Department Managers see calendar events from departments they manage.

A Department Manager may manage one or more departments.

Department Manager calendar should include:

```txt
department shifts
employees' leave requests in managed departments
task due dates in managed departments
```

If the Department Manager manages multiple departments, add a department filter:

```txt
All Managed Departments
Department 1
Department 2
```

Department Managers must not see events from departments they do not manage.

---

## Main Admin Calendar

Main Admins see calendar events for their own organization.

Main Admin calendar should include:

```txt
all organization shifts
all organization leave requests
all organization task due dates
```

Add a department filter:

```txt
All Departments
Department 1
Department 2
Department 3
```

Main Admins must not see data from another organization.

---

# Calendar Views

Implement a simple calendar UI.

Recommended first implementation:

```txt
Month view
List view
```

The user should be able to switch between:

```txt
Month
List
```

---

# Calendar Date Range

The dashboard calendar should load events for the selected month.


# Calendar Event Format

Each calendar event returned by the API should include:

```txt
id
title
type
start
end
departmentName
actionUrl
```

Supported event types:

```txt
task_due
shift
leave
```

---

# Calendar Event Navigation

When a user taps a calendar event, navigate to the related screen.

Examples:

```txt
Task due date → Task Details
Shift event → Shift Details
Leave event → Leave Details
```

Use `actionUrl` or event metadata to determine where to navigate.

---

# Tasks Screen

Create screen:

```txt
Tasks
```

Load data from:

```txt
GET /api/tasks
```

Show task list with paging.

Each task item should show:

- title
- department
- status
- priority
- due date

Clicking a task opens:

```txt
Task Details
```

---

# Task Details Screen

Create screen:

```txt
Task Details
```

Load data from:

```txt
GET /api/tasks/[id]
```

Show:

- title
- description
- department
- assigned user
- status
- priority
- due date

Allow updating task status using:

```txt
POST /api/tasks/[id]/status
```

Allowed statuses:

```txt
todo
in_progress
completed
cancelled
```

---

# Shifts Screen

Create screen:

```txt
Shifts
```

Load data from:

```txt
GET /api/shifts
```

Show shift list with paging.

Each shift item should show:

- title
- department
- start time
- end time
- location
- status

Clicking a shift opens:

```txt
Shift Details
```

---

# Shift Details Screen

Create screen:

```txt
Shift Details
```

Load data from:

```txt
GET /api/shifts/[id]
```

Show:

- title
- department
- start time
- end time
- location
- status
- assigned employees
- notes, if available

---

# Leave Requests Screen

Create screen:

```txt
Leave Requests
```

Load data from:

```txt
GET /api/leave
```

Show leave requests with paging.

Each leave item should show:

- leave type
- start date
- end date
- status

Add button:

```txt
[Request Leave]
```

Clicking it opens:

```txt
Create Leave Request
```

Clicking a leave request opens:

```txt
Leave Details
```

---

# Leave Details Screen

Create screen:

```txt
Leave Details
```

Load data from:

```txt
GET /api/leave/[id]
```

Show:

- leave type
- start date
- end date
- reason
- status
- review comment
- reviewer, when available

If the logged-in user is Department Manager or Main Admin and the request is pending, show:

```txt
[Approve]
[Reject]
```

Use endpoints:

```txt
POST /api/leave/[id]/approve
POST /api/leave/[id]/reject
```

---

# Create Leave Request Screen

Create screen:

```txt
Create Leave Request
```

Submit to:

```txt
POST /api/leave
```

---

# Notifications Screen

Create screen:

```txt
Notifications
```

Load data from:

```txt
GET /api/notifications
```

Show notifications with paging.


Actions:

```txt
[Mark as Read]
[Mark All as Read]
```

Use endpoints:

```txt
POST /api/notifications/[id]/read
POST /api/notifications/read-all
```

---


# Navigation

Add navigation from Dashboard to:

```txt
Tasks
Shifts
Leave Requests
Notifications
Profile
```

---

# Loading, Error and Empty States

Every screen that loads data must support:

- loading state
- error state
- empty state
- pull-to-refresh where appropriate

Examples:

```txt
No calendar events for this period.
No tasks found.
No shifts found.
No leave requests found.
No notifications yet.
```

---

# Authorization and Security

The backend API must enforce:

- organization access
- department access
- role permissions

The mobile app should:

- display only API-returned data
- hide actions when user role does not allow them
- handle `401 Unauthorized` by logging out
- handle `403 Forbidden` with a clear message
- never store password values
- never log JWT tokens

---

# Expected Result

After implementation:

- Dashboard shows only the calendar
- calendar content is different for Employees, Department Managers and Main Admins
- users can list and view tasks
- users can update task status when allowed
- users can list and view shifts
- users can list and create leave requests
- managers/admins can approve or reject leave requests when allowed
- users can view and mark notifications as read
- users can view profile information and logout
