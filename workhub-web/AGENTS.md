# WorkHub Admin Platform Web App

Enterprise workforce and operations management system.

The Web app manages:
- departments
- employees
- roles and permissions
- tasks
- leave approvals
- shifts
- reports
- admin operations

Main Admin users can:
- create departments
- assign department managers
- create roles
- configure permissions
- manage organization settings

Department Managers can:
- approve sick leave
- approve vacation leave
- organize shifts
- assign employees
- manage department tasks and projects

Employees can:
- view tasks
- request leave
- view shifts
- comment on tasks
- edit tasks' status
- receive notifications

## Technologies

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Neon PostgreSQL
- Drizzle ORM

## Architecture Guidelines

- Use modular monolith architecture
- Use service layer architecture
- Keep business logic inside module services
- Use Server Actions for Web workflows
- Use RESTful APIs for mobile integration
- Keep route handlers thin
- Avoid direct DB access from pages/components
- Split into meaningful components to avoid too much code in one file

## Modules

modules/
- departments
- employees
- leave
- shifts
- tasks
- approvals
- notifications
- reports

Each module should contain:
- services
- actions
- api
- schemas
- permissions
- types

## Database Guidelines

- Always use Drizzle migrations
- Never change schema manually
- Use indexes for filtering and paging
- Use foreign keys
- Use normalized schema

## Authorization Guidelines

All protected routes and APIs must validate:
- authenticated user
- role permissions
- department access

Department Managers must only access their assigned departments.

## UI Guidelines
- Use modern design
- Use enterprise dashboard design
- Use responsive layouts
- Use reusable components
- Use server-rendered components when possible
- Use client components only for interactivity
- Use tables, charts, calendars, filters, dialogs
- Support desktop and tablet layouts

## Performance Guidelines

- Implement server-side pagination
- Avoid loading large datasets
- Use optimized DB queries
- Lazy load heavy UI sections

## File Uploads

Use Cloudflare R2 for:
- employee documents
- attachments
- profile photos

## Important Rules

- Keep pages small
- Keep services reusable
- Keep APIs thin
- Avoid duplicated business logic
- Use events for cross-module workflows

## Authentication Guidelines

The Web app must implement secure authentication using JWT sessions stored in HTTP-only cookies.

### Auth Features

Implement:
- user registration
- login
- logout
- current user loading
- protected routes
- role-based access checks
- department-based access checks

### Password Security

- Never store plain text passwords
- Hash passwords with bcrypt or argon2
- Validate password strength on registration
- Never return password hashes from services, APIs, or Server Actions

### JWT Session Rules

- Store JWT token in an HTTP-only secure cookie
- Use `sameSite: "lax"` or stricter
- Use `secure: true` in production
- Sign tokens with `JWT_SECRET`
- Never expose JWT tokens to client-side JavaScript
- Keep token payload small

