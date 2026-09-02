# DevFlow

> A role-based team delivery workspace for managing software projects, task assignments, reviews, and completion workflows.

DevFlow helps small development teams, student project groups, interns, and freelance collaborators organize work in one place. Team owners and admins can create projects, invite members, assign tasks, choose reviewers, and move work through a structured review process.

## Problem

Small teams often coordinate work across GitHub, WhatsApp, Discord, spreadsheets, and task boards. This creates common problems:

- Tasks are unclear or assigned informally
- Team members cannot easily see ownership of work
- Reviews and revision feedback get lost in chat messages
- Roles and permissions are not enforced
- New contributors and trainees need temporary access
- Project progress is difficult to track

DevFlow provides a focused workflow for assigning, reviewing, and completing work inside private team workspaces.

## Features

### Authentication and access control

- User registration, login, logout, and persistent sessions
- JWT authentication stored in HTTP-only cookies
- Protected frontend routes
- Role-based backend authorization
- Team-level access isolation

### Teams and members

- Create multiple private team workspaces
- View only teams where the user is an active member
- Roles: `OWNER`, `ADMIN`, `REVIEWER`, `DEVELOPER`, and `TRAINEE`
- Change team member roles
- Deactivate members
- Temporary trainee access support through membership expiry
- Secure invitation links with expiration and maximum-use limits

### Projects and tasks

- Create projects inside a team
- Create and organize tasks inside projects
- Assign one or more developers to a task
- Assign one or more reviewers to a task
- Set task priority and due date
- Track tasks in a Kanban board

### Review workflow

```text
ASSIGNED
→ IN_PROGRESS
→ IN_REVIEW
→ CHANGES_REQUESTED
→ IN_REVIEW
→ APPROVED
→ COMPLETED
```

- Developers update tasks they are assigned to
- Developers can submit a task for review
- Pull request URL can be attached during submission
- Reviewers can approve work or request changes
- Owner/Admin completes approved tasks
- Activity history records task workflow events

### User experience

- Responsive Tailwind CSS interface
- Desktop sidebar and mobile navigation drawer
- Responsive Kanban board with horizontal scrolling
- Create-team, create-project, and create-task modals
- Clickable developer/reviewer selection cards
- Toast notifications for user actions
- Skeleton loading screen while authentication is checked
- Error Boundary fallback screen for unexpected UI errors

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Tailwind CSS
- Sonner

### Backend

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- Zod
- JSON Web Tokens
- bcrypt
- Helmet
- express-rate-limit

### Database

- PostgreSQL
- Prisma migrations
- Neon PostgreSQL for hosted development database

## Architecture

```text
┌─────────────────────────────┐
│        React + Vite          │
│   React Router + Tailwind    │
│  Axios + HTTP-only cookies   │
└──────────────┬──────────────┘
               │
               │ HTTPS / REST API
               ▼
┌─────────────────────────────┐
│        Node + Express        │
│  Auth · RBAC · Validation    │
│ Controllers · Middleware     │
└──────────────┬──────────────┘
               │
               │ Prisma ORM
               ▼
┌─────────────────────────────┐
│         PostgreSQL           │
│ Users · Teams · Projects     │
│ Tasks · Reviews · Invites    │
└─────────────────────────────┘
```

## Roles and permissions

| Action | Owner | Admin | Reviewer | Developer | Trainee |
|---|:---:|:---:|:---:|:---:|:---:|
| View team and project data | Yes | Yes | Yes | Yes | Yes |
| Create projects | Yes | Yes | No | No | No |
| Create tasks | Yes | Yes | No | No | No |
| Manage team members | Yes | Yes* | No | No | No |
| Create invite links | Yes | Yes* | No | No | No |
| Update assigned task status | Yes | Yes | No | Yes | Yes |
| Review assigned tasks | Yes | Yes | Yes | No | No |
| Mark approved task completed | Yes | Yes | No | No | No |

`*` Admins cannot modify or deactivate the Owner and cannot assign the `OWNER` role.

## Project structure

```text
devflow/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── tasks/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   ├── prisma.config.ts
│   └── package.json
│
├── docs/
│   └── QA_CHECKLIST.md
│
└── README.md
```

## Local setup

### Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL database, locally or through a provider such as Neon
- Git

### 1. Clone the repository

```bash
git clone https://github.com/KumarManuSaraswat/devflow.git
cd devflow
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create `server/.env` from `server/.env.example`:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/devflow?sslmode=require"

JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="7d"

CLIENT_URL="http://localhost:5173"
COOKIE_SECURE=false
```

Apply database migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the backend:

```bash
npm run dev
```

The API should run at:

```text
http://localhost:5000
```

### 3. Configure the frontend

Open a new terminal:

```bash
cd client
npm install
```

Create `client/.env` from `client/.env.example`:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Environment variables

### Backend: `server/.env`

| Variable | Description |
|---|---|
| `NODE_ENV` | Application environment |
| `PORT` | Express server port |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `JWT_EXPIRES_IN` | JWT expiry duration |
| `CLIENT_URL` | Frontend URL allowed by CORS |
| `COOKIE_SECURE` | Use `true` when deployed with HTTPS |

### Frontend: `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the Express API server |

Never commit `.env` files or real database credentials.

## API overview

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Teams and members

```text
POST  /api/teams
GET   /api/teams
GET   /api/teams/:teamId
GET   /api/teams/:teamId/members
PATCH /api/teams/:teamId/members/:memberId/role
PATCH /api/teams/:teamId/members/:memberId/deactivate
```

### Invitations

```text
POST  /api/teams/:teamId/invites/link
GET   /api/teams/:teamId/invites
PATCH /api/teams/:teamId/invites/:inviteId/revoke

GET   /api/invites/:token
POST  /api/invites/:token/accept
```

### Projects

```text
POST   /api/teams/:teamId/projects
GET    /api/teams/:teamId/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
```

### Tasks and reviews

```text
POST   /api/projects/:projectId/tasks
GET    /api/projects/:projectId/tasks

GET    /api/tasks/:taskId
PATCH  /api/tasks/:taskId
PATCH  /api/tasks/:taskId/status
DELETE /api/tasks/:taskId

POST   /api/tasks/:taskId/submit-review
POST   /api/tasks/:taskId/reviews
POST   /api/tasks/:taskId/complete
```

## Security decisions

- Passwords are hashed with bcrypt
- Authentication uses JWT stored in HTTP-only cookies
- CORS is restricted to the configured frontend URL
- Helmet applies security-oriented response headers
- Rate limiting protects authentication endpoints
- Zod validates request bodies and parameters
- Team, project, and task access is verified server-side
- Invite tokens are generated securely and stored as hashes
- Invite links expire and can have maximum-use limits
- Role checks are enforced on the backend, not only hidden in the UI

## Manual QA

Manual test cases are available in:

```text
docs/QA_CHECKLIST.md
```

Test coverage includes authentication, team isolation, invitation rules, role restrictions, task review flow, and responsive UI.

## Future improvements

- GitHub OAuth and GitHub App integration
- Repository selection and pull-request webhook syncing
- Email-based invitations
- Notification center and real-time updates
- Drag-and-drop Kanban board
- Task comments and attachments
- Dashboard analytics
- AI task breakdown and review-summary assistant
- Automated unit and integration tests
- Dark mode

## Author

Built by **Kumar Saraswat** as a full-stack software engineering project.
