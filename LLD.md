# Low-Level Design

## 1. Backend Folder Structure

```text
server/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── prisma.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── inviteController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   └── teamController.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   ├── projectAccess.js
│   │   ├── taskAccess.js
│   │   ├── teamAccess.js
│   │   └── validate.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── inviteRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── taskRoutes.js
│   │   └── teamRoutes.js
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── auth.js
│   │   ├── inviteToken.js
│   │   ├── projectSchemas.js
│   │   ├── taskSchemas.js
│   │   └── teamSchemas.js
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── prisma.config.ts
```

## 2. Frontend Folder Structure

```text
client/
├── src/
│   ├── api/
│   │   ├── authApi.js
│   │   ├── axios.js
│   │   ├── inviteApi.js
│   │   ├── projectApi.js
│   │   ├── taskApi.js
│   │   └── teamApi.js
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthLayout.jsx
│   │   ├── common/
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── PageLoader.jsx
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   └── tasks/
│   │       ├── CreateTaskForm.jsx
│   │       ├── MemberSelector.jsx
│   │       ├── TaskBoard.jsx
│   │       ├── TaskCard.jsx
│   │       ├── TaskReviewActions.jsx
│   │       └── TaskStatusActions.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── InvitePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── ProjectPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── TaskPage.jsx
│   │   ├── TeamMembersPage.jsx
│   │   ├── TeamPage.jsx
│   │   └── TeamsPage.jsx
│   ├── utils/
│   │   ├── taskStatus.js
│   │   └── ...
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
└── package.json
```

## 3. Database Models

### User

```text
id
name
email
passwordHash
avatarUrl
createdAt
updatedAt
```

Constraints:

- `id` is the primary key.
- `email` is unique.
- `passwordHash` is never returned by public API responses.

### Team

```text
id
name
description
createdById
createdAt
updatedAt
```

Relationships:

- One User can create many Teams.
- One Team has many TeamMembers.
- One Team has many Projects.
- One Team has many TeamInvites.

### TeamMember

```text
id
teamId
userId
role
startsAt
expiresAt
isActive
joinedAt
```

Constraints:

```text
unique(teamId, userId)
```

Business rules:

- A user can have one membership per team.
- `isActive` must be true for access.
- `expiresAt` must be null or later than the current time.
- Owner cannot be modified by Admin.
- Owner cannot be deactivated.

### TeamInvite

```text
id
teamId
email
tokenHash
role
type
maxUses
uses
expiresAt
createdAt
```

Business rules:

- `tokenHash` is unique.
- `uses < maxUses`.
- `expiresAt > current time`.
- Raw token is returned only during creation.
- The raw token is never stored.

### Project

```text
id
teamId
name
description
createdAt
updatedAt
```

Relationships:

- One Team has many Projects.
- One Project has many Tasks.

### Task

```text
id
projectId
title
description
status
priority
dueDate
pullRequestUrl
createdAt
updatedAt
```

Default values:

```text
status = ASSIGNED
priority = 2
```

### TaskAssignee

```text
taskId
userId
assignedAt
```

Constraints:

```text
primary key(taskId, userId)
```

### TaskReviewer

```text
taskId
userId
assignedAt
```

Constraints:

```text
primary key(taskId, userId)
```

### TaskReview

```text
id
taskId
reviewerId
decision
comment
createdAt
```

Decision values:

```text
APPROVED
CHANGES_REQUESTED
```

### TaskActivity

```text
id
taskId
actorId
action
metadata
createdAt
```

The `metadata` JSON field stores event-specific details such as old status, new status, review ID, and pull-request URL.

## 4. Authentication Design

### Registration

```text
POST /api/auth/register
```

Request:

```json
{
  "name": "Developer User",
  "email": "developer@example.com",
  "password": "Password123!"
}
```

Algorithm:

```text
1. Validate name, email, and password.
2. Normalize email to lowercase.
3. Check whether email already exists.
4. Hash password using bcrypt.
5. Create User record.
6. Create JWT containing userId.
7. Set HTTP-only devflow_token cookie.
8. Return safe user fields.
```

Response excludes:

```text
passwordHash
```

### Login

```text
POST /api/auth/login
```

Algorithm:

```text
1. Validate request.
2. Find user by normalized email.
3. Compare password with bcrypt.
4. Create JWT.
5. Set HTTP-only cookie.
6. Return safe user data.
```

### Authentication middleware

```text
1. Read devflow_token from cookies.
2. Return 401 if missing.
3. Verify JWT signature and expiration.
4. Find the user.
5. Attach user to req.user.
6. Continue to the route.
```

## 5. Team Authorization Design

### Membership query

```js
const membership = await prisma.teamMember.findFirst({
  where: {
    teamId,
    userId,
    isActive: true,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ],
  },
});
```

### Team access middleware

```text
1. Read teamId from URL.
2. Read userId from req.user.
3. Query active membership.
4. Return 403 when no membership exists.
5. Attach membership to req.membership.
6. Continue to controller.
```

### Role middleware

```js
requireTeamRole("OWNER", "ADMIN")
```

Algorithm:

```text
1. Read req.membership.role.
2. Compare with allowed roles.
3. Continue if allowed.
4. Return 403 if denied.
```

## 6. Project Access Design

For a project request:

```text
1. Read projectId.
2. Load project and teamId.
3. Find active membership for current user and team.
4. Return 404 if project does not exist.
5. Return 403 if user lacks team membership.
6. Attach project and membership to request.
```

This prevents a user from accessing a project by changing only the project ID in the URL.

## 7. Task Creation Algorithm

```text
1. Authenticate current user.
2. Validate projectId and request body.
3. Check project existence.
4. Load project.teamId.
5. Check Owner/Admin permission.
6. Remove duplicate assignee IDs.
7. Remove duplicate reviewer IDs.
8. Query active members for all provided IDs.
9. Reject IDs not belonging to the team.
10. Validate assignee roles.
11. Validate reviewer roles.
12. Start Prisma transaction.
13. Create Task.
14. Create TaskAssignee records.
15. Create TaskReviewer records.
16. Create TASK_CREATED activity.
17. Commit transaction.
18. Return created task.
```

## 8. Task Status Rules

### Developer permissions

Developers and Trainees can update an assigned task to:

```text
IN_PROGRESS
BLOCKED
IN_REVIEW
```

They cannot:

```text
APPROVE
COMPLETE
```

### Manager permissions

Owners and Admins can update broader task states, subject to business workflow rules.

### Status update algorithm

```text
1. Authenticate user.
2. Load task and project team.
3. Verify active team membership.
4. Check whether user is Owner/Admin.
5. If not manager, verify user is a task assignee.
6. Validate allowed status list.
7. Update task status.
8. Create TASK_STATUS_CHANGED activity.
9. Return updated task.
```

## 9. Submit-for-Review Algorithm

```text
1. Authenticate user.
2. Load task assignees and reviewers.
3. Verify current user is an assigned developer.
4. Verify task status is IN_PROGRESS or CHANGES_REQUESTED.
5. Verify at least one reviewer exists.
6. Optionally validate pullRequestUrl.
7. Start transaction.
8. Store pullRequestUrl.
9. Set status to IN_REVIEW.
10. Create TASK_SUBMITTED_FOR_REVIEW activity.
11. Commit transaction.
12. Return updated task.
```

## 10. Review Algorithm

```text
1. Authenticate user.
2. Load task reviewers.
3. Verify current user is an assigned reviewer.
4. Verify current status is IN_REVIEW.
5. Validate decision and comment.
6. Convert decision to next status:
   - APPROVED → APPROVED
   - CHANGES_REQUESTED → CHANGES_REQUESTED
7. Start transaction.
8. Create TaskReview record.
9. Update Task status.
10. Create TASK_REVIEWED activity.
11. Commit transaction.
12. Return updated task.
```

## 11. Task Completion Algorithm

```text
1. Authenticate user.
2. Verify Owner/Admin role.
3. Load task.
4. Verify task status is APPROVED.
5. Start transaction.
6. Set task status to COMPLETED.
7. Create TASK_COMPLETED activity.
8. Commit transaction.
9. Return updated task.
```

## 12. Invite Token Algorithm

### Creation

```text
1. Generate 32 random bytes.
2. Convert bytes to hexadecimal token.
3. Hash raw token with SHA-256.
4. Store only tokenHash.
5. Return inviteUrl containing raw token once.
```

### Inspection

```text
1. Receive raw token.
2. Hash token with SHA-256.
3. Find invite by tokenHash.
4. Check expiry.
5. Check uses against maxUses.
6. Return safe invite metadata.
```

### Acceptance

```text
1. Authenticate user.
2. Hash raw token.
3. Find invite.
4. Check expiry and remaining uses.
5. Check whether user already has active membership.
6. Start Prisma transaction.
7. Create or reactivate TeamMember.
8. Increment invite uses.
9. Commit transaction.
10. Return team membership.
```

## 13. API Contracts

### Create task

```text
POST /api/projects/:projectId/tasks
```

Request:

```json
{
  "title": "Build login page",
  "description": "Create responsive login screen.",
  "priority": 3,
  "dueDate": "2026-09-15T00:00:00.000Z",
  "assigneeIds": ["user-id"],
  "reviewerIds": ["reviewer-id"]
}
```

Success:

```json
{
  "success": true,
  "message": "Task created successfully",
  "task": {}
}
```

### Submit review

```text
POST /api/tasks/:taskId/submit-review
```

Request:

```json
{
  "pullRequestUrl": "[https://github.com/owner/repository/pull/12](https://github.com/owner/repository/pull/12)"
}
```

Success:

```json
{
  "success": true,
  "message": "Task submitted for review successfully",
  "task": {}
}
```

### Review task

```text
POST /api/tasks/:taskId/reviews
```

Request:

```json
{
  "decision": "CHANGES_REQUESTED",
  "comment": "Please add input validation."
}
```

## 14. Error Response Format

Standard error response:

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

Validation error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "fieldErrors": {}
  }
}
```

Common status codes:

| Status | Meaning |
|---:|---|
| 200 | Successful operation |
| 201 | Resource created |
| 400 | Invalid request or workflow state |
| 401 | Authentication required |
| 403 | Authenticated but not permitted |
| 404 | Resource not found |
| 409 | Conflict, such as duplicate membership |
| 410 | Expired or exhausted invitation |
| 500 | Unexpected server error |
| 503 | Service/database not ready |

## 15. Frontend State Design

### Auth state

```text
user
isLoading
isAuthenticated
login()
register()
logout()
```

### Project state

```text
project
membership
tasks
members
isLoading
isCreateOpen
error
```

### Task state

```text
task
membership
isLoading
error
```

Task mutations reload task details so the activity and review history remain current.

## 16. Frontend Route Map

```text
/login
/register
/teams
/teams/:teamId
/teams/:teamId/members
/projects/:projectId
/tasks/:taskId
/invite/:token
```

Protected routes:

```text
/teams/*
/projects/*
/tasks/*
/invite/*
```

## 17. Testing Strategy

### Unit-level testing

Future unit tests should cover:

- Token hashing.
- Role permission checks.
- Status transition validation.
- Invite expiry checks.
- Input schemas.

### Integration testing

Future integration tests should cover:

- Registration and login.
- Team creation.
- Invitation acceptance.
- Project access.
- Task creation.
- Review workflow.
- Unauthorized access.

### Manual security testing

Test:

- Unauthenticated resource access.
- Cross-team resource access.
- Developer access to Admin actions.
- Reviewer access to completion actions.
- Deactivated membership access.
- Expired invite access.
- Reused invite access.

## 18. Deployment Configuration

### Backend

```text
Platform: Render
Root directory: server
Build command: npm install && npx prisma generate
Pre-deploy command: npx prisma migrate deploy
Start command: npm start
Health check: /api/health/ready
```

### Frontend

```text
Platform: Vercel or Netlify
Root directory: client
Build command: npm run build
Publish directory: dist
```

### Production variables

Backend:

```env
NODE_ENV=production
DATABASE_URL=production-postgresql-url
JWT_SECRET=production-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=production-frontend-url
```

Frontend:

```env
VITE_API_URL=production-backend-url
```

## 19. Design Trade-offs

### Native REST API

Chosen because resources map naturally to URLs and HTTP methods.

### PostgreSQL

Chosen because task assignments, reviewers, roles, memberships, projects, and reviews have relational constraints.

### HTTP-only cookie

Chosen to reduce JavaScript access to authentication tokens.

### Modular monolith

Chosen because the project is a student MVP and benefits from simpler deployment while keeping feature modules separated.

### Manual GitHub PR link

Chosen for the MVP to deliver review workflow functionality before implementing the more complex GitHub App and webhook integration.

## 20. Future Low-Level Improvements

- Add database indexes for common filters.
- Add pagination for teams, tasks, activity, and reviews.
- Add optimistic UI updates.
- Add background jobs for email.
- Add automated API tests.
- Add structured logging.
- Add audit-log retention policies.