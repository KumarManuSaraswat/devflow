# Team discussions

Each workspace has a **Team discussions** link and a summary showing total/open/resolved topics. Any currently active team member can start a **Problem**, **Feedback** or **Discussion** topic with a title and first message. All active members of that team can read and reply.

## Completion and permissions

- Only the **topic creator** or a current **team owner** can mark a topic resolved or reopen it. Being an admin alone does not grant this permission.
- Resolved topics have a green check, resolver name and completion timestamp visible to the team. Messages remain readable, but new replies are closed until the topic is reopened.
- Reopening clears the current resolution marker and returns the topic to the open count. Counts describe current status, not historical resolution events.
- Authentication and active membership (including start and expiry dates) are checked server-side on every request. Being a member of another team does not grant access. Former members' posts remain part of the conversation.
- Resolution uses a version check. If a new reply or status change wins the race, the user must refresh/read the latest conversation and retry. A message send and resolution serialize on the topic row, so a new message cannot be committed behind a completed topic.

## Chat behavior

- Messages persist in PostgreSQL and are plain text (not executable HTML). No AI or external chat provider receives discussion content.
- Title: 3–160 UTF-16 code units. Message: 1–4,000 code units, trimmed; blank messages are rejected.
- Topics are paginated in stable creation order, 20 at a time. Filter by open/resolved and topic type. Counts always cover the whole team, independently of filters.
- Conversations initially show the latest 50 messages, with **Load earlier messages** for history. Incremental polling catches up in pages of 50; a per-topic sequence ensures deterministic ordering.
- UUID request keys prevent duplicate topics/messages when a delivery response is lost and the same submission is retried. Keys are scoped to the team/author or topic/author and cannot be used to impersonate another sender.
- Visible conversation pages poll every 10 seconds; topic lists every 15 seconds; workspace summaries every 20 seconds. Polling pauses in hidden/offline tabs, resumes on return, and backs off on failures. This is auto-refresh, **not instantaneous WebSocket delivery**.
- Reading earlier messages does not pull the reader to the bottom. Use **Jump to latest messages** to resume following. Drafts survive refreshes while the page is mounted but are not stored across navigation/reload.
- Per-user rate limits: 120 reads and 30 writes per minute per backend process. The existing authenticated app, Express server and database are reused; no new paid service, API key or npm dependency is needed. Normal hosting/database quotas still apply. Large multi-instance deployments should use a shared limiter and consider push-based updates.

## Deployment

The additive migration `20260925120000_team_discussions` creates two tables (`DiscussionTopic`, `DiscussionMessage`), enums, indexes and constraints. It does not delete or modify existing team/task records. Follow the normal database backup procedure before deployment.

```sh
cd server
npm run prisma:deploy
npm run prisma:generate
npm test
cd ../client
npm run lint
npm run build
```

Apply migrations before starting the new backend. There are no new environment variables. No push or deployment is implied merely by editing this code.

## API

All endpoints require the existing session cookie and membership in `:teamId`.

```text
GET   /api/teams/:teamId/discussions?status=ALL&category=ALL&cursor=<topicId>
POST  /api/teams/:teamId/discussions
GET   /api/teams/:teamId/discussions/:topicId
GET   /api/teams/:teamId/discussions/:topicId?after=<sequence>
GET   /api/teams/:teamId/discussions/:topicId?before=<sequence>
POST  /api/teams/:teamId/discussions/:topicId/messages
PATCH /api/teams/:teamId/discussions/:topicId/status
```

Create topic body: `{ title, category, body, clientTopicId: uuid }`.
Reply body: `{ body, clientMessageId: uuid }`.
Status body: `{ status: "OPEN" | "RESOLVED", version: number }`.
Never send author/resolver IDs: the server derives them from the session. History accepts `after` or `before`, not both. Responses are `Cache-Control: no-store`.

## Verification

`server/test/discussions.test.js` exercises the real service and Express routes with an isolated in-memory fixture: all roles, expiry/deactivation/start dates, cross-team access, creator/owner-only resolution, concurrent replies, stale versions, retry deduplication, counter rollback, filtering/counts, message/topic pagination, validation, HTTP throttling and frontend message merging. No actual user records or provider keys are needed to run these tests.

Manual QA: create a topic as a regular member; reply from another member; observe updates without reloading; resolve as the creator; confirm the composer closes and filters/counts update; reopen as owner; verify another admin cannot resolve someone else's topic; test mobile, keyboard navigation, long messages, history loading, hidden tabs and connection failure/retry. Edits/deletions, uploads, mentions, typing indicators, read receipts and notifications are not included in this first version.
