# AI Prompt Log

Mandatory record of significant AI use, per the assignment's AI usage policy
(§2.2). Redact anything sensitive (passwords, API keys, personal data) before
submission. One entry per significant use — doesn't need to be every single
prompt, but should cover anything that materially shaped the code.

Format:

```
### [Tool] — [one-line purpose]
**Prompt (or summary if long):** ...
**Output used for:** ...
**How it was checked/modified:** ...
```

---

### Claude Code (Anthropic) — schema, lifecycle rules, and DESIGN.md

**Prompt (summary):** Design the DengueWatch database schema (areas, teams,
users, reports, report_events) and the report status lifecycle, matching the
patterns already established in GUIDELINES.md.
**Output used for:** `src/db/schema.ts`, the lifecycle section of `DESIGN.md`.
**How it was checked/modified:** Verified with `tsc --noEmit` and
`drizzle-kit generate` against a scratch directory; the transition rules were
manually re-derived and cross-checked against the marking rubric's "Update"
requirement.

### Claude Code (Anthropic) — Zod validation layer

**Prompt (summary):** Write `src/lib/validations/reports.ts` and
`src/lib/validations/auth.ts` derived from the Drizzle tables with
`drizzle-zod`, with user-facing error messages.
**Output used for:** `reportFormSchema`, `assessSchema`, `dispatchSchema`,
`rejectSchema`, `resolveSchema`, `registerSchema`, `loginSchema`.
**How it was checked/modified:** Ran sample payloads (including a deliberate
privilege-escalation attempt — posting `status`/`riskLevel`/`assignedTeamId`
on a citizen form) through each schema to confirm stripping and error text.

### Claude Code (Anthropic) — auth (register/login/logout)

**Prompt (summary):** Implement scrypt-based password hashing, a
database-backed session table, and register/login/logout Server Actions
following the house ActionState pattern.
**Output used for:** `src/lib/auth.ts`, `src/lib/current-user.ts`,
`src/lib/actions/auth.ts`, `src/app/register/`, `src/app/login/`,
`src/components/auth/`.
**How it was checked/modified:** `npm run verify` (typecheck/lint/build), then
tested live against the dev server and local Postgres — registered a real
account, confirmed a hashed password and session row in the database, tested
both a wrong-password and a correct-password login.

### Claude Code (Anthropic) — seed data

**Prompt (summary):** Write `src/db/seed.ts` with realistic demo data matching
DESIGN.md §12 — 8 areas, 3 teams, 12 users, ~24 reports distributed so the
dashboard shows a danger zone, a watch area with a hotspot, and a cleared
report proving the risk score drops.
**Output used for:** `src/db/seed.ts`.
**How it was checked/modified:** Ran `npm run db:seed` against the local
database and queried the resulting area risk scores directly with `psql` to
confirm they matched the intended bands before accepting the script.

### Claude Code (Anthropic) — README and documentation

**Prompt (summary):** Draft the README's problem/solution/features/AI
declaration/team sections, and this prompt log template.
**Output used for:** `README.md`, `AI_PROMPT_LOG.md`.
**How it was checked/modified:** Reviewed by the team for accuracy against
what was actually built; team member names, IDs, and contributions filled in
manually, not by AI.

---

<!-- Add entries below for whatever each teammate used while building their
     own slice (B: public browsing, C: triage workflow, D: dashboard/landing).
     Keep it honest — this is checked against the demo, not just read. -->

### [Tool] — [purpose]

**Prompt (or summary):**
**Output used for:**
**How it was checked/modified:**
