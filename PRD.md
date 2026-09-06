# Product Requirements Document

## 1. Product Information

| Field | Value |
|---|---|
| Product name | DevFlow |
| Document version | 1.0 |
| Product type | Role-based team delivery workspace |
| Author | Kumar Saraswat |
| Status | MVP implemented |
| Date | September 2026 |

## 2. Product Summary

DevFlow is a web application that helps small software teams, student project groups, interns, and freelance collaborators organize development work in one private workspace.

Users can create teams, invite members, assign team-specific roles, create projects, assign tasks, submit work for review, request revisions, approve contributions, and complete tasks through a controlled workflow.

## 3. Problem Statement

Small teams often coordinate software work through a mixture of chat applications, spreadsheets, GitHub issues, and informal messages. This creates several problems:

- Team members are unsure who owns a task.
- Review feedback can become lost in chat messages.
- Project progress is difficult to monitor.
- New contributors need a controlled way to join.
- Administrators need role-based permissions.
- Temporary interns and trainees need time-limited access.
- Developers need a clear workflow from assignment to approval.

DevFlow addresses these problems by combining team management, project organization, task assignment, role-based access, and review workflows in one application.

## 4. Product Goals

### Primary goals

1. Allow users to create private team workspaces.
2. Allow Owners and Admins to invite team members securely.
3. Enforce team-specific roles and permissions.
4. Allow teams to organize work into projects.
5. Allow managers to assign tasks to developers and reviewers.
6. Provide a controlled task-review workflow.
7. Preserve task activity and review history.
8. Provide a responsive interface for desktop and mobile users.

### Secondary goals

1. Support temporary Trainee/Intern roles.
2. Allow tasks to reference GitHub pull requests.
3. Provide a clear audit trail for important actions.
4. Prepare the system for future GitHub webhook integration.
5. Provide a portfolio-quality full-stack application.

## 5. Target Users

### Owner

The user who creates a team. The Owner has complete control over the workspace.

### Admin

A trusted team manager who can manage projects, tasks, members, and invitations within permitted limits.

### Reviewer

A person responsible for reviewing submitted tasks and deciding whether work is approved or requires changes.

### Developer

A person who works on assigned tasks and submits completed work for review.

### Trainee/Intern

A temporary contributor who has limited Developer-like permissions and may have an expiry date.

### Viewer

A future read-only role for people who need to inspect team progress without changing data.

## 6. User Stories

### Authentication

- As a user, I want to create an account so that I can use DevFlow.
- As a user, I want to log in securely so that I can access my teams.
- As a user, I want to remain logged in after refreshing the browser.
- As a user, I want to log out so that my session ends.

### Teams

- As a user, I want to create a team so that I can organize collaborators.
- As a user, I want to see only teams where I am a member.
- As an Owner, I want to manage members and roles.
- As an Admin, I want to manage permitted team operations.
- As a team member, I want to see team projects and tasks.

### Invitations

- As an Owner/Admin, I want to create an invitation link.
- As an Owner/Admin, I want to choose the invited member's role.
- As an Owner/Admin, I want invitation links to expire.
- As an Owner/Admin, I want to limit the number of times a link can be used.
- As an invited user, I want to open a link, log in or register, and join the team.

### Projects

- As an Owner/Admin, I want to create a project within a team.
- As a team member, I want to view the projects available to my team.
- As a team member, I want to open a project and see its task board.

### Tasks

- As an Owner/Admin, I want to create a task.
- As an Owner/Admin, I want to assign developers.
- As an Owner/Admin, I want to assign reviewers.
- As an Owner/Admin, I want to set task priority and due date.
- As a Developer, I want to update the status of my assigned task.
- As a Developer, I want to submit my work for review.
- As a Reviewer, I want to approve work or request changes.
- As an Owner/Admin, I want to mark approved work as completed.

## 7. Functional Requirements

### FR-01: User registration

The system shall allow a user to register with:

- Name.
- Email address.
- Password.

The system shall:

- Validate the request.
- Reject duplicate email addresses.
- Hash the password before storing it.
- Create an authenticated session after successful registration.

### FR-02: User authentication

The system shall provide:

- Login.
- Logout.
- Current-user lookup.

Authentication shall use a JWT stored in an HTTP-only cookie.

### FR-03: Team creation

An authenticated user shall be able to create a team.

When a team is created:

- The creator shall become the Owner.
- A TeamMember record shall be created.
- The team shall appear in the creator’s team list.

### FR-04: Team visibility

A user shall only be able to access teams where:

- The user has an active membership.
- The membership has not expired.

Unauthorized team access shall return `403 Forbidden`.

### FR-05: Team roles

The system shall support:

```text
OWNER
ADMIN
REVIEWER
DEVELOPER
TRAINEE
```

The backend shall enforce role permissions for every protected operation.

### FR-06: Invitations

An Owner/Admin shall be able to create an invite link with:

- A team.
- A role.
- Maximum uses.
- Expiry date.

The system shall:

- Generate a cryptographically random token.
- Store only a hash of the token.
- Reject expired links.
- Reject links that exceed maximum uses.
- Add the authenticated user to the team after acceptance.

### FR-07: Projects

An Owner/Admin shall be able to:

- Create a project.
- Update a project.
- Delete a project.

An active team member shall be able to:

- List projects.
- View a project.

### FR-08: Tasks

An Owner/Admin shall be able to create tasks with:

- Title.
- Description.
- Priority.
- Due date.
- Developer assignees.
- Reviewer assignees.

The system shall verify that every assigned person is an active member of the project’s team.

### FR-09: Task workflow

Tasks shall support these states:

```text
BACKLOG
ASSIGNED
IN_PROGRESS
BLOCKED
IN_REVIEW
CHANGES_REQUESTED
APPROVED
COMPLETED
```

The system shall enforce valid role-based state changes.

### FR-10: Review workflow

An assigned Developer shall be able to submit an eligible task for review.

A submission may contain a GitHub pull-request URL.

An assigned Reviewer shall be able to:

- Approve the task.
- Request changes.
- Add a review comment.

An Owner/Admin shall be able to mark an approved task as completed.

### FR-11: Activity history

The system shall record important task events, including:

- Task creation.
- Task updates.
- Status changes.
- Review submission.
- Review decision.
- Task completion.

### FR-12: Responsive interface

The frontend shall support:

- Desktop sidebar navigation.
- Mobile navigation drawer.
- Responsive forms.
- Responsive project cards.
- Horizontally scrollable Kanban board.
- Responsive task and member cards.

## 8. Non-Functional Requirements

### Security

- Passwords must not be stored in plain text.
- Authentication cookies must be HTTP-only.
- Production cookies must use secure HTTPS settings.
- Protected endpoints must require authentication.
- Team, project, and task access must be checked server-side.
- Inputs must be validated.
- Invite tokens must not be stored in plain text.
- Authentication endpoints should be rate-limited.

### Performance

- API responses should be asynchronous.
- Database queries should return only required related data where possible.
- The frontend should avoid unnecessary full-page reloads.
- The application should display loading states while requests are running.

### Reliability

- Database writes involving related records should use transactions.
- Errors should return structured API responses.
- The frontend should display user-friendly error states.
- The frontend should include an Error Boundary for unexpected rendering errors.
- The backend should provide health and database-readiness endpoints.

### Maintainability

- Backend routes should be separated by feature.
- Controllers should contain feature logic.
- Middleware should handle authentication and authorization.
- Validation schemas should be reusable.
- Environment secrets must be configured outside source control.

## 9. Success Criteria

The MVP is successful when:

1. A user can register and log in.
2. An Owner can create a team.
3. An Owner/Admin can invite another user.
4. The invited user can join from a browser invite page.
5. A team member can view projects.
6. An Owner/Admin can create tasks.
7. A Developer can update an assigned task.
8. A Developer can submit work for review.
9. A Reviewer can request changes or approve work.
10. An Owner/Admin can complete approved work.
11. Unauthorized users cannot access other teams’ data.
12. The application works on desktop and mobile layouts.
13. The application passes the manual QA checklist.

## 10. Out of Scope for MVP

The following are planned future improvements:

- Automatic GitHub synchronization.
- GitHub OAuth.
- GitHub App webhooks.
- Email invitation delivery.
- Real-time chat.
- File uploads.
- Payment processing.
- AI task breakdown.
- Advanced analytics.
- Drag-and-drop Kanban interactions.
- Native mobile applications.

## 11. Future Enhancements

- GitHub repository integration.
- Pull request and review synchronization.
- Email notifications.
- Real-time notifications.
- Task comments and attachments.
- Advanced reporting dashboards.
- AI-assisted task planning.
- Automated tests and continuous integration.