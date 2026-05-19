## Seed Sample Data

Create a script `npm run db:seed` to seed sample data to the database.

The seed script should create realistic sample data for multiple organizations, departments, users, roles, permissions, leave requests, shifts, shift assignments, and tasks.

Use password:

- `pass123`

for all seeded demo users.

---

# Seed Rules

## Organizations and Main Admins

Create multiple organizations.

Each organization MUST have its own dedicated `Main Admin`.

A Main Admin:
- belongs only to their organization
- has full access inside that organization
- can manage departments, users, roles, permissions, leave requests, shifts, and tasks inside that organization
- must not have access to other organizations

---

## Department Managers

A Department Manager may be assigned to one or more departments within the same organization.

Example:

- one manager may manage only `Human Resources`
- another manager may manage both `Public Works` and `Transport Operations`

The seed script should demonstrate both cases.

---

# Create Sample Organizations

Create sample organizations:

- `Sofia Municipality`
- `BrightCare Medical Center`

---

# Create Default Permissions

Create the main system permissions needed by the app:

- `departments.create`
- `departments.update`
- `departments.delete`
- `departments.view`

- `users.create`
- `users.update`
- `users.deactivate`
- `users.assign_role`

- `roles.create`
- `roles.update`
- `roles.delete`
- `roles.assign_permissions`

- `leave.request`
- `leave.view_own`
- `leave.view_department`
- `leave.approve`
- `leave.reject`

- `shifts.view_own`
- `shifts.view_department`
- `shifts.create`
- `shifts.update`
- `shifts.cancel`
- `shifts.assign_employee`

- `tasks.view_own`
- `tasks.view_department`
- `tasks.create`
- `tasks.update`
- `tasks.delete`
- `tasks.assign`

---

# Create Roles for Each Organization

For each organization, create:

- `Main Admin`
- `Department Manager`
- `Employee`

## Role Permissions

### Main Admin

Has all permissions inside their organization.

### Department Manager

Can:
- view assigned department data
- view employees in assigned departments
- approve and reject leave requests for employees in assigned departments
- create, update, cancel, and assign shifts in assigned departments
- create, update, delete, and assign tasks in assigned departments

### Employee

Can:
- request leave
- view own leave requests
- view own shifts
- view own tasks

---

# Seed Organization 1: Sofia Municipality

## Create Sample Users

Create users:

- `admin@sofia.gov` / `pass123` — Main Admin
- `maria.hr@sofia.gov` / `pass123` — Department Manager
- `ivan.operations@sofia.gov` / `pass123` — Department Manager
- `elena.hr@sofia.gov` / `pass123` — Employee
- `petar.hr@sofia.gov` / `pass123` — Employee
- `georgi.works@sofia.gov` / `pass123` — Employee
- `stefan.works@sofia.gov` / `pass123` — Employee
- `radostina.transport@sofia.gov` / `pass123` — Employee
- `nikolay.transport@sofia.gov` / `pass123` — Employee

---

## Create Departments

Create departments:

- `Human Resources`
- `Public Works`
- `Transport Operations`

---

## Assign Main Admin

Assign:

- `admin@sofia.gov` → `Main Admin`

This user is the main administrator of `Sofia Municipality`.

---

## Assign Department Managers

Assign department managers as follows:

### Human Resources
Manager:
- `maria.hr@sofia.gov`

### Public Works
Manager:
- `ivan.operations@sofia.gov`

### Transport Operations
Manager:
- `ivan.operations@sofia.gov`

This demonstrates that one Department Manager can manage more than one department.

---

## Assign Department Members

### Human Resources
Members:
- Maria HR — manager
- Elena HR — employee
- Petar HR — employee

### Public Works
Members:
- Ivan Operations — manager
- Georgi Works — employee
- Stefan Works — employee

### Transport Operations
Members:
- Ivan Operations — manager
- Radostina Transport — employee
- Nikolay Transport — employee

---

## Assign Roles

- `admin@sofia.gov` → Main Admin
- `maria.hr@sofia.gov` → Department Manager
- `ivan.operations@sofia.gov` → Department Manager
- all other Sofia Municipality users → Employee

---

## Create Leave Requests

### Human Resources

- Elena HR requests `vacation leave`
  - Date: today + 10 days to today + 14 days
  - Status: `pending`
  - Reason: `Family vacation planned in advance.`

- Petar HR requests `sick leave`
  - Date: today - 2 days to today
  - Status: `approved`
  - Reviewed by: Maria HR
  - Review comment: `Approved. Get well soon.`

### Public Works

- Georgi Works requests `sick leave`
  - Date: today + 1 day to today + 3 days
  - Status: `pending`
  - Reason: `Medical procedure and recovery.`

- Stefan Works requests `vacation leave`
  - Date: today + 20 days to today + 25 days
  - Status: `rejected`
  - Reviewed by: Ivan Operations
  - Review comment: `Rejected due to planned road repair operations during this period.`

### Transport Operations

- Radostina Transport requests `personal leave`
  - Date: today + 6 days
  - Status: `pending`
  - Reason: `Personal appointment.`

- Nikolay Transport requests `sick leave`
  - Date: today - 5 days to today - 3 days
  - Status: `approved`
  - Reviewed by: Ivan Operations
  - Review comment: `Approved after medical document review.`

---

## Create Shifts

### Public Works

- Date: today + 1 day
  - Title: `Morning Street Maintenance`
  - Time: `08:00 - 16:00`
  - Location: `Central District`
  - Status: `scheduled`

- Date: today + 2 days
  - Title: `Park Cleaning Shift`
  - Time: `07:00 - 15:00`
  - Location: `South Park`
  - Status: `scheduled`

- Date: today - 3 days
  - Title: `Emergency Road Inspection`
  - Time: `09:00 - 17:00`
  - Location: `Industrial Zone`
  - Status: `completed`

### Transport Operations

- Date: today + 1 day
  - Title: `Morning Bus Dispatch Coordination`
  - Time: `06:00 - 14:00`
  - Location: `Central Depot`
  - Status: `scheduled`

- Date: today + 3 days
  - Title: `Evening Route Monitoring`
  - Time: `14:00 - 22:00`
  - Location: `Operations Control Room`
  - Status: `scheduled`

### Human Resources

- Date: today + 3 days
  - Title: `Recruitment Interview Support`
  - Time: `09:00 - 17:00`
  - Location: `Municipality HQ`
  - Status: `scheduled`

---

## Assign Employees to Shifts

### Morning Street Maintenance
- Georgi Works
- Stefan Works

### Park Cleaning Shift
- Stefan Works

### Emergency Road Inspection
- Ivan Operations
- Georgi Works

### Morning Bus Dispatch Coordination
- Radostina Transport
- Nikolay Transport

### Evening Route Monitoring
- Nikolay Transport

### Recruitment Interview Support
- Elena HR
- Petar HR

---

## Create Tasks

### Human Resources

- `Prepare monthly employee leave report`
  - Priority: `high`
  - Status: `in_progress`
  - Due date: today + 5 days
  - Assigned to: Elena HR

- `Update onboarding checklist`
  - Priority: `medium`
  - Status: `todo`
  - Due date: today + 8 days
  - Assigned to: Petar HR

### Public Works

- `Inspect damaged street lights near Central Square`
  - Priority: `urgent`
  - Status: `todo`
  - Due date: today + 2 days
  - Assigned to: Georgi Works

- `Prepare weekly maintenance schedule`
  - Priority: `high`
  - Status: `in_progress`
  - Due date: today + 4 days
  - Assigned to: Ivan Operations

- `Check cleanliness reports from South Park`
  - Priority: `medium`
  - Status: `completed`
  - Due date: today - 1 day
  - Assigned to: Stefan Works

### Transport Operations

- `Review delayed route reports from the last 7 days`
  - Priority: `high`
  - Status: `in_progress`
  - Due date: today + 3 days
  - Assigned to: Ivan Operations

- `Prepare vehicle allocation list for weekend schedule`
  - Priority: `medium`
  - Status: `todo`
  - Due date: today + 6 days
  - Assigned to: Radostina Transport

- `Confirm driver coverage for Route 72`
  - Priority: `urgent`
  - Status: `todo`
  - Due date: today + 1 day
  - Assigned to: Nikolay Transport

---

# Seed Organization 2: BrightCare Medical Center

## Create Sample Users

Create users:

- `admin@brightcare.com` / `pass123` — Main Admin
- `anna.clinical@brightcare.com` / `pass123` — Department Manager
- `viktor.admin@brightcare.com` / `pass123` — Department Manager
- `nina.nurse@brightcare.com` / `pass123` — Employee
- `martin.nurse@brightcare.com` / `pass123` — Employee
- `stela.lab@brightcare.com` / `pass123` — Employee
- `kalina.admin@brightcare.com` / `pass123` — Employee
- `boris.admin@brightcare.com` / `pass123` — Employee

---

## Create Departments

Create departments:

- `Nursing`
- `Laboratory`
- `Administration`

---

## Assign Main Admin

Assign:

- `admin@brightcare.com` → `Main Admin`

This user is the main administrator of `BrightCare Medical Center`.

---

## Assign Department Managers

### Nursing
Manager:
- `anna.clinical@brightcare.com`

### Laboratory
Manager:
- `anna.clinical@brightcare.com`

### Administration
Manager:
- `viktor.admin@brightcare.com`

This demonstrates that one Department Manager can manage multiple departments.

---

## Assign Department Members

### Nursing
Members:
- Anna Clinical — manager
- Nina Nurse — employee
- Martin Nurse — employee

### Laboratory
Members:
- Anna Clinical — manager
- Stela Lab — employee

### Administration
Members:
- Viktor Admin — manager
- Kalina Admin — employee
- Boris Admin — employee

---

## Assign Roles

- `admin@brightcare.com` → Main Admin
- `anna.clinical@brightcare.com` → Department Manager
- `viktor.admin@brightcare.com` → Department Manager
- all other BrightCare Medical Center users → Employee

---

## Create Leave Requests

### Nursing

- Nina Nurse requests `sick leave`
  - Date: today + 2 days to today + 4 days
  - Status: `pending`
  - Reason: `Medical leave requested.`

- Martin Nurse requests `vacation leave`
  - Date: today + 15 days to today + 20 days
  - Status: `approved`
  - Reviewed by: Anna Clinical
  - Review comment: `Approved. Shift coverage is available.`

### Laboratory

- Stela Lab requests `sick leave`
  - Date: today + 5 days to today + 7 days
  - Status: `pending`
  - Reason: `Recovery after outpatient procedure.`

### Administration

- Kalina Admin requests `vacation leave`
  - Date: today + 7 days to today + 9 days
  - Status: `pending`
  - Reason: `Short personal trip.`

- Boris Admin requests `personal leave`
  - Date: today - 8 days
  - Status: `approved`
  - Reviewed by: Viktor Admin
  - Review comment: `Approved.`

---

## Create Shifts

### Nursing

- Date: today + 1 day
  - Title: `Morning Nursing Shift`
  - Time: `07:00 - 15:00`
  - Location: `Ward A`
  - Status: `scheduled`

- Date: today + 1 day
  - Title: `Evening Nursing Shift`
  - Time: `15:00 - 23:00`
  - Location: `Ward A`
  - Status: `scheduled`

- Date: today - 2 days
  - Title: `Night Nursing Shift`
  - Time: `23:00 - 07:00`
  - Location: `Emergency Unit`
  - Status: `completed`

### Laboratory

- Date: today + 2 days
  - Title: `Morning Laboratory Processing`
  - Time: `08:00 - 16:00`
  - Location: `Main Lab`
  - Status: `scheduled`

### Administration

- Date: today + 2 days
  - Title: `Front Desk Coverage`
  - Time: `08:30 - 16:30`
  - Location: `Reception`
  - Status: `scheduled`

---

## Assign Employees to Shifts

### Morning Nursing Shift
- Nina Nurse

### Evening Nursing Shift
- Martin Nurse

### Night Nursing Shift
- Anna Clinical
- Nina Nurse

### Morning Laboratory Processing
- Stela Lab

### Front Desk Coverage
- Kalina Admin
- Boris Admin

---

## Create Tasks

### Nursing

- `Review weekly patient room staffing needs`
  - Priority: `high`
  - Status: `in_progress`
  - Due date: today + 3 days
  - Assigned to: Anna Clinical

- `Prepare shift handover notes`
  - Priority: `medium`
  - Status: `todo`
  - Due date: today + 1 day
  - Assigned to: Martin Nurse

### Laboratory

- `Verify reagent stock for next week`
  - Priority: `high`
  - Status: `todo`
  - Due date: today + 2 days
  - Assigned to: Stela Lab

### Administration

- `Update visitor access procedure document`
  - Priority: `medium`
  - Status: `todo`
  - Due date: today + 6 days
  - Assigned to: Kalina Admin

- `Prepare monthly office supply request`
  - Priority: `low`
  - Status: `completed`
  - Due date: today - 2 days
  - Assigned to: Boris Admin

---

# Final Seed Script Requirements

The `npm run db:seed` script should:

- clear or safely reset seeded sample data before inserting new seed data
- hash all passwords securely before insertion
- insert organizations first
- create exactly one Main Admin for each organization
- insert permissions
- insert roles for each organization
- assign permissions to roles
- insert users
- assign roles to users
- insert departments
- assign department members
- allow one Department Manager to be assigned to multiple departments
- insert leave requests
- insert shifts
- insert shift assignments
- insert tasks

Run the DB seed script.
