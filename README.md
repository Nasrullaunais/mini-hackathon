# DengueWatch

A community dengue breeding-site reporting and response tracker, built for the
SE3090 Mini Hackathon (Build for Sri Lanka).

Next.js 16 · Postgres (Neon) · Drizzle · Zod · shadcn/ui (Radix, `new-york`) ·
Tailwind v4 · Vercel Blob · deployed on Vercel.

> **Read [GUIDELINES.md](./GUIDELINES.md) before writing code.** It covers the
> workflow, the feature pattern, git rules, and the 4-hour plan. `DESIGN.md` is
> the full schema and feature spec.

**Live:** <https://mini-hackathon-gen-x5.vercel.app>
**Demo video:** _[link — add before submission]_

---

## The problem

Dengue is a recurring national health emergency in Sri Lanka. The mosquitoes that
spread it breed in small, ordinary places — a blocked drain, a discarded tyre, a
half-built construction site left to collect rainwater — and the people who spot
these sites first (residents, passers-by) are almost never the people who can do
anything about them (Public Health Inspectors and municipal fogging/cleaning
crews). Reports and response are disconnected: a breeding site can sit unreported
for weeks, or reported and then forgotten, because there is no shared record of
what's been seen and what's been done about it.

## The solution

DengueWatch gives each side of that gap a real interface, tied together by one
report and a visible lifecycle:

- **Citizens** report a breeding site with a photo, a location, and what kind of
  site it is — and can see the public list of everything reported nearby and
  whether it's been resolved.
- **PHI officers** triage the incoming queue, assign a risk level, and dispatch a
  fogging, cleaning, or inspection team.
- **Field crews** see the jobs dispatched to their team and log what they actually
  did on site to close it out.
- A **dashboard** calculates a risk score per area from active reports, flags
  hotspots, and shows team workload — so a handful of crews can be sent where
  they matter most instead of wherever was reported last.

Every status change is recorded as an event with who did it, so the detail page
for any report is a full, visible decision trail from "reported" to "cleared."

## Main features

| Feature | What it demonstrates |
|---|---|
| Citizen report submission, with photo upload to Vercel Blob | **Create** |
| Public report list with area/status/site-type filters, and a detail/timeline view | **Read**, search & filter |
| Officer triage (assess → dispatch → reject) and crew resolution, each a real state transition | **Update** |
| Area risk score, hotspot flags, and team workload on the dashboard | **Calculate** |
| Real accounts: phone + password registration and login, session-based auth | Input validation, auth |

## Technologies used

- **Framework:** Next.js 16 (App Router, Turbopack), React, TypeScript
- **UI:** shadcn/ui (`new-york`/Radix), Tailwind CSS v4
- **Data:** Postgres (Neon in production, Docker locally), Drizzle ORM
- **Validation:** Zod, via `drizzle-zod`
- **Auth:** scrypt password hashing (`node:crypto`) + a database-backed session table
- **Storage:** Vercel Blob (photo uploads)
- **Deployment:** Vercel (auto-deploy on push to `main`, PR previews)

## AI tools used

> Declared per the assignment's AI usage policy. AI assistance was used
> throughout; every team member reviewed, ran, and can explain the code they
> are responsible for. A full prompt-by-prompt log for the submission PDF is
> kept in [`AI_PROMPT_LOG.md`](./AI_PROMPT_LOG.md).

- **Claude Code (Anthropic)** — used to design the database schema and
  lifecycle rules, write the Zod validation layer, implement the auth
  (register/login/logout) server actions, write the demo seed data script,
  verify the build/lint/typecheck pipeline, check the production deployment
  status, and draft this README. All generated code was read, run against a
  live database, and manually tested (including via direct HTTP requests
  against the running dev server) before being committed.
- _[Member — tool]_ — _[what it was used for, one line]_
- _[Member — tool]_ — _[what it was used for, one line]_
- _[Member — tool]_ — _[what it was used for, one line]_

## Team & contributions

| Name | Student ID | Area owned | Contribution |
|---|---|---|---|
| _[Member 1 name]_ | _[ID]_ | Foundation — schema, validation, auth, seed data | _[fill in at wrap-up]_ |
| _[Member 2 name]_ | _[ID]_ | Public browsing — report list, detail page, timeline | _[fill in at wrap-up]_ |
| _[Member 3 name]_ | _[ID]_ | Workflow — officer triage, crew resolution | _[fill in at wrap-up]_ |
| _[Member 4 name]_ | _[ID]_ | Dashboard, landing page, polish | _[fill in at wrap-up]_ |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run db:up      # local Postgres on port 5442
npm run db:push    # create tables
npm run db:seed    # sample data (8 areas, 3 teams, 12 users, 24 reports)
npm run dev
```

Before pushing: `npm run verify` (typecheck + lint + build).

- App — <http://localhost:3000>
- Reference CRUD — <http://localhost:3000/items>
- Health check — <http://localhost:3000/api/health>

**Seeded demo accounts** (all share the password `dengue2026`):

| Role | Phone | Notes |
|---|---|---|
| Officer (Colombo) | `0772000001` | Triages Narahenpita/Dehiwala/Maharagama/Kaduwela/Moratuwa reports |
| Officer (Gampaha) | `0772000002` | Triages Negombo/Gampaha reports |
| Officer (Kandy) | `0772000003` | Triages Kandy reports |
| Crew (Fogging Unit A) | `0773000001` | |
| Crew (Cleaning Crew 2) | `0773000002` | |
| Crew (Inspection Team North) | `0773000003` | |
| Citizen | `0771000001` | Any of `0771000001`–`0771000006` |

## Where things live

| Path | What |
|---|---|
| `src/db/schema.ts` | All tables. Single owner — see GUIDELINES §5. |
| `src/db/index.ts` | Drizzle client (`server-only`). Import `{ db } from "@/db"`. |
| `src/lib/validations/` | Zod schemas derived from the tables, one file per entity. |
| `src/lib/form.ts` | `ActionState` + `parseForm()` used by every server action. |
| `src/lib/actions/` | Server actions, one file per feature. |
| `src/app/<feature>/` | Routes. |
| `src/components/<feature>/` | Feature components. |
| `src/components/ui/` | shadcn components. Re-add rather than hand-edit. |

The `items` feature is a complete reference CRUD slice: read it, then copy it.
See `DESIGN.md` for the full schema, lifecycle, and per-owner file map.
