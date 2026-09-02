# DevFlow Manual QA Checklist

## Authentication
- [X] Register a new account
- [X] Login with valid credentials
- [X] Login with invalid credentials shows an error
- [X] Logout works
- [X] Refresh preserves login session
- [X] Logged-out user is redirected from protected routes

## Team access
- [X] Owner can create a team
- [X] Team member can see only invited teams
- [X] Outsider cannot access copied team URL
- [X] Deactivated member cannot access team URL

## Invitations
- [X] Owner/Admin can create invite links
- [X] Invite link can be copied
- [X] New user can open, login/register, and accept invite
- [X] Invite role is assigned correctly
- [X] One-use invite cannot be reused
- [X] Revoked invite cannot be accepted
- [X] Expired invite cannot be accepted

## Projects
- [X] Owner/Admin can create projects
- [X] Developer cannot create projects
- [X] Project task count is correct
- [X] Project page opens correctly

## Tasks
- [X] Owner/Admin can create a task
- [X] Assigned Developer can move task to In Progress
- [X] Unassigned Developer cannot change task status
- [X] Developer can submit task for review
- [X] Assigned Reviewer can request changes
- [X] Developer can resubmit after changes requested
- [X] Assigned Reviewer can approve task
- [X] Owner/Admin can complete only approved tasks
- [X] Activity history records workflow actions
- [X] Review comments remain visible after refresh

## Responsive UI
- [X] Login and Register pages work on mobile
- [X] Mobile navigation drawer opens and closes
- [X] Create Task modal fits and scrolls within viewport
- [X] Member cards do not overlap
- [X] Kanban board scrolls horizontally
- [X] No unintended horizontal page scrolling