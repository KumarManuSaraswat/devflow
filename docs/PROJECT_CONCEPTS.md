# DevFlow concepts and interview demonstrations

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

## Browser Concept lab (7 October 2026)

Sign in and open **Concept lab** from the desktop sidebar or mobile navigation (`/concepts`). This supplements the existing features above; it does not replace them. The page is lazy-loaded, and all three demonstrations use local, synthetic examples rather than team data. No new dependency, database, account, API key or paid service is required.

### Event loop and hoisting

1. Click **Run event loop** and explain the observed order: synchronous start/end, promise microtask, explicitly queued microtask, timer. The browser really runs these callbacks; the order is not a pre-filled animation. This is not a performance benchmark or a complete model of rendering/Node.js event-loop phases.
2. Click **Run hoisting comparison**. Function declarations can be called before their definition; `var` reads as `undefined` before assignment; `let`, `const` and the `const` arrow function produce caught `ReferenceError`s before initialization.
3. Expand **View the demo source code** to show the actual function executing in the browser. Discuss why source code does not literally move and why `async` does not create a new JavaScript thread.

The source is `client/public/demos/javascript-concepts.mjs`. It is served as an unchanged app asset, not passed through the optimizer: production minification can remove deliberate unused temporal-dead-zone reads and make an educational demo incorrect. The page loads this fixed same-origin module, never `eval` or user-supplied JavaScript. The Vite configuration serves only this exact asset unmodified in development too, without relaxing public-file handling globally. Tests in `server/test/conceptLab.test.js` execute the same source. Keep the public module intact when changing build tooling.

### MongoDB schema modeling — demo only

The user chose a schema-modeling demonstration, **not a MongoDB-backed feature**. DevFlow still uses PostgreSQL in production. Do not tell an interviewer that retrospectives are saved in MongoDB or that a live MongoDB integration was tested.

`client/src/utils/mongoModelDemo.js` defines a proposed retrospective document: required title/summary, category enum, PostgreSQL team/user ID references, up to five unique tags, and up to eight embedded action objects. The sample and schema are visible in `MongoModelDemo.jsx`.

1. Click **Load valid example → Validate document** to see a successful local draft check.
2. Click **Load invalid example → Validate document**. Explain the invalid category and why the string `"yes"` is not a Boolean.
3. Edit the JSON to remove a required field, add a ninth action or duplicate a tag. Validation reports the affected path. Malformed/oversized drafts are rejected, unexpected fields are rejected, and text is rendered safely without HTML evaluation.
4. Expand **Show MongoDB collection schema & indexes**. These are reference `db.createCollection` / `$jsonSchema` and compound-index commands, not commands executed by DevFlow. The collection schema permits MongoDB's generated `_id` despite `additionalProperties: false`, and represents optional timestamps as BSON dates. A real application would supply timestamps and appropriate BSON numeric/date types.

Explain why the small, bounded action list is embedded, while independently managed accounts and team membership are referenced. The references are strings, not cross-database foreign keys; a real backend would enforce membership and reference integrity. Single-document atomicity does not provide a PostgreSQL–MongoDB transaction. Indexes reflect team/category access patterns but consume storage and write effort. ObjectId ordering is useful for this example's cursor design, not a guarantee of global insertion-time order.

The local JSON checker implements only the example's limited keyword set. It does not validate BSON, connect to MongoDB, prove index performance, save notes or replace server-side validation. It uses at most 16,000 input characters and bounded lists. Drafts stay in component memory and reset on leaving/reloading the page; do not enter real private information.

References: [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model), [MongoDB schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/), and [MongoDB data modeling](https://www.mongodb.com/docs/manual/data-modeling/).

### Interview wording

“DevFlow's real workflow uses PostgreSQL and parameterized SQL reports. I added executable JavaScript demonstrations and an interactive MongoDB schema-design exercise. The MongoDB exercise demonstrates document structure, embedding, references, validation and index design; it does not claim production MongoDB persistence.”

Verification on 7 October 2026: all 77 server tests, client lint and web build passed. A separate synthetic production-build browser preview verified the event-loop order, all five hoisting outcomes, valid/invalid schema feedback and the mobile menu. At a 390px viewport the document did not overflow horizontally. The built JavaScript demo module was also checked byte-for-byte against its source and its hoisting results executed directly. No production data was accessed, no database dependency installed, and no GitHub push or APK rebuild was performed for this addition.

## Verification and rollout

Run `npm test` in `server`, and `npm run lint` / `npm run build` in `client`. SQL tests use the development-only `@electric-sql/pglite` dependency, so install development dependencies before testing. Provider tests use synthetic responses and do not spend AI quota.

Verified locally on 29 September 2026: all 72 tests passed, client lint and both web/Android web-asset builds passed, and the JavaScript demo produced the documented order. Isolated browser checks verified the workspace report link, totals, empty-project display, pagination/empty-page handling, and structured next-step/question sections. The report fit a 390px viewport without horizontal overflow. Browser and provider fixtures are synthetic; no real cloud completion, production SQL query, APK rebuild or phone installation was performed for this change.

These changes must be deployed to the backend and web frontend before the live site has them. Android needs a new, version-bumped release build for the report screen and structured layout. The previously shared 1.0.4 APK is intentionally not overwritten. Older APKs can still display the plain-text `answer` returned by the updated server. No Git push, live deploy, production data change or phone installation is performed by these examples/tests.
