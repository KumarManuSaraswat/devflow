# DevFlow planning assistant

The authenticated **Ask DevFlow** page (`/assistant`) recommends task owners/reviewers, estimates team size, offers a starter task breakdown and summarizes workload. It never creates tasks or changes assignments. Each question uses fresh, server-authorized team data and the current planning inputs; previous messages are displayed for reference but are not sent as model history. Chat is not persisted and clears when leaving or switching teams.

## Install and migrate

Requires Node 20.19+ (or a supported newer Node release), the existing PostgreSQL database and the existing application environment variables.

```sh
cd server
npm ci
npm run prisma:deploy
npm run prisma:generate
npm test
npm run dev
```

The additive `20260921120000_team_assistant` migration adds member skills/weekly hours, task skills/estimated hours, and a shared provider quota table. No existing records are deleted. Deploy the migration **before** starting the new backend; older databases cannot serve the new Prisma fields. Use your normal database backup/deployment procedure. No vector database, paid subscription, extra hosting service or additional npm dependency is introduced.

Run the frontend in another terminal with `cd client`, `npm ci`, and `npm run dev` (or `npm run build` for deployment).

## Start at zero AI cost

Leave `ASSISTANT_CLOUD_ENABLED=false`. No provider is called and no API key is required. The built-in advisor remains available when cloud providers are disabled, unavailable, or over quota. Normal hosting/database usage still counts toward your existing infrastructure limits.

1. Open **Members → Edit skills & availability**. Members can edit their own profile; owners/admins can edit other eligible profiles (admins cannot edit an owner). Blank hours means unknown; zero means unavailable.
2. Add required skills and estimated total effort when creating a task, or use **Planning context → Edit planning details** on an existing task (owner/admin).
3. Open **Ask DevFlow**, choose the team/project/task, and ask a question. For headcount, expand **Planning inputs & skills** and enter total effort, weeks, and dedicated weekly hours/person.

Skill matches take priority, followed by fewer open assignments/pending reviews and lower estimated effort. Completed tasks are excluded; candidate comparisons exclude the selected task itself. Effort on multi-assignee tasks is split evenly as an approximation. Availability is self-reported; open effort is **not** remaining effort or a weekly schedule. Other teams' work, leave calendars, task dependencies and skill proficiency are not known. Review candidates exclude selected task assignees. Missing inputs and uncovered skills are disclosed rather than invented.

Built-in task breakdowns are generic software delivery templates. Tailored free-text reasoning requires an available cloud provider. Team size uses `ceil(effort / (weeks × dedicated weekly hours))`, with a second estimate reserving 20% of capacity. Do not use rankings as performance evaluations.

## Optional free-tier cloud answers

**Revoke any API key pasted into chat, source code or a screenshot. Create a replacement.** Add keys only to the backend's private `.env` or deployment environment. Never use a `VITE_` variable for a provider key, commit credentials, or paste them into the assistant.

Before enabling cloud, verify the actual provider account is on the free tier, with no billing/paid upgrades, and meets the provider's geographic, age and usage terms. An API key does **not** expose a trustworthy "free tier" flag to this application. Request caps cannot prevent charges if an operator configures a paid/billing-enabled account. Built-in-only mode is the only unconditional zero-AI-charge option.

```dotenv
ASSISTANT_CLOUD_ENABLED=true
ASSISTANT_FREE_TIER_CONFIRMED=true
GEMINI_API_KEY=your_rotated_free_tier_key
GROQ_API_KEY=your_optional_free_tier_key
ASSISTANT_GEMINI_DAILY_REQUESTS=40
ASSISTANT_GROQ_DAILY_REQUESTS=80
```

Restart the server after changes. Leave `GROQ_API_KEY` blank if you do not have one; Gemini then falls directly back to built-in advice. The confirmation flag records an operator decision, not a technical billing check. Keep cloud disabled when you cannot verify eligibility. Gemini terms restrict API access to adults and have additional regional rules; for example, the terms require paid services for API clients made available in the EEA, Switzerland or UK, so use built-in-only mode for those deployments if remaining free is mandatory.

Provider order is **Gemini → Groq → built-in**. Only fixed text models are used: `gemini-2.5-flash-lite` and `qwen/qwen3.8-27b`. No web search, grounding, tools, paid model fallback, auto-upgrades or account creation. Provider availability/pricing may change; review official docs before enabling. A removed/unavailable model falls back rather than silently switching models.

### Limits and failure behavior

- Daily **request** caps are shared across all users/teams/server instances through PostgreSQL, reset at UTC midnight, and survive restarts. They are not a promise of a provider's token allowance. Values are clamped to 100 per provider/day; invalid values or zero disable that provider.
- Each attempted request reserves a slot atomically before network access, including failures. Provider accounts may have lower quotas or other usage; provider 429 responses trigger fallback.
- Any 429, 400, 401, 403 or 404 blocks that provider for 24 hours. This conservatively covers daily-quota/credential/model issues (even if a minute-limit was the cause). Network/5xx/malformed-output failures pause it for one minute. There are no repeated retries within one question.
- Provider calls time out after 12 seconds each. Questions are limited to 2,000 characters, minimized payloads to 10,000 characters and responses to 700 output tokens per provider call. Both failures return built-in advice. If quota storage fails, cloud fails closed.
- Authenticated assistant routes are limited to 10 requests/minute/user per backend process. Daily provider budgets are cross-process; the minute limiter uses the existing in-memory limiter. A large multi-replica deployment should add a shared minute limiter.
- Context is scoped to the user's active membership (including start/expiry dates) and selected team/project/task. Teams over 200 active members, 200 projects or 2,000 open tasks receive a clear capacity error, rather than silently incomplete rankings.

Daily quota rows contain counters, not prompts. They are small (at most two per day, plus provider cooldown rows); keep them for audit or prune old daily rows using your normal maintenance process. Do not clear the current-day counters or cooldown rows to bypass provider quotas.

## Data privacy

Cloud requires a per-question opt-in checkbox, off by default. Questions, numeric planning/workload summaries, standard skill labels and candidate roles can leave your server. Database names, emails, IDs, descriptions and task titles are not included in the structured cloud context; known names/titles in the question are replaced, email-like strings removed and obvious key patterns block cloud requests. This is data minimization, **not guaranteed anonymization**. Users must not submit personal, sensitive or confidential material; use built-in mode for private work. A user can still type identifying information that pattern matching does not recognize.

Free Gemini content may be reviewed and used to improve Google products. Groq has its own retention policies and optional Zero Data Retention controls. Provider replies are untrusted plain text, never HTML or executable actions. API errors, prompts and responses are not logged by the assistant. The existing HTTP access logger may log request paths, not chat bodies.

## Verification

```sh
cd server
npm test
npx prisma validate
cd ../client
npm run lint
npm run build
```

Tests mock providers: no credentials, paid calls or external services are needed. They cover fallback order, disabled/consent modes, quotas/cooldowns/concurrency, privacy filtering, permissions, context isolation, validation, HTTP rate limits, skill matching and headcount calculations. Live provider calls require separately configured rotated keys and are not part of the tests.

Manual checks: open the assistant on mobile/desktop; change teams during a request; verify old-team responses do not appear; test an empty team; save/reload member skills and task effort; check missing estimates; ensure cloud consent resets after a response; enable reduced motion; use the keyboard to select prompts and send; verify a non-member cannot load another team's context.

## Official references (checked September 21, 2026)

- [Gemini pricing and free-tier data treatment](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API terms and eligibility](https://ai.google.dev/gemini-api/terms)
- [Gemini generateContent API](https://ai.google.dev/api/generate-content)
- [Groq free-plan rate limits](https://console.groq.com/docs/rate-limits)
- [Groq billing FAQ](https://console.groq.com/docs/billing-faqs)
- [Groq data controls](https://console.groq.com/docs/your-data)
