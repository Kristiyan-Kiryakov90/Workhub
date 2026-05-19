# WorkHub Database Schema

## 1. Organizations

### organizations
- id
- name
- slug
- createdAt
- updatedAt

---

## 2. Users, Roles and Permissions

### users
- id
- organizationId
- email
- passwordHash
- name
- phone
- avatarUrl
- isActive
- createdAt
- updatedAt

### roles
- id
- organizationId
- name
- description
- createdAt
- updatedAt

### permissions
- id
- key
- description

### role_permissions
- id
- roleId
- permissionId

### user_roles
- id
- organizationId
- userId
- roleId

---

## 3. Departments

### departments
- id
- organizationId
- name
- description
- createdAt
- updatedAt

### department_members
- id
- organizationId
- departmentId
- userId
- isManager
- createdAt

---

## 4. Leave Requests

### leave_requests
- id
- organizationId
- departmentId
- userId
- type
- startDate
- endDate
- reason
- status
- reviewedByUserId
- reviewComment
- reviewedAt
- createdAt
- updatedAt

---

## 5. Shifts

### shifts
- id
- organizationId
- departmentId
- title
- startTime
- endTime
- location
- notes
- status
- createdByUserId
- createdAt
- updatedAt

### shift_assignments
- id
- organizationId
- shiftId
- userId
- assignedByUserId
- createdAt

---

## 6. Tasks

### tasks
- id
- organizationId
- departmentId
- title
- description
- status
- priority
- dueDate
- createdByUserId
- assignedToUserId
- createdAt
- updatedAt


Use simple numbers as IDs for table rows, not long identifiers.
Install libraries from npm: Drizzle ORM, Drizzle Kits, Neon DB drivers, dotenv.
Create a Drizzle schema file to implement the DB schema in a technical way.
Generate a migration from the Drizzle schema using Drizzle Kit: `npm db:generate`.
Run the Drizzle migration to the DB using Drizzle Kit: `npm db:migrate`.
