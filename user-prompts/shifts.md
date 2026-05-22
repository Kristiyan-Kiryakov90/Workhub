## Shifts Page

Logged-in users can browse work shifts according to their role and department access.

Create a page:

```txt
/shifts
```

---

### Shift Visibility Rules

- Employees can view:
  - only shifts assigned to them

- Department Managers can view:
  - shifts assigned to them
  - all shifts from departments they manage

- Main Admins can view:
  - all shifts in their own organization

- No user can view shifts from another organization.

---

### Shift Statuses

Always display the status of each shift:

- `scheduled`
- `completed`
- `cancelled`

Use visual badges or status labels in the UI.

---

# Create the Shifts Page: `/shifts`

The Shifts page should display different sections depending on the current user's role.

---

# Employee Shift View

## Section "My Upcoming Shifts"

This should be the main section for Employees.

Display shifts:

- assigned to the current user
- with start time in the future
- with status `scheduled`

Each shift card or table row should show:

- shift title
- department
- date
- start time
- end time
- location
- status

Order shifts by start time, nearest first.

Clicking on a shift opens the Shift Details page:

```txt
/shifts/[id]
```

---

## Section "My Past and Cancelled Shifts"

This is a secondary archive section.

Display shifts:

- assigned to the current user
- with status `completed` or `cancelled`
- or with end time already passed

Each shift should show:

- shift title
- department
- date
- start time
- end time
- location
- status

Order archived shifts by date, newest first.

Clicking on a shift opens:

```txt
/shifts/[id]
```

---

# Department Manager Shift View

Department Managers should see their own assigned shifts plus management sections for all departments assigned to them.

A Department Manager may manage more than one department.

---

## Section "Upcoming Department Shifts"

This should be the main management section for Department Managers.

Display shifts:

- belonging to departments managed by the current user
- with start time in the future
- with status `scheduled`

Each shift card or table row should show:

- shift title
- department
- date
- start time
- end time
- location
- number of assigned employees
- status

Order shifts by start time, nearest first.

Clicking on a shift opens:

```txt
/manager/shifts/[id]
```

---

## Section "Completed or Cancelled Department Shifts"

Display shifts from departments managed by the current user that are:

- `completed`
- `cancelled`
- or already past

Each shift should show:

- shift title
- department
- date
- start time
- end time
- location
- number of assigned employees
- status

Order shifts by date, newest first.

Clicking on a shift opens:

```txt
/manager/shifts/[id]
```

---

## Department Manager Actions

Department Managers should be able to organize shifts for departments they manage.

Display a button:

```txt
[Create Shift]
```

The button should lead to:

```txt
/shifts/new
```

Only show this button to users who have permission to create shifts.

---

# Main Admin Shift View

Main Admins should see organization-wide shift information.

---

## Section "Upcoming Shifts Across Organization"

Display upcoming scheduled shifts across all departments in the current organization.

Each shift should show:

- shift title
- department
- date
- start time
- end time
- location
- number of assigned employees
- status

Order shifts by start time, nearest first.

Clicking on a shift opens:

```txt
/shifts/[id]
```

---

## Section "Shift Archive"

Display recently completed or cancelled shifts across the organization.

Each shift should show:

- shift title
- department
- date
- time
- status
- assigned employee count

Order archived shifts by date, newest first.

---

# Shift Filtering

Add filters to help users navigate shift lists.

Suggested filters:

- status
- department, when the user has access to more than one department
- date range
- assigned employee, for Department Managers and Main Admins

Examples:

```txt
Status: All | Scheduled | Completed | Cancelled
Department: All accessible departments
Date Range: Upcoming | Today | This Week | This Month | Custom
```

Filtering should work server-side when possible.

---

# Shift Search

Add a search input to search shifts by:

- title
- location
- employee

Search must work together with filters.

Search results must only include shifts the current user is authorized to view.

---

# Pagination

Implement server-side pagination for shift lists.

- Do not load all shifts at once.
- Pagination must work together with:
  - filters
  - search
  - role-based visibility

---

# Empty States

Implement useful empty states.

Examples:

- No upcoming shifts:
  - `You have no upcoming shifts.`

- No department shifts:
  - `There are no scheduled shifts for your departments.`

- No archived shifts:
  - `No completed or cancelled shifts found.`

- No shifts match filters:
  - `No shifts match the selected filters.`

---

# Page Navigation

Display `[Shifts]` in the site header navigation for logged-in users.

The Shifts link should be visible to:

- Employees
- Department Managers
- Main Admins

---

# Authorization Rules

- Employees can view only shifts assigned to them.
- Department Managers can view shifts only from departments assigned to them, plus their own assigned shifts.
- Main Admins can view all shifts in their organization.
- Every server-side shift query must enforce organization separation.
- Do not rely only on frontend hiding; enforce access rules in services and database queries.

---
