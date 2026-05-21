## Reports Page

Logged-in users can browse reports according to their role and department access.

Reports help Main Admins and Department Managers understand workload, leave activity, shift planning, task progress and department performance.

Create a page:

```txt
/reports
```

---

### Report Visibility Rules

- Department Managers can view:
  - reports only for departments they manage

- Main Admins can view:
  - reports for all departments inside their own organization

- No user can view reports from another organization.

---

# Create the Reports Page: `/reports`

The Reports page should display useful statistics and summaries.

Use cards, charts and tables where appropriate.

Keep the first implementation simple and focused on data already available in the database:

- users
- departments
- leave requests
- shifts
- tasks

---


# Department Manager Reports View

Department Managers should see reports for all departments assigned to them.

A Department Manager may manage more than one department.

---

## Section "Department Summary"

Display summary cards for departments managed by the current user:

- total employees
- active tasks
- completed tasks
- pending leave requests
- approved leave requests
- upcoming shifts
- completed shifts

If the manager manages more than one department, show a department filter.

Example:

```txt
Department: All My Departments | Human Resources | Public Works | Transport Operations
```

---

## Section "Task Report"

Display task statistics for managed departments:

- tasks by status:
  - todo
  - in_progress
  - completed
  - cancelled

- tasks by priority:
  - low
  - medium
  - high
  - urgent

- overdue tasks count
- tasks due this week

Use cards or simple charts.

---

## Section "Leave Report"

Display leave statistics for managed departments:

- pending leave requests
- approved leave requests
- rejected leave requests
- sick leave requests
- vacation leave requests
- upcoming approved leave

The report should help the Department Manager detect staffing risks.

---

## Section "Shift Report"

Display shift statistics for managed departments:

- upcoming shifts
- completed shifts
- cancelled shifts
- shifts without assigned employees
- shifts this week
- shifts this month

---

# Main Admin Reports View

Main Admins should see organization-wide reports.

---

## Section "Organization Summary"

Display organization-level summary cards:

- total departments
- total active users
- total department managers
- total active tasks
- total pending leave requests
- total upcoming shifts

---

## Section "Department Comparison"

Display a comparison table for all departments in the organization.

Each department row should show:

- department name
- number of employees
- active tasks
- completed tasks
- pending leave requests
- upcoming shifts

Order departments alphabetically or by highest activity.

Clicking a department row may open:

```txt
/admin/departments/[id]
```

---

## Section "Organization Task Report"

Display task statistics across the organization:

- tasks by status
- tasks by priority
- overdue tasks
- tasks due this week
- active tasks by department

---

## Section "Organization Leave Report"

Display leave statistics across the organization:

- pending leave requests
- approved leave requests
- rejected leave requests
- leave requests by department
- leave requests by type
- upcoming approved leave

---

## Section "Organization Shift Report"

Display shift statistics across the organization:

- upcoming shifts
- completed shifts
- cancelled shifts
- shifts by department
- shifts without assigned employees

---

# Report Filters

Add filters to help users analyze reports.

Suggested filters:

- department
- date range
- task status
- leave status
- shift status

Examples:

```txt
Department: All accessible departments
Date Range: This Week | This Month | Last 30 Days | Custom
Task Status: All | Todo | In Progress | Completed | Cancelled
Leave Status: All | Pending | Approved | Rejected
Shift Status: All | Scheduled | Completed | Cancelled
```

Filters should work server-side when possible.

---

---

# Empty States

Implement useful empty states.

Examples:

- No report data:
  - `No report data available for the selected filters.`

- No managed departments:
  - `You are not assigned as manager to any department.`

- No organization data:
  - `No organization activity found yet.`

---

# Page Navigation

Display `[Reports]` in the site header navigation for logged-in users who have report access.

The Reports link should be visible to:

- Department Managers
- Main Admins

Optionally visible to Employees if personal reports are implemented.

---



## Time Frame Statistics

Reports must support statistics for different time frames.

Users with report access should be able to choose a reporting period.

Supported time frame options:


- This Month
- Last 30 Days
- This Quarter
- This Year
- Last Year
- Custom Date Range
- Last 2 Years
- Last 3 Years
- Last 5 Years

The maximum supported reporting range is:

```txt
5 years
```

---

