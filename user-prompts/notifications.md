## Notifications Page

Logged-in users can browse their personal notifications.

Notifications inform users about important actions and updates in WorkHub, such as task assignments, leave request decisions, shift changes, and manager actions.

Create a page:

```txt
/notifications
```

---

### Notification Visibility Rules

- Employees can view:
  - only notifications addressed to them

- Department Managers can view:
  - notifications addressed to them
  - management-related notifications for departments they manage, if implemented

- Main Admins can view:
  - notifications addressed to them
  - organization-level admin notifications, if implemented

- No user can view notifications from another organization.

---

### Notification Types

Support notification types such as:

- `task_assigned`
- `task_updated`
- `leave_submitted`
- `leave_approved`
- `leave_rejected`
- `shift_assigned`
- `shift_updated`
- `shift_cancelled`
- `role_assigned`
- `department_assigned`

Use user-friendly labels in the UI.

Examples:

- Task Assigned
- Leave Approved
- Shift Updated
- Department Assigned

---

### Notification Status

Each notification should show whether it is:

- unread
- read

Unread notifications should be visually highlighted.

---

# Create the Notifications Page: `/notifications`

The Notifications page should display all notifications for the current user.

---

## Section "Unread Notifications"

This should be the main section.

Display notifications where:

```txt
isRead = false
```

Each notification card or row should show:

- title
- message
- notification type
- created date/time
- related action link, if available

Order unread notifications by creation date, newest first.

Clicking a notification should:

- mark it as read
- navigate to the related page when `actionUrl` exists

Examples:

```txt
/tasks/[id]
/leave/[id]
/shifts/[id]
/manager/leave/[id]
```

---

## Section "Recent Notifications"

Display recent read notifications.

Each notification should show:

- title
- message
- notification type
- created date/time
- related action link, if available

Order notifications by creation date, newest first.

---

# Notification Actions

Implement the following actions:

```txt
[Mark as Read]
[Mark All as Read]
```

Optional future actions:

```txt
[Delete Notification]
[Clear Read Notifications]
```

---

# Header Notification Indicator

Add a notification indicator in the site header for logged-in users.

The header should display:

```txt
[Notifications]
```

or an icon with unread count.

Example:

```txt
Notifications (3)
```

The unread count should show only unread notifications for the current user.

Clicking it should open:

```txt
/notifications
```

---

# Notification Creation Rules

Create notifications when important events happen.

Examples:

## Task Events

When a task is assigned:

- notify the assigned user

Notification example:

```txt
Title: New task assigned
Message: You were assigned to "Prepare monthly employee leave report".
Action URL: /tasks/[id]
```

---

## Leave Events

When an employee submits a leave request:

- notify the Department Manager of the related department

Notification example:

```txt
Title: New leave request
Message: Elena HR submitted a vacation leave request.
Action URL: /manager/leave/[id]
```

When a leave request is approved or rejected:

- notify the employee who submitted the request

Notification example:

```txt
Title: Leave request approved
Message: Your sick leave request was approved.
Action URL: /leave/[id]
```

---

## Shift Events

When a shift is assigned:

- notify the assigned employee

Notification example:

```txt
Title: New shift assigned
Message: You were assigned to Morning Street Maintenance.
Action URL: /shifts/[id]
```

When a shift is updated or cancelled:

- notify all assigned employees

Notification example:

```txt
Title: Shift updated
Message: Your shift schedule has changed.
Action URL: /shifts/[id]
```

---

## Role and Department Events

When a user receives a new role:

- notify the user

When a user is added to a department:

- notify the user

---

# Notification Filtering

Add filters to help users navigate notifications.

Suggested filters:

- unread only
- read only
- notification type

Examples:

```txt
Status: All | Unread | Read
Type: All | Tasks | Leave | Shifts | Roles | Departments
```

Filtering should work server-side when possible.

---

# Pagination

Implement server-side pagination for notifications.

- Do not load all notifications at once.
- Pagination must work together with:
  - read/unread filter
  - type filter
  - user visibility

---

# Empty States

Implement useful empty states.

Examples:

- No unread notifications:
  - `You have no unread notifications.`

- No notifications:
  - `You have no notifications yet.`

- No notifications match filters:
  - `No notifications match the selected filters.`

---

# Authorization Rules

- Users can view only notifications addressed to them.
- Main Admins can view organization-level notifications only for their own organization, if such notifications are implemented.
- Every server-side notification query must enforce organization separation.
- Do not expose notifications from another organization.
- Do not rely only on frontend hiding; enforce access rules in services and database queries.

---

# Suggested Database Fields

Use the `notifications` table:

```txt
notifications
- id
- organizationId
- userId
- type
- title
- message
- relatedEntityType
- relatedEntityId
- actionUrl
- isRead
- readAt
- createdAt
```

---
