# Demonstrating the three added project topics

## 1. LLM structured outputs

Open **Ask DevFlow**, select a workspace, and ask a planning question. With cloud consent and an available configured provider, the server requests this JSON shape:

```json
{
  "summary": "Confirm the scope and available capacity before assigning work.",
  "nextSteps": ["Estimate each task.", "Choose a reviewer other than its author."],
  "questions": ["When is the delivery deadline?"]
}
```

`server/src/assistant/structuredAdvice.js` defines the provider JSON Schema and a strict Zod validator. `providers.js` sends the schema through Gemini's `generationConfig.responseJsonSchema` / JSON MIME type and Groq's `response_format: json_schema` with strict mode. Shape constraints are sent to providers; local validation additionally bounds lengths and array sizes and rejects missing/extra fields. JSON parsing is not the same as schema validation: `{"summary": 42}` is valid JSON but invalid advice.

The provider must finish normally. Refusals, truncated output, malformed JSON and invalid fields follow the existing Gemini → Groq → built-in fallback. No extra repair/retry calls are added. Consent, daily caps, cooldowns and the free-tier opt-in gate remain unchanged. Built-in responses include the same UI shape but are labelled **Built-in advisor**—they are not evidence that a cloud model was called. Model output cannot overwrite deterministic candidate rankings/team-size calculations or change tasks. React renders returned strings as text, not HTML. The legacy `answer` field remains for older installed APKs.

See [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Gemini REST generation configuration](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig), and [Groq structured outputs](https://console.groq.com/docs/structured-outputs). Provider support can change; mock-based tests do not prove a live provider call succeeds. Schema validation also does not prove factual correctness.

## 2. SQL JOINs: workspace delivery report

Open a workspace and select **Delivery report** (`/teams/:teamId/report`). The authenticated API is `GET /api/teams/:teamId/reports/delivery?page=1`.

`server/src/reports/delivery.js` uses a parameterized `Prisma.sql` query, executed with `$queryRaw`, not Prisma `include` and not `$queryRawUnsafe`.

- `INNER JOIN Team → Project` scopes projects to a workspace.
- Joining the viewing `TeamMember` restricts the SQL itself to active, started, unexpired memberships; the service also checks access before running it.
- `LEFT JOIN Task` keeps projects with no tasks in the report.
- `INNER JOIN Task → TaskAssignee → User → TeamMember` counts distinct, currently active assignees on open work.
- Separate aggregate CTEs prevent one task with two assignees from doubling the task count or effort sum.

The page shows completion, blocked tasks, open tasks without active assignees, active assignee counts, estimated open effort and missing estimates. “Open” means any status other than Completed. Effort is each open task's entire estimate counted once, not remaining effort or weekly workload. Member availability hours are not part of this report. Totals cover the current page of up to 20 projects, not the entire team. Input is validated and bound as parameters; no IDs or sort expressions are concatenated into SQL. This report is read-only and requires no schema migration.

For a presentation, create disposable local fixtures with an empty project, a task assigned to two members, a blocked/unassigned task, and another team's private project. Explain why the empty project remains, shared effort is not doubled, and the foreign project is absent. The automated tests already exercise these cases against an in-memory PostgreSQL engine using the project's real migrations. They never load `.env` or connect to production.

## 4. JavaScript fundamentals

From the `server` directory run:

```text
npm run demo:javascript
```

The examples in `server/examples/javascript-concepts.js` are deliberately small, runnable and tested. They do not contact an API or change any project data.

**Closures:** `createTaskCounter()` returns methods that keep access to a private `count` after the outer function returns. The two returned counters keep independent state: team A becomes 2 while team B stays 10. Real DevFlow examples are `createResourceCache()` in the client and `requireTeamRole(...allowedRoles)` in the backend.

**Event loop:** the expected output is:

```text
sync:start → sync:end → microtask:promise → microtask:queued → timer
```

Synchronous statements finish first, then these queued microtasks run in order, then the zero-delay timer callback. Zero milliseconds does not mean “interrupt current JavaScript.” Async/await does not create a JavaScript thread; continuations run after the awaited promise settles. In DevFlow, requests yield control while waiting for I/O and `usePollingResource` schedules later refreshes. A busy synchronous loop would still block UI interaction.

**Hoisting:** the function declaration is callable before its textual definition. A `var` binding read before assignment yields `undefined`. `let` and `const` bindings exist but cannot be accessed before initialization: the temporal dead zone produces `ReferenceError`. The demo catches these deliberate errors so it can show the contrast without crashing. Prefer declarations before use in production; this educational example is not a reason to rewrite the app with `var`.

## Verification and rollout

Run `npm test` in `server`, and `npm run lint` / `npm run build` in `client`. SQL tests use the development-only `@electric-sql/pglite` dependency, so install development dependencies before testing. Provider tests use synthetic responses and do not spend AI quota.

Verified locally on 29 September 2026: all 72 tests passed, client lint and both web/Android web-asset builds passed, and the JavaScript demo produced the documented order. Isolated browser checks verified the workspace report link, totals, empty-project display, pagination/empty-page handling, and structured next-step/question sections. The report fit a 390px viewport without horizontal overflow. Browser and provider fixtures are synthetic; no real cloud completion, production SQL query, APK rebuild or phone installation was performed for this change.

These changes must be deployed to the backend and web frontend before the live site has them. Android needs a new, version-bumped release build for the report screen and structured layout. The previously shared 1.0.4 APK is intentionally not overwritten. Older APKs can still display the plain-text `answer` returned by the updated server. No Git push, live deploy, production data change or phone installation is performed by these examples/tests.
