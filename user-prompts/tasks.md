## Tasks Page

Logged-in users can browse tasks available to them according to their role and department access.

Create a page:

/tasks

---

### Task Visibility Rules

- Employees can view:
  - tasks assigned to them

- Department Managers can view:
  - tasks assigned to them
  - all tasks from departments they manage

- Main Admins can view:
  - all tasks in their own organization

- No user can view tasks from another organization.

---

### Task Statuses

Always display the status of each task:

- `todo`
- `in_progress`
- `completed`
- `cancelled`

---

### Task Priorities

Always display the priority of each task:

- `low`
- `medium`
- `high`
- `urgent`

Use visual badges or color indicators to make priorities easy to recognize.

---

# Create the Tasks Page: `/tasks`

The Tasks page should display tasks in clear sections.

---

## Section "Active Tasks"

This should be the main section of the page.

Display tasks with status:

- `todo`
- `in_progress`

Each task card or table row should show:

- title
- department
- assigned employee
- status
- priority
- due date
- created date, optional
- description, optional
- checklist, optional
- notes, optional

Order active tasks by:

1. overdue tasks first
2. nearest due date next
3. newest tasks last when dates are equal

Visually highlight:

- overdue tasks
- urgent tasks
- unassigned tasks, if allowed in the current implementation

Clicking on a task opens the Task Details page:

/tasks/[id]


---

## Section "Completed and Cancelled Tasks"

This is a secondary archive section.

Display tasks with status:

- `completed`
- `cancelled`


Order archived tasks by most recently updated first.

Clicking on a task opens:

/tasks/[id]


---

# Task Filtering

Add filters to help users navigate the task list.

Suggested filters:

- status
- priority
- department, when the user has access to multiple departments
- assigned employee, for Department Managers and Main Admins

Examples:
Status: All | Todo | In Progress | Completed | Cancelled
Priority: All | Low | Medium | High | Urgent
Department: All accessible departments


Filtering should work server-side when possible.

---

# Task Search

Add a search input to search tasks by title.

- Search should work together with filters.
- Keep the implementation simple and efficient.
- Search should only return tasks the current user is authorized to view.

---

# Pagination

Implement server-side pagination for the task list.

- Do not load all tasks at once.
- Add page navigation or "Load More" behavior.
- Pagination must work together with:
  - filters
  - search
  - role-based visibility

---

# Department Manager Actions

Department Managers should see additional task management actions for departments they manage.

Display a button:
[Create Task]


The button should lead to:
/tasks/new


Only show this button to users who have permission to create tasks.

Department Managers and Main Admins may later manage tasks through dedicated create, edit, and delete pages.

---

# Main Admin Access

Main Admins can browse all tasks within their organization.

Main Admin task view should still support:

- filtering by department
- filtering by assigned employee
- filtering by task status
- filtering by priority
- pagination

---

# Empty States

Implement useful empty states.

Examples:

- No active tasks:
  - `No active tasks found.`

- No archived tasks:
  - `No completed or cancelled tasks found.`

- No search results:
  - `No tasks match the selected filters.`

---

# Page Navigation

Display `[Tasks]` in the site header navigation for logged-in users.

---

# Authorization Rules

- Employees can only see their assigned tasks, edit status, notes
- Department Managers can see tasks from departments assigned to them.
- Main Admins can see all tasks in their organization.
- Every server-side task query must enforce organization separation.
- Do not rely only on frontend hiding; enforce access rules in services and database queries.

---