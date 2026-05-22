## Profile and User Management

Logged-in users can view, update, and delete their own profile.

Main Admins can manage all user profiles inside their organization, including deleting users, assigning departments, assigning roles, configuring permissions through roles, and generating invitation links.


---

# Profile Page

Create a page:

```txt
/profile
```

---

## Profile Visibility Rules

- Users can view only their own profile.
- Users can edit only allowed personal fields.
- Users can delete their own profile.
- Users cannot change their own role, permissions, department, or organization.
- Admin user management must be implemented separately under `/admin/users`.

---

# Section "Personal Information"

Display:

- full name
- email
- phone
- account status
- created date

Editable fields:

- full name
- phone

Do not implement avatars.

Do not allow users to edit:

- email, unless a separate email-change flow is implemented
- organization
- roles
- permissions
- department assignments
- account status

---

# Section "Organization Information"

Display:

- organization name
- user role or roles inside the organization

Example:

```txt
Organization: Sofia Municipality
Role: Department Manager
```

---

# Section "Department Memberships"

Display all departments where the user is a member.

Each department row should show:

- department name
- whether the user is a manager in that department
- membership date, if available

A Department Manager may be assigned to more than one department, so display all assigned departments.

---

# Section "Account Security"

Implement:

```txt
[Change Password]
```

The Change Password form should include:

- current password
- new password
- confirm new password

Password change flow:

1. Validate the current password.
2. Validate the new password.
3. Confirm that new password and confirm password match.
4. Hash the new password with `bcrypt`.
5. Save the new password hash.
6. Show a success message.

---

# Section "Delete My Profile"

Users should be able to delete their own profile.

Display a dangerous action section:

```txt
[Delete My Profile]
```

Self-delete rules:

- Ask for confirmation before deleting.
- Require the user to type a confirmation phrase, for example:

```txt
DELETE
```

- After deletion:
  - deactivate or delete the user account according to implementation choice
  - clear the session cookie
  - delete the user from the database
  - redirect to the home page



Do not allow self-delete if the user is the only Main Admin of the organization.

In that case, show:

```txt
You cannot delete your profile because you are the only Main Admin of this organization.
```

---

# Admin User Management

Create admin pages:

```txt
/admin/users
/admin/users/[id]
/admin/users/[id]/edit
/admin/invitations
```

These pages are available only to Main Admins.

---

## Admin Users List: `/admin/users`

The Main Admin can view all users in their own organization.

Each user row should show:

- full name
- email
- phone
- role or roles
- department memberships
- permissions
- created date

Admin actions:

```txt
[View]
[Edit]
[Delete]
```

---

## Admin User Details: `/admin/users/[id]`

Display:

- user information
- organization
- assigned roles
- assigned departments
- managed departments, if any
- account status

---

## Admin Edit User: `/admin/users/[id]/edit`

Main Admins can update:

- full name
- phone
- role assignments
- department memberships
- department manager assignments
- permissions

Main Admins can assign one user to:

- one department
- multiple departments
- no department, if appropriate

Main Admins can assign a Department Manager to more than one department.

Example:

```txt
Ivan Operations → Public Works manager
Ivan Operations → Transport Operations manager
```

---


# User Invitations

Main Admins can generate invitation links for new users.

Create page:

```txt
/admin/invitations
```

Main Admin can:

- create invite link
- choose user email
- choose role
- choose department or departments
- mark whether the invited user is manager in selected departments
- set expiration date
- copy invite link
- view pending invitations
- cancel unused invitations

---

## Invitation Rules

- Regular users cannot publicly register.
- New users join only through invite links.
- Invite links belong to one organization.
- Invite links expire.
- Invite links can be used only once.
- Invite links must not allow access to another organization.

---

# Accept Invitation Flow

Create page:

```txt
/invite/[token]
```

The invited user can:

- open invite link
- see organization name
- see invited email
- set full name
- set phone
- set password
- confirm password
- create account

After accepting invitation:

1. Validate token.
2. Check invitation is not expired.
3. Check invitation is not cancelled.
4. Check invitation is not already accepted.
5. Create user inside the invitation organization.
6. Hash password with `bcrypt`.
7. Assign selected role.
8. Assign selected departments.
9. Mark manager departments if applicable.
10. Mark invitation as accepted.
11. Redirect to login or log the user in.

---

# Roles and Permissions

Main Admins can manage roles and permissions for all users in their own organization.

Create pages:

```txt
/admin/roles
/admin/roles/[id]
/admin/roles/[id]/edit
```

Main Admin can:

- create roles
- edit role names
- assign permissions to roles
- assign roles to users
- remove roles from users

Permission assignment should happen through roles, not directly on users.

Recommended model:

```txt
users
roles
permissions
role_permissions
user_roles
```

---

# Authorization Rules

- Users can manage only their own profile at `/profile`.
- Users cannot change their own role, permissions, organization, or departments.
- Users can delete their own profile unless they are the only Main Admin.
- Main Admins can manage all users only inside their own organization.
- Main Admins can generate invite links only for their own organization.
- Main Admins can assign departments only from their own organization.
- Main Admins can assign roles only from their own organization.
- Main Admins can configure permissions through roles.
- No user management action may affect users from another organization.
- Do not rely only on frontend hiding; enforce access rules in services and database queries.

---

