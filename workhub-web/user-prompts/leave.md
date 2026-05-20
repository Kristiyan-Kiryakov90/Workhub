## Leave Requests Page

Logged-in users can browse and manage leave requests according to their role and department access.

Create a page:
/leave


---

### Leave Request Visibility Rules

- Employees can view:
  - only their own leave requests

- Department Managers can view:
  - their own leave requests
  - leave requests submitted by employees in departments they manage

- Main Admins can view:
  - all leave requests in their own organization

- No user can view leave requests from another organization.

---

### Leave Request Types

Always display the leave type of each request:

- `sick`
- `vacation`
- `unpaid`
- `remote`
- `personal`
- `training`

Use user-friendly labels in the UI, for example:

- Sick Leave
- Vacation Leave
- Unpaid Leave
- Remote Work Day
- Personal Leave
- Training Leave

---

### Leave Request Statuses

Always display the status of each leave request:

- `pending`
- `approved`
- `rejected`

Use visual badges or status labels.

---

# Create the Leave Requests Page: `/leave`

The Leave Requests page should display different sections depending on the current user's role.

---

# Employee Leave View

## Section "My Leave Requests"

Display all leave requests submitted by the current user.

Each leave request card or table row should show:

- leave type
- start date
- end date
- reason preview
- status
- reviewed by, when available
- review comment, when available

Order requests by:

1. pending requests first
2. newest requests next

Clicking on a leave request opens the Leave Request Details page:
/leave/[id]

---

## Section "Request Leave"

Employees should be able to start a new leave request.

Display a button:
[Request Leave]


The button should lead to:
/leave/new


Show this button to:
- Employees
- Department Managers
- Main Admins

because all logged-in users may need to submit their own leave requests.

---

# Department Manager Leave View

Department Managers should see their own leave requests plus approval work for departments assigned to them.

A Department Manager may manage more than one department.

---

## Section "Pending Department Approvals"

This should be the main management section for Department Managers.

Display leave requests:

- from employees in departments managed by the current user
- with status `pending`

Each leave request should show:

- employee name
- department
- leave type
- start date
- end date
- reason preview
- submitted date

Order requests by creation date, newest first.

Clicking on a leave request opens:
/manager/leave/[id]


---

## Section "Recently Reviewed Department Requests"

Display recently approved or rejected leave requests from departments managed by the current user.

Each row or card should show:

- employee name
- department
- leave type
- date range
- decision status
- reviewed date
- reviewed by

Order by reviewed date, newest first.

Clicking on a request opens:
/manager/leave/[id]

---

# Main Admin Leave View

Main Admins should see their own leave requests plus organization-wide visibility.

---

## Section "Pending Requests Across Organization"

Display leave requests:

- from the current organization
- with status `pending`

Each request should show:

- employee name
- department
- leave type
- start date
- end date
- reason preview
- submitted date

Order requests by creation date, newest first.

Clicking on a request opens:
/admin/leave/[id]

---

## Section "Recently Reviewed Requests"

Display recently approved or rejected leave requests across the organization.

Each request should show:

- employee name
- department
- leave type
- date range
- status
- reviewed by
- reviewed date

Order by reviewed date, newest first.

---

# Leave Request Filtering

Add filters to help users navigate leave requests.

Suggested filters:

- status
- leave type
- department, when the user has access to more than one department
- employee, for Department Managers and Main Admins

Examples:
Status: All | Pending | Approved | Rejected
Type: All | Sick | Vacation | Unpaid | Remote | Personal | Training
Department: All accessible departments


Filtering should work server-side when possible.

---

# Leave Request Search

Add a search input where appropriate.

Suggested search behavior:

- Department Managers and Main Admins can search by employee name or email.
- Search results must remain limited to data the current user is authorized to view.

---

# Pagination

Implement server-side pagination for leave request lists.

- Do not load all leave requests at once.
- Pagination must work together with:
  - filters
  - search
  - role-based visibility

---

# Empty States

Implement useful empty states.

Examples:

- Employee has no requests:
  - `You have not submitted any leave requests yet.`

- No pending approvals:
  - `There are no leave requests waiting for approval.`

- No requests match filters:
  - `No leave requests match the selected filters.`

---

# Page Navigation

Display `[Leave]` in the site header navigation for logged-in users.

The Leave link should be visible to:

- Employees
- Department Managers
- Main Admins

---

# Authorization Rules

- Employees can view only their own leave requests.
- Department Managers can view and review leave requests only from departments assigned to them.
- Main Admins can view organization-wide leave requests only inside their own organization.
- Every server-side leave query must enforce organization separation.
- Do not rely only on frontend hiding; enforce access rules in services and database queries.

---
