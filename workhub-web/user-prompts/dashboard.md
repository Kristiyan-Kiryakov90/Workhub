## User Dashboard

Logged-in users can browse a personal dashboard with the most important information for their daily work.

The dashboard should display different sections depending on the logged-in user’s role and department access.

- Employees should see their own tasks, shifts and leave requests.
- Department Managers should also see management information for all departments assigned to them.
- Main Admins should also see organization-wide summary information.


### General Dashboard Rules

- The Dashboard page is available only for logged-in users.
- Load the dashboard data server-side.
- Display only data that the current user is authorized to access.
- Use a responsive dashboard layout suitable for desktop, tablets and smartphones.
- Use cards, badges and visual indicators for statuses and priorities.
- Keep the dashboard clean and focused on actionable information.

---

# Employee Dashboard

## Section "My Active Tasks"

Display all active tasks assigned to the current user.

- Display tasks with status:
  - `todo`
  - `in_progress`

- Do not display tasks with status:
  - `completed`
  - `cancelled`

- Each task card should show:
  - task title
  - department
  - status
  - priority
  - due date

- Order tasks by due date, nearest first.

- Visually highlight:
  - overdue tasks
  - urgent tasks
  - high-priority tasks

- Clicking on a task card opens the Task Details page:

/tasks/[id]


---

## Section "My Upcoming Shifts"

Display all upcoming shifts assigned to the current user.

- Display only shifts:
  - assigned to the logged-in user
  - with start time in the future
  - not canceled

- Each shift card should show:
  - shift title
  - department
  - date
  - start time
  - end time
  - location
  - status

- Order shifts by date and start time, nearest first.

- Clicking on a shift card opens the Shift Details page:

/shifts/[id]


---

## Section "My Leave Requests"

Display the current user’s recent leave requests.

- Show:
  - leave type
  - start date
  - end date
  - status

- Status values:
  - `pending`
  - `approved`
  - `rejected`

- Display pending requests first.
- Then display the most recent approved or rejected requests.

- Clicking on a leave request opens the Leave Request Details page:

/leave/[id]


---

# Department Manager Dashboard

Department Managers should see their own employee dashboard sections and additional management sections for the departments assigned to them.

A Department Manager may manage more than one department.

---

## Section "Pending Leave Approvals"

Display leave requests waiting for approval in departments managed by the current user.

- Show only leave requests:
  - belonging to departments managed by the current user
  - with status `pending`

- Each leave request card should show:
  - employee name
  - department
  - leave type
  - start date
  - end date
  - short reason preview

- Order requests by creation date, newest first.

- Clicking on a leave request opens:

/manager/leave/[id]


---

## Section "Upcoming Department Shifts"

Display upcoming scheduled shifts in departments managed by the current user.

- Show only shifts:
  - belonging to departments managed by the current user
  - with start time in the future
  - not canceled

- Each shift card should show:
  - shift title
  - department
  - date
  - start time
  - end time
  - location
  - number of assigned employees

- Order shifts by date and start time, nearest first.

- Clicking on a shift card opens:

/manager/shifts/[id]

---

## Section "Department Tasks Overview"

Display active tasks from departments managed by the current user.

- Show tasks with status:
  - `todo`
  - `in_progress`

- Each task card should show:
  - task title
  - department
  - assigned employee
  - status
  - priority
  - due date

- Order tasks by due date, nearest first.

- Visually highlight:
  - overdue tasks
  - urgent tasks
  - unassigned tasks

- Clicking on a task card opens:

/manager/tasks/[id]

---

# Main Admin Dashboard

Main Admins should see their own dashboard sections and organization-level summary sections.

---

## Section "Organization Summary"

Display quick statistics for the current organization:

- total number of departments
- total number of active users
- total number of department managers
- total pending leave requests
- total upcoming shifts
- total active tasks

Display these as summary cards.

---

## Section "Pending Leave Requests Across Organization"

Display recent pending leave requests across all departments in the current organization.

- Show:
  - employee name
  - department
  - leave type
  - start date
  - end date
  - status

- Order by creation date, newest first.

- Clicking on a request opens:

/admin/leave/[id]

---

## Section "Recently Created Tasks"

Display the most recently created active tasks across the organization.

- Show:
  - task title
  - department
  - assigned employee
  - priority
  - status
  - due date

- Clicking on a task opens:

/tasks/[id]

---

# Dashboard Empty States

Implement useful empty states.

Examples:

- No active tasks:
  - `You have no active tasks.`

- No upcoming shifts:
  - `You have no upcoming shifts.`

- No leave requests:
  - `You have not submitted any leave requests yet.`

- No pending approvals:
  - `There are no leave requests waiting for approval.`

---

# Dashboard Navigation

Link the Dashboard page in the site header.

- Display `[Dashboard]` in the navigation for logged-in users.
- After successful login, redirect the user to:

/dashboard

instead of the Home page.

---

# Authorization Rules

- Employees can see only their own tasks, shifts and leave requests.
- Department Managers can see management data only for departments assigned to them.
- Main Admins can see organization-wide data only for their own organization.
- No dashboard query may expose data from another organization.

---
