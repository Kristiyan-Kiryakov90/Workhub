# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# WorkHub Admin Platform Mobile App

Mobile workforce management app for employees and department managers.

The mobile app supports:
- login/logout
- dashboard
- tasks
- shifts
- leave requests
- notifications

Department Managers can:
- approve leave requests
- manage shifts
- approve shift swaps

Employees can:
- view tasks
- request leave
- view schedules
- receive notifications

## Technologies

- Expo
- React Native
- Expo Router
- TypeScript

## Backend

Use the WorkHub RESTful API backend.
Backend API source code: `..\workhub-web\src\app\api`

Authentication:
- JWT + Bearer token authentication

## Architectural Guidelines

- Use modular structure: split into meaningful components to avoid too much code in one file
- Use reusable screens and components
- Keep API logic separated from UI
- Use RESTful API services
- Avoid duplicated logic
- Use centralized API client

## Mobile UI Guidelines

- Use responsive mobile layouts
- Support phones and tablets
- Use stack navigation
- Use loading states
- Use pull-to-refresh
- Use mobile-friendly forms
- Use confirmations for destructive actions

## API Guidelines

- Handle API errors correctly
- Handle token expiration
- Retry failed requests where reasonable
- Show user-friendly error messages

## State Management

- Keep state localized when possible
- Avoid unnecessary global state
- Cache frequently used data

## Important Rules

- Keep screens small and modular
- Avoid large components
- Keep UI responsive
- Avoid business logic inside screens
- Use services/hooks for API communication

## Alerts and Dialogs

All native alerts and confirms must have Web-compatible fallbacks.