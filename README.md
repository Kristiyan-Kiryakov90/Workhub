# WorkHub Admin Platform

Enterprise workforce and operations management platform built with Next.js, React, PostgreSQL, Drizzle ORM and Expo.

WorkHub Admin Platform is a modular full-stack SaaS application designed for organizations, municipalities, and enterprise teams to manage:
- departments
- employees
- tasks
- work shifts
- leave requests
- approvals
- internal operations

The platform is built as a production-oriented modular monolith architecture and is designed to scale into a real enterprise product after the capstone implementation phase.

---

# Project Goals

The main goal of the project is to build a modern enterprise workforce management system using AI-assisted development and modern full-stack technologies.

The project demonstrates:
- modular enterprise architecture
- department-based access control
- role-based authorization
- scalable database design
- Web + Mobile synchronization
- RESTful APIs
- Server Actions
- AI-assisted workflows
- production-oriented engineering practices

---

# Main Features

## Department-Based Organization Structure

The system is organized around departments.

Each department has:
- employees
- managers
- tasks
- shifts
- reports

Example departments:
- Human Resources
- IT
- Production
- Maintenance

Department Managers can manage only assigned departments.

---

# Role-Based Access Control (RBAC)

The platform supports flexible roles and permissions.

Main Admin can:
- create departments
- assign department managers
- create custom roles
- configure permissions
- manage organization settings

Department Managers can:
- approve leave requests
- organize shifts
- manage department tasks
- manage department projects
- assign employees

Employees can:
- view assigned tasks
- request leave
- view shifts
- participate in projects
- receive notifications

---

# Employee Management

Manage:
- employee profiles
- department assignments
- employee roles
- employment status
- employee documents

Features:
- employee onboarding
- department assignment
- role assignment
- profile management
- employee search and filtering

---

# Task Management

The platform includes a complete task management module.

Tasks support:
- priorities
- statuses
- due dates
- assignees
- comments
- attachments
- status history

Task statuses:
- Todo
- In Progress
- Completed
- Canceled

Managers can:
- assign tasks
- monitor progress
- manage workloads

---



# Leave Management

Employees can request:
- sick leave
- vacation leave
- unpaid leave
- remote work days
- personal leave

Department Managers can:
- approve or reject requests
- review leave history
- monitor department staffing availability

---

# Shift Management

Department Managers can:
- create shifts
- assign employees
- manage recurring schedules
- approve shift swaps
- monitor understaffed shifts

Employees can:
- view schedules
- request swaps
- receive schedule updates

---

# Notifications System

The platform supports:
- in-app notifications
- push notifications

Notifications are triggered by:
- task assignments
- leave approvals
- shift updates
- manager comments



# Architecture

The application uses a client-server architecture.

## Web Application
- Next.js App Router
- React
- Server Actions
- Tailwind CSS

The Web app is the primary administrative platform.

---

## Mobile Application
- React Native
- Expo
- RESTful API integration

The mobile app focuses on essential employee functionality:
- tasks
- shifts
- leave requests
- notifications

---

# Monorepo Structure

```txt
workhub-platform/
│
├── apps/
│   ├── web/
│   └── mobile/
│
├── modules/
│   ├── core/
│   ├── departments/
│   ├── employees/
│   ├── leave/
│   ├── shifts/
│   ├── tasks/
│   ├── projects/
│   ├── approvals/
│   ├── notifications/
│   └── reports/
│
├── packages/
│   ├── db/
│   ├── auth/
│   ├── shared/
│   ├── ui/
│   └── config/
│
├── AGENTS.md
├── README.md
└── package.json
```

---

# Modular Architecture

The system is implemented as a modular monolith.

## Architecture Rules

- business logic lives inside services
- modules are isolated
- UI contains minimal business logic
- APIs remain thin
- modules communicate through services and events
- shared infrastructure lives inside packages

This architecture allows future extraction into microservices if needed.

---

# Technology Stack

## Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend
- Next.js API Routes
- Server Actions
- Drizzle ORM
- PostgreSQL

## Mobile
- Expo
- React Native

## Infrastructure
- Neon PostgreSQL
- Cloudflare R2
- Netlify / Vercel
- GitHub Actions

---

# Authentication & Authorization

The platform uses JWT authentication with secure HTTP-only cookies.

Features:
- registration
- login
- logout
- role-based access control
- department-based authorization
- protected routes
- secure password hashing with bcrypt

---

# Database

The platform uses PostgreSQL with Drizzle ORM.

Main entities:
- organizations
- departments
- employees
- roles
- permissions
- tasks
- projects
- shifts
- leave requests
- notifications
- audit logs

The schema is fully normalized and optimized for scalability.

---

# Scalability

The system is designed to support:
- 10,000+ employees
- 100,000+ tasks
- large organization datasets

Performance features:
- server-side pagination
- optimized DB queries
- indexes
- lazy loading

---

# Security

Security practices include:
- JWT authentication
- secure cookies
- password hashing
- role validation
- department access checks
- audit logging
- protected APIs
- schema validation

---



# Planned Future Improvements

- advanced analytics dashboards
- real-time notifications
- calendar integrations
- payroll module
- attendance tracking
- QR check-in system
- advanced AI workforce forecasting
- mobile offline support
- multi-organization SaaS support

---

# Capstone Project

This project is developed as a capstone project for:
**“Full Stack Apps with AI”**

The implementation demonstrates:
- enterprise full-stack architecture
- modular system design
- Web + Mobile applications
- PostgreSQL database design
- authentication & authorization
- scalable APIs
- production-oriented engineering practices