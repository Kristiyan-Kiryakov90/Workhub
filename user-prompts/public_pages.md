## Public Pages and Layout

Create the public pages of the WorkHub app with a polished enterprise SaaS style.

### App Layout

- Define the shared public app layout:
  - public header
  - main content area
  - public footer
- Keep the layout responsive for:
  - desktop
  - tablet
  - smartphone
- Use server-rendered components by default.
- Use client components only for interactivity such as:
  - mobile menu
  - animated typing text
  - feature carousel
  - form validation state

### Public Header

Implement a clean minimal public header:

- app logo / product name: `WorkHub`
- navigation links:
  - Home
  - Login
  - Register Organization
- use a compact mobile menu on small screens
- keep **Login** and **Register Organization** only in the header navigation, not duplicated as home page hero buttons

### Home Page

Present WorkHub as a multi-organization workforce and administration platform.

Hero section requirements:

- use a centered, attractive SaaS landing-page hero
- include a small welcome message: `Welcome to WorkHub`
- include a large headline similar to:
  - `All-in-one Workforce Administration Platform`
- include a short product sentence:
  - `WorkHub allows you to manage [active capability] in one simple hub.`
- the active capability must be animated like live typing
- rotate the typed capability words:
  - departments
  - employees
  - shifts
  - tasks
  - permissions
- do not show the full static list in the sentence
- ensure the hero text fits correctly on small screens:
  - no horizontal overflow
  - long words must wrap cleanly
  - use responsive font sizes

Hero visual requirements:

- add an attractive dashboard-style preview/mockup under the hero text
- include operational items such as:
  - leave approvals
  - shift coverage
  - open tasks
  - workflow steps
- add at least one subtle moving/animated visual element inside the mockup
- do not include floating text labels like `Department access` or `Role checks`

Capabilities section requirements:

- create feature cards for:
  - department management
  - employee leave requests and approvals
  - shift scheduling
  - task assignment
  - roles and permissions
- style the capabilities as large white cards with:
  - soft shadow
  - rounded corners
  - simple illustration/icon area
  - title
  - short description
  - `Learn More` text with an arrow
- show only 3 cards at a time on large screens. Split them to pages if more are available
- rotate the cards every 5 seconds
- include dot controls for the 2 carousel pages
- keep the card layout responsive on tablet and mobile

### Login Page

Implement a login form as a client component.

- Put the page in an `(auth)` route group.
- Fields:
  - email
  - password
- Include:
  - submit button
  - basic validation messages
  - link to the registration page
- Use accessible labels and validation text.

### Register Organization Page

Implement a registration form as a client component.

- Put the page in the `(auth)` route group.
- The form should create:
  - a new organization
  - the first Main Admin user for that organization
- Fields:
  - organization name
  - admin full name
  - admin email
  - password
  - confirm password
- Include:
  - validation messages
  - submit button
  - link to the login page
- Validate password strength on the client:
  - at least 8 characters
  - uppercase letter
  - lowercase letter
  - number

### Design Guidelines

- Use a modern, clean, professional enterprise dashboard style.
- Use responsive spacing and clear typography.
- Avoid one-note color palettes.
- Use restrained accent colors such as cyan and orange.
- Use accessible form labels and buttons.
- Ensure all text fits within its parent elements on mobile and desktop.
- Avoid horizontal overflow on all screen sizes.
- Keep pages small by extracting reusable components.

### Verification

After implementation:

- run lint
- run build
- verify these routes work:
  - `/`
  - `/login`
  - `/register-organization`

Do not commit or push changes unless explicitly asked.
