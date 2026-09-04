# DengueWatch — High-Level Design & Database Schema

**Topic:** Community dengue breeding-site reporting and response.
**Stack:** exactly what `GUIDELINES.md` already sets up — Next.js 16 App Router,
Server Components + Server Actions, Drizzle + Postgres, Zod via `drizzle-zod`,
shadcn (`new-york`/Radix), Tailwind v4, Vercel. Plus **Vercel Blob** for photos.

> Read `GUIDELINES.md` first. This document only decides **what** we build and
> **what the data looks like**. It does not change any rule in there.
>
> **Schema status: verified.** The schema in §4 type-checks under `tsc --noEmit`,
> generates valid Postgres DDL through `drizzle-kit` (5 tables, 8 foreign keys,
> 7 indexes), and the queries in §7 and the Zod schemas in §5 were built and run
> against it. See §13 for exactly what was checked and the one claim it disproved.

---

## 1. What the app is

> Anyone in Sri Lanka can report a mosquito breeding site they've spotted —
> stagnant water, a blocked drain, a rubbish pile — with a photo and a location.
> Public health staff review each report, assign a risk level, and dispatch a
> fogging or cleaning team. The crew that goes out confirms what they did. A
> dashboard shows which areas are heating up so limited teams get sent where
> they matter most.

**Three roles, three views:**

| Role | What they do | Where |
|---|---|---|
| **Citizen** | Submits a report with a photo; browses what's been reported nearby and whether it got fixed | `/report`, `/reports` |
| **PHI officer** *(Public Health Inspector)* | Triages the queue, assigns risk, dispatches a team, rejects false alarms | `/staff`, `/dashboard` |
| **Field crew** | Sees jobs dispatched to their team, logs what they did, closes them | `/team` |

Real problem, real users: dengue is a recurring national emergency here, and the
actual bottleneck is that **reports and response are disconnected** — people
notice breeding sites long before an inspector does, and nobody closes the loop.

### How this maps to the marking rubric

| Rubric item | Where it lands |
|---|---|
| Relevance of the Sri Lankan problem (10) | Dengue is current, national, well known. Named users: households near stagnant water, PHI officers, municipal crews. |
| Practicality & creativity (15) | Three distinct roles with a real handoff between them, a scarce resource (crews) being allocated, and an outcome that feeds back into the area risk score. |
| **Create** | Citizen submits a report with a photo upload |
| **Read** | Public list + detail page with a full timeline |
| **Update** | Officers and crews move a report through its lifecycle |
| **Calculate** | Area risk score, hotspot flags, team workload (§7) |

---

## 2. The lifecycle (this is the heart of the app)

```
  citizen submits
        │
        ▼
   ┌──────────┐   officer opens it  ┌──────────────┐  officer sends a team ┌────────────┐
   │ reported │ ──────────────────▶ │ under_review │ ────────────────────▶ │ dispatched │
   └──────────┘   assigns RISK      └──────────────┘  assigns a TEAM       └────────────┘
        │                                  │                                     │
        │      not a breeding site         │                                     │ CREW logs
        │         / duplicate              │                                     │ what it did
        ▼                                  ▼                                     ▼
   ┌──────────┐                      ┌──────────┐                          ┌─────────┐
   │ rejected │ ◀────────────────────│ rejected │                          │ cleared │
   └──────────┘                      └──────────┘                          └─────────┘
       officer                          officer                               crew
```

Rules enforced **in the server action**, not just in the UI:

- `reported` → `under_review` | `rejected`
- `under_review` → `dispatched` | `rejected`
- `dispatched` → `cleared`
- `cleared` and `rejected` are terminal.
- Moving to `under_review` **requires** a `riskLevel` — that's the judgment step.
- Moving to `dispatched` **requires** an `assignedTeamId`, and stamps `dispatchedAt`.
- Moving to `cleared` **requires** an `actionTaken`, and stamps `resolvedAt`.
- A crew may only clear a report **assigned to its own team**.

Every transition appends a row to `report_events` recording **who** did it, which
is what the detail page renders as a timeline. That timeline is the most
demo-friendly thing in the app — it makes the whole process visible in one screen.

---

## 3. Screens

| Route | Owner | What it does |
|---|---|---|
| `/` | D | Landing: one-line pitch, role buttons, three live counters |
| `/register` | A | Citizen sign-up. Phone + name + password. See §5b |
| `/login` | A | Phone + password. Seeded officer/crew accounts log in here too |
| `/report` | A | The create form, with photo upload. Server Action + `useActionState` |
| `/reports` | B | Public list. Filter by area, status, site type. Photo thumb + status badge |
| `/reports/[id]` | B | Detail: photo, description, assessment, assigned team, event timeline |
| `/staff` | C | Officer triage queue grouped by status. Assess / dispatch / reject |
| `/team` | C | Crew view: jobs dispatched to my team. Resolve dialog |
| `/dashboard` | D | Area risk table, hotspots, team workload, status breakdown |
| `/api/health` | — | Already exists. Leave it alone. |

Everything reads with `export const dynamic = "force-dynamic"` and a direct
`db.select()` in the Server Component, like `src/app/items/page.tsx`.
**No new `route.ts` files.** Nothing outside our own pages calls this app.

---

## 4. Database schema

Five tables. `users` carries the role, `teams` is the dispatch target, `areas` is
a seeded lookup so the dashboard groups reliably and the dropdown can't fill with
`"colombo "` vs `"Colombo"` typos.

```
                    ┌───────────┐
                    │   areas   │──────────────┐
                    ├───────────┤              │ base_area_id
                    │ id (pk)   │              ▼
                    │ name uniq │        ┌───────────┐
                    │ district  │        │   teams   │
                    └───────────┘        ├───────────┤
                      ▲   ▲   ▲          │ id (pk)   │
             area_id  │   │   │ area_id  │ name uniq │
                      │   │   │          │ type      │
              ┌───────┴─┐ │ ┌─┴──────────│ active    │
              │  users  │ │ │  team_id   └───────────┘
              ├─────────┤ │ │                  ▲
              │ id (pk) │◀┼─┘                  │ assigned_team_id
              │ name    │ │                    │
              │ role    │ │  ┌─────────────────┴───┐
              │ phone   │◀┼──│       reports       │
              │ team_id │ │  ├─────────────────────┤
              └─────────┘ └──│ id (pk)             │
                    ▲ reporter_id │ …citizen cols  │
           actor_id │        │ …officer cols       │
                    │        │ …crew cols          │
              ┌─────┴────────┴─────┐              │
              │   report_events    │◀─────────────┘
              ├────────────────────┤   report_id
              │ id, from_status,   │
              │ to_status, note    │
              └────────────────────┘
```

The `reports` table has a deliberate three-way split: **citizen columns** (what
the create form owns), **officer columns**, and **crew columns**. That split is
what `.pick()` enforces in the Zod layer — verified in §13, a citizen posting
`status=cleared` gets it silently stripped.

### `src/db/schema.ts` — drop this in whole

```ts
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Allowed values live here as `as const` arrays so Drizzle, drizzle-zod and the
 * UI all read from one list. These are text columns with a TypeScript-level enum,
 * NOT pgEnum: `db:push` never has to ALTER TYPE, so changing the list mid-build
 * is free. The trade-off is that the constraint is enforced by Zod, not by
 * Postgres -- see §10. (TS `enum` is banned by our lint config; these are const
 * arrays, which is the pattern the rule wants.)
 */
export const USER_ROLES = ["citizen", "officer", "crew"] as const;

export const SITE_TYPES = [
  "stagnant_water",
  "garbage_pile",
  "construction_site",
  "blocked_drain",
  "other",
] as const;

export const RISK_LEVELS = ["low", "medium", "high"] as const;

export const REPORT_STATUSES = [
  "reported",
  "under_review",
  "dispatched",
  "cleared",
  "rejected",
] as const;

export const TEAM_TYPES = ["fogging", "cleaning", "inspection"] as const;

export const ACTIONS_TAKEN = [
  "drained",
  "debris_removed",
  "fogged",
  "container_removed",
  "no_action_needed",
] as const;

/** Statuses that still need someone to do something. Used by the dashboard. */
export const ACTIVE_STATUSES = [
  "reported",
  "under_review",
  "dispatched",
] as const;

/** Every table gets these two, per GUIDELINES.md §5. */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/* ------------------------------------------------------------------ areas */

export const areas = pgTable("areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** e.g. "Narahenpita". Unique so joins and the seed stay safe. */
  name: text("name").notNull().unique(),
  /** e.g. "Colombo". Lets the dashboard roll up a level if we have time. */
  district: text("district").notNull(),
  ...timestamps,
});

/* ------------------------------------------------------------------ teams */

/** The dispatch target: a fogging or cleaning crew, not an individual. */
export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(), // "Fogging Unit A"
    type: text("type", { enum: TEAM_TYPES }).notNull(),
    baseAreaId: uuid("base_area_id").references(() => areas.id, {
      onDelete: "set null",
    }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("teams_type_idx").on(table.type)],
);

/* ------------------------------------------------------------------ users */

/**
 * People. NO auth in this build -- there is deliberately no password or session
 * column. The header has a "Signed in as" picker that writes a cookie; see §10.
 * Adding auth columns we never use would be worse than not having them.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    role: text("role", { enum: USER_ROLES }).notNull().default("citizen"),
    /** Phone-first country: this is the natural contact key. */
    phone: text("phone").unique(),
    /** Home area for a citizen, assigned area for an officer. Optional. */
    areaId: uuid("area_id").references(() => areas.id, { onDelete: "set null" }),
    /** Only set for role = "crew". Which crew this person goes out with. */
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("users_role_idx").on(table.role)],
);

/* ---------------------------------------------------------------- reports */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- citizen-owned: the create form may set these -------------------
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id, { onDelete: "restrict" }),
    /** Free-text landmark: "behind the temple, Elvitigala Mw". */
    addressLine: text("address_line").notNull(),
    siteType: text("site_type", { enum: SITE_TYPES }).notNull(),
    description: text("description").notNull(),
    /** Vercel Blob public URL. See §6. */
    photoUrl: text("photo_url"),
    /** Blob pathname, kept so the file can be del()'d if the report is removed. */
    photoPathname: text("photo_pathname"),
    /** The reporter's own guess. Advisory only -- officers set the real one. */
    reportedSeverity: text("reported_severity", { enum: RISK_LEVELS }),

    // --- officer-owned ---------------------------------------------------
    status: text("status", { enum: REPORT_STATUSES })
      .notNull()
      .default("reported"),
    /** Assigned during review. NULL means "not assessed yet". */
    riskLevel: text("risk_level", { enum: RISK_LEVELS }),
    assignedTeamId: uuid("assigned_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),

    // --- crew-owned ------------------------------------------------------
    actionTaken: text("action_taken", { enum: ACTIONS_TAKEN }),
    resolutionNotes: text("resolution_notes"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    ...timestamps,
  },
  (table) => [
    index("reports_status_idx").on(table.status),
    index("reports_area_idx").on(table.areaId),
    index("reports_team_idx").on(table.assignedTeamId),
    index("reports_created_at_idx").on(table.createdAt),
  ],
);

/* ---------------------------------------------------------- report_events */

/**
 * Append-only audit trail. One row per status change; never updated or deleted.
 * This is what the detail page renders as a timeline, and it is the source of
 * truth for "who assessed this" and "who cleared it" -- which is why those are
 * NOT denormalised onto `reports`.
 */
export const reportEvents = pgTable(
  "report_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** NULL only for the very first "submitted" event. */
    fromStatus: text("from_status", { enum: REPORT_STATUSES }),
    toStatus: text("to_status", { enum: REPORT_STATUSES }).notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [index("report_events_report_idx").on(table.reportId)],
);

/* -------------------------------------------------------------- relations */

export const areasRelations = relations(areas, ({ many }) => ({
  reports: many(reports),
  users: many(users),
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  baseArea: one(areas, { fields: [teams.baseAreaId], references: [areas.id] }),
  members: many(users),
  assignedReports: many(reports),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  area: one(areas, { fields: [users.areaId], references: [areas.id] }),
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  reports: many(reports),
  events: many(reportEvents),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  reporter: one(users, { fields: [reports.reporterId], references: [users.id] }),
  area: one(areas, { fields: [reports.areaId], references: [areas.id] }),
  assignedTeam: one(teams, {
    fields: [reports.assignedTeamId],
    references: [teams.id],
  }),
  events: many(reportEvents),
}));

export const reportEventsRelations = relations(reportEvents, ({ one }) => ({
  report: one(reports, {
    fields: [reportEvents.reportId],
    references: [reports.id],
  }),
  actor: one(users, { fields: [reportEvents.actorId], references: [users.id] }),
}));

/* ------------------------------------------------------------------ types */

export type Area = typeof areas.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type User = typeof users.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type ReportEvent = typeof reportEvents.$inferSelect;

export type UserRole = (typeof USER_ROLES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type SiteType = (typeof SITE_TYPES)[number];
export type TeamType = (typeof TEAM_TYPES)[number];
```

Keep the `items` table until everyone has read it once as the reference. It costs
nothing, and `/items` is a useful escape hatch if something breaks and you need to
prove the database itself is fine.

### `reports` column reference

**Citizen columns** — the only ones `reportFormSchema` picks

| Column | Type | Null? | Notes |
|---|---|---|---|
| `reporter_id` | uuid FK → `users.id` | no | `onDelete: restrict` — never orphan a report |
| `area_id` | uuid FK → `areas.id` | no | `onDelete: restrict` |
| `address_line` | text | no | Landmark description, 5–300 chars |
| `site_type` | text enum | no | 5 values |
| `description` | text | no | 10–2000 chars — forces useful demo data |
| `photo_url` | text | yes | Vercel Blob public URL |
| `photo_pathname` | text | yes | Blob key, for cleanup |
| `reported_severity` | text enum | yes | Citizen's guess; advisory only |

**Officer columns**

| Column | Type | Null? | Set when |
|---|---|---|---|
| `status` | text enum | no, default `reported` | Every transition |
| `risk_level` | text enum | yes | On `under_review` (required there) |
| `assigned_team_id` | uuid FK → `teams.id` | yes | On `dispatched` (required there) |
| `dispatched_at` | timestamptz | yes | Stamped on `dispatched` |

**Crew columns**

| Column | Type | Null? | Set when |
|---|---|---|---|
| `action_taken` | text enum | yes | On `cleared` (required there) |
| `resolution_notes` | text | yes | On `cleared`, optional |
| `resolved_at` | timestamptz | yes | Stamped on `cleared` |

Conventions from `GUIDELINES.md` §5 hold: `snake_case` in the DB, `camelCase` in
TypeScript, `id`/`createdAt`/`updatedAt` everywhere. `report_events.updatedAt`
exists for consistency only — nothing updates an event.

**Deliberately absent:** there is no `team_type` column on `reports`. It would be
derived from `teams.type` and could disagree with it. Join instead.

---

## 5. Validation — `src/lib/validations/reports.ts`

**One file, written by the schema owner in the first 30 minutes, then frozen.**
Everyone imports from it; nobody edits it after 0:30. This is the most likely
merge-conflict file in the project, so we remove the conflict by finishing it
before anyone else starts.

Schemas are derived from the table with `createInsertSchema`, per `AGENTS.md`.
A `text({ enum: [...] })` column becomes a `z.enum` automatically — but its
default message is `"Invalid option: expected one of …"`, which breaks our
"user-facing prose" rule, so override every enum with a real message.

```ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  ACTIONS_TAKEN,
  REPORT_STATUSES,
  RISK_LEVELS,
  SITE_TYPES,
  reports,
} from "@/db/schema";

/** Same helper as validations/items.ts — "" and undefined both become NULL. */
const optionalText = (max: number, label: string) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return null;
      return typeof value === "string" && value.trim() === "" ? null : value;
    },
    z
      .string()
      .trim()
      .max(max, `${label} must be ${max} characters or fewer`)
      .nullable(),
  );

/**
 * An empty file input still submits a 0-byte File, so "no photo chosen" has to
 * be normalised to null BEFORE the mime check runs — otherwise every photoless
 * report fails with "Photo must be a JPEG, PNG or WebP". (Verified: §13.)
 */
const optionalPhoto = z.preprocess(
  (value) => (value instanceof File && value.size === 0 ? null : value),
  z
    .file()
    .max(5 * 1024 * 1024, "Photo must be 5MB or smaller")
    .mime(
      ["image/jpeg", "image/png", "image/webp"],
      "Photo must be a JPEG, PNG or WebP image",
    )
    .nullable(),
);

export const reportIdSchema = z.uuid("Not a valid report id");
export const userIdSchema = z.uuid("Not a valid user id");

/**
 * What the citizen form owns. Note what is NOT picked: reporterId, status,
 * riskLevel, assignedTeamId, actionTaken, resolvedAt. Zod strips them, so the
 * form physically cannot set them.
 *
 * `reporterId` is deliberately NOT here. The acting user comes from the cookie
 * via getCurrentUser() on the server -- the same rule the officer and crew
 * schemas below follow. A hidden <input name="reporterId"> would be forgeable
 * AND is one more thing to wire up; `userIdSchema` still exists because
 * createReport validates the cookie value with it before inserting.
 */
export const reportFormSchema = createInsertSchema(reports, {
  areaId: z.uuid("Select an area"),
  addressLine: (schema) =>
    schema
      .trim()
      .min(5, "Describe where the site is")
      .max(300, "Location must be 300 characters or fewer"),
  siteType: z.enum(SITE_TYPES, { message: "Choose what kind of site this is" }),
  description: (schema) =>
    schema
      .trim()
      .min(10, "Tell us a bit more — at least 10 characters")
      .max(2000, "Description must be 2000 characters or fewer"),
})
  .pick({
    areaId: true,
    addressLine: true,
    siteType: true,
    description: true,
  })
  .extend({
    photo: optionalPhoto,
    reportedSeverity: z
      .enum(RISK_LEVELS, { message: "Choose a severity" })
      .nullable()
      .catch(null),
  });

/**
 * Staff/crew schemas carry no actorName: the acting user comes from the cookie
 * on the server (see §10), never from the form. A form field would be trivially
 * forgeable AND extra typing during the demo.
 */

/** Officer step 1: reported -> under_review. Risk is mandatory here. */
export const assessSchema = z.object({
  id: reportIdSchema,
  riskLevel: z.enum(RISK_LEVELS, { message: "Assign a risk level" }),
  note: optionalText(500, "Note"),
});

/** Officer step 2: under_review -> dispatched. */
export const dispatchSchema = z.object({
  id: reportIdSchema,
  assignedTeamId: z.uuid("Choose which team to send"),
  note: optionalText(500, "Note"),
});

/** Officer, terminal: reported | under_review -> rejected. */
export const rejectSchema = z.object({
  id: reportIdSchema,
  note: z
    .string()
    .trim()
    .min(5, "Say why this is being rejected")
    .max(500, "Note must be 500 characters or fewer"),
});

/** Crew step 3: dispatched -> cleared. */
export const resolveSchema = z.object({
  id: reportIdSchema,
  actionTaken: z.enum(ACTIONS_TAKEN, { message: "Record what was done" }),
  resolutionNotes: optionalText(1000, "Resolution notes"),
});

/** For the /reports filter bar. All optional; bad values are ignored, not errors. */
export const reportFilterSchema = z.object({
  area: z.uuid().optional().catch(undefined),
  status: z.enum(REPORT_STATUSES).optional().catch(undefined),
  siteType: z.enum(SITE_TYPES).optional().catch(undefined),
});

export const reportSelectSchema = createSelectSchema(reports);
export type ReportFormValues = z.infer<typeof reportFormSchema>;
```

**Display labels** go in `src/lib/labels.ts` — also written by the schema owner
at 0:30 and frozen. `Record<SiteType, string>` and friends, so `"stagnant_water"`
renders as `"Stagnant water"` everywhere with no duplicated switch statements:

```ts
export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  stagnant_water: "Stagnant water",
  garbage_pile: "Rubbish pile",
  construction_site: "Construction site",
  blocked_drain: "Blocked drain",
  other: "Other",
};
// …and STATUS_LABEL, RISK_LABEL, TEAM_TYPE_LABEL, ACTION_LABEL, ROLE_LABEL
```

---

## 5b. Authentication — register and login

Added after the first draft. The app now has **real accounts**: a citizen can
register, anyone can log in, and `getCurrentUser()` reads a session rather than
a user-chosen cookie. What we are explicitly **not** building is route-level
role gating — no middleware, no per-page guards, no email verification, no
password reset. Those are hours we do not have and marks we do not get.

The per-action role checks already specified in §7 step 2 **stay**. They are two
lines each and they are what makes the lifecycle correct, not a security layer:
without them a crew member can dispatch to themselves and the state machine
stops meaning anything.

### Schema delta — A applies this before freezing `schema.ts`

```ts
// on `users`, alongside the existing columns:
  /** scrypt, "scrypt:<saltHex>:<hashHex>". NULL = seeded account, cannot log in. */
  passwordHash: text("password_hash"),

// and one new table:
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Opaque 32-byte random token, base64url. This is what the cookie holds. */
    token: text("token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("sessions_token_idx").on(table.token)],
);
```

Delete order in `seed.ts` becomes: `reportEvents` → `reports` → `sessions` →
`users` → `teams` → `areas`.

### Two decisions, and why

**Hash with `scrypt` from `node:crypto`.** Not bcrypt or argon2: those are
native modules and need install scripts, which **npm 12 blocks in this repo**
(see `allowScripts` in `package.json`) — you would lose 20 minutes to a build
that fails only on Vercel. `scrypt` is in the standard library, needs no
dependency, and is a genuinely appropriate password hash. Compare with
`timingSafeEqual`.

**Session = an opaque token in a `sessions` table, not a signed cookie.** A
signed cookie would need a `SESSION_SECRET` in `.env.local` on four laptops —
and per `GUIDELINES.md` §1 the other three **cannot run `env:pull`**. A row in a
table needs no shared secret, works identically on every machine and on Vercel
with zero setup, and makes logout an actual `DELETE` rather than a hope.

### Cookie

`dw_session`, `httpOnly: true`, `sameSite: "lax"`, `path: "/"`,
`secure: process.env.NODE_ENV === "production"`, 7-day `maxAge`. Cookies can
only be written from a Server Action or a Route Handler, so `login`, `register`
and `logout` are all Server Actions — which they were going to be anyway.

### Files — all new, all A's, no conflict with B/C/D

```
src/lib/auth.ts                   hashPassword / verifyPassword / createSession
src/lib/validations/auth.ts       registerSchema, loginSchema
src/lib/actions/auth.ts           register, login, logout
src/lib/current-user.ts           now reads the session cookie
src/app/login/page.tsx
src/app/register/page.tsx
src/components/auth/login-form.tsx
src/components/auth/register-form.tsx
```

**`getCurrentUser()` keeps its exact signature** — `Promise<User | null>`. B, C
and D call it the same way they were already going to, so this change costs them
nothing.

### Rules that keep this to ~45 minutes

- **Login identifier is `phone`**, which is already `.unique()` on `users`. No
  email column, no new index, and it matches the phone-first argument in §4.
- **Register creates a `citizen`, always.** No role dropdown — that would be
  self-serve privilege escalation, and it is a *better* demo line: "staff
  accounts are provisioned by the health authority, not self-registered."
  Officer and crew accounts come from the seed.
- **Logged-out is not an error.** `/`, `/reports` and `/reports/[id]` are public
  and stay public. `/report`, `/staff` and `/team` render an `Empty` state with
  a "Sign in to continue" button when `getCurrentUser()` returns `null`. That is
  one early-return per page, not a guard system.
- Password rule: 8 characters minimum. Nothing else. `"At least 8 characters"`
  is the message; do not build a strength meter.

---

## 6. Photos — how they are saved and served

**Saved:** the browser posts the actual file inside the Server Action's
`FormData`. The action uploads it to **Vercel Blob** and stores the returned URL.
We never proxy or store bytes in Postgres — the `photo_url` column holds a string.

**Served:** Blob files with `access: "public"` sit on
`<store-id>.public.blob.vercel-storage.com` and are delivered by Vercel's CDN.
Public is the right choice here: `/reports` is a public page, so anyone with the
link should be able to see the photo. There is no signed-URL step.

```ts
// src/lib/actions/reports.ts
import { put } from "@vercel/blob";

const parsed = parseForm(reportFormSchema, formData);
if (!parsed.ok) return parsed.state;

const { photo, ...values } = parsed.data;

let photoUrl: string | null = null;
let photoPathname: string | null = null;

if (photo) {
  const blob = await put(`reports/${crypto.randomUUID()}-${photo.name}`, photo, {
    access: "public",
    contentType: photo.type,
  });
  photoUrl = blob.url;
  photoPathname = blob.pathname;
}

await db.insert(reports).values({ ...values, photoUrl, photoPathname });
```

### Blob setup — DONE, before the clock. Nothing to redo.

| | |
|---|---|
| Store | `denguewatch-photos` (`store_r0AS6p6maz3zdRmU`), region `iad1` |
| Access | **public** — connected to the `mini-hackathon` project on all 3 envs |
| Public host | `r0as6p6maz3zdrmu.public.blob.vercel-storage.com` |
| Package | `@vercel/blob@^2.8.0`, already in `package.json` |
| Verified | real `put()` -> public `GET 200 image/png` -> `list()` -> `del()` |

`BLOB_READ_WRITE_TOKEN` is set in Vercel for Production, Preview and
Development, so **the deployed app needs no further setup**.

**Getting the token locally.** Per `GUIDELINES.md` §1 only the owner can run
`npm run env:pull` (Hobby plan, one seat). Two traps, both already hit once:

1. **`env:pull` overwrites the whole `.env.local`**, replacing the local Docker
   `DATABASE_URL` with Neon's. That silently points your dev loop at the
   production database. After pulling, restore the Docker URL from
   `.env.example` and keep only `BLOB_READ_WRITE_TOKEN` from the pull. The
   owner's `.env.local` is already in that state.
2. **Teammates cannot pull it.** The owner should paste *only* the
   `BLOB_READ_WRITE_TOKEN` line to whoever builds `/report` — never the whole
   file, which also carries Neon credentials and a personal
   `VERCEL_OIDC_TOKEN`. It is a write token to a throwaway demo store; the
   `db:reset`-someone-else's-data risk that motivates the no-sharing rule does
   not apply to it.

Anyone without the token can still build every other slice: `photoUrl` is
nullable, and reports submitted without a photo work end to end.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    // Server Action bodies are capped at 1MB by default; phone photos are 2–5MB.
    // Leave ~20KB of headroom for multipart boundaries and part headers.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};
```

**Three traps worth knowing before you hit them:**

1. **An empty file input submits a 0-byte `File`, not `undefined`.** Without the
   `optionalPhoto` preprocess in §5, every report submitted without a photo fails
   the mime check. Verified in §13.
2. **`bodySizeLimit` is enforced before your action runs.** A 12MB photo throws a
   framework error, not your friendly `ActionState`. That's why `z.file().max()`
   is set at 5MB *and* the input has `accept="image/*"` — catch it client-side so
   the user gets a real message.
3. **`remotePatterns` is required** or `next/image` refuses to render Blob URLs.
   Already in `next.config.ts` — `*` matches one subdomain, which is exactly the
   store hostname above. If it's fighting you at 2:00, swap `<Image>` for a
   plain `<img>` and move on.
4. **`tsx` runs `seed.ts` as CJS**, because `package.json` has no
   `"type": "module"`. Top-level `await` is a build error there — wrap the seed
   in an `async function main()` and call it. Costs 30 seconds if you know;
   costs 10 minutes if you don't.

Uploads happen on the server, inside the action, so `BLOB_READ_WRITE_TOKEN` never
reaches the browser. Do not put it in a `NEXT_PUBLIC_*` variable.

---

## 7. Server actions

Two files, two owners, no overlap. Every action follows the house pattern:
**validate → check the actor → check the transition → write → `revalidatePath` →
return `ActionState`**. None of them throw at the user.

### `src/lib/actions/reports.ts` — owner: A

```ts
createReport(_prev: ActionState, formData: FormData): Promise<ActionState>
```

Uploads the photo, then inserts the report **and** its first `report_events` row
(`fromStatus: null`, `toStatus: "reported"`, `actorId: reporterId`) inside
`db.transaction`, so a report can never exist without a timeline.

### `src/lib/actions/triage.ts` — owner: C

```ts
assessReport(_prev, formData)    // officer: reported     -> under_review
dispatchTeam(_prev, formData)    // officer: under_review -> dispatched
rejectReport(_prev, formData)    // officer: reported|under_review -> rejected
resolveReport(_prev, formData)   // crew:    dispatched   -> cleared
```

Each one:

1. `parseForm(schema, formData)`; `if (!parsed.ok) return parsed.state`
2. `const actor = await getCurrentUser()` — from the cookie, not the form.
   Wrong role → `actionError("Only a PHI officer can assess reports")`
3. Load the current row. Missing → `actionError("That report no longer exists")`
4. **Guard the transition** against the map below. Wrong state →
   `actionError("This report has already been cleared")`, a real sentence.
5. `resolveReport` additionally checks `report.assignedTeamId === actor.teamId`
   → `actionError("That job is assigned to another team")`
6. `db.transaction`: update `reports` (+ `updatedAt`, and `dispatchedAt` /
   `resolvedAt` where relevant) and insert the `report_events` row.
7. `revalidatePath` for `/staff`, `/team`, `/reports`, `/dashboard`, `/` --
   **and `revalidatePath("/reports/[id]", "page")` for the detail route.** The
   second argument is required for a dynamic segment; without it the call is a
   silent no-op and the timeline keeps showing the old status after a
   transition. Same applies in `createReport`.
8. `return actionSuccess(undefined, "Team dispatched")`

```ts
const ALLOWED: Record<ReportStatus, ReportStatus[]> = {
  reported: ["under_review", "rejected"],
  under_review: ["dispatched", "rejected"],
  dispatched: ["cleared"],
  cleared: [],
  rejected: [],
};
```

> **Lint trap, for real:** `no-floating-promises` with `checkThenables` is on.
> Every `db.insert(...)` / `db.update(...)` needs `await`, including the ones
> inside `db.transaction(async (tx) => { … })`. A missing `await` there is the
> classic "worked locally, the row never appeared" bug.

---

## 8. The calculation — area risk

Lives in `src/lib/stats/area-risk.ts` as plain functions. Rules, fixed and
explainable:

**Weight per active report** (`status` in `reported`, `under_review`, `dispatched`):

| Assigned risk | Weight |
|---|---|
| `high` | 3 |
| `medium` | 2 |
| `low` | 1 |
| not yet assessed (`NULL`) | 1 |

**Area risk score** = sum of weights of that area's active reports.
Cleared and rejected reports contribute **0** — fixing things visibly lowers the
score, which is the point, and a great line to say out loud in the demo.

**Band:** `score >= 8` → **Danger zone** · `score >= 4` → **Watch** · else **Normal**
**Hotspot flag:** `activeCount >= 3`, shown as a badge

One query does the whole area table. This exact statement was built and its SQL
inspected (§13):

```ts
const rows = await db
  .select({
    areaId: areas.id,
    areaName: areas.name,
    district: areas.district,
    active: sql<number>`count(${reports.id}) filter (
      where ${reports.status} in ('reported','under_review','dispatched'))`.mapWith(Number),
    cleared: sql<number>`count(${reports.id}) filter (
      where ${reports.status} = 'cleared')`.mapWith(Number),
    score: sql<number>`coalesce(sum(
      case when ${reports.status} in ('reported','under_review','dispatched')
        then case ${reports.riskLevel}
               when 'high' then 3 when 'medium' then 2 else 1 end
        else 0 end), 0)`.mapWith(Number),
  })
  .from(areas)
  .leftJoin(reports, eq(reports.areaId, areas.id))
  .groupBy(areas.id, areas.name, areas.district);

const ranked = rows.map(withBand).sort((a, b) => b.score - a.score);
```

`leftJoin` from `areas` keeps areas with zero reports in the list — they show as
"Normal", which looks far more real than a table containing only problems. Sort
in TypeScript, not SQL: one less thing to debug.

**Team workload**, same shape, for the second dashboard card:

```ts
db.select({
    teamName: teams.name,
    type: teams.type,
    openJobs: sql<number>`count(${reports.id}) filter (
      where ${reports.status} = 'dispatched')`.mapWith(Number),
  })
  .from(teams)
  .leftJoin(reports, eq(reports.assignedTeamId, teams.id))
  .groupBy(teams.id, teams.name, teams.type);
```

**If the SQL fights you at 2:00, drop it.** Select all reports plus all areas and
group them in a `Map` in TypeScript. With a few dozen rows it is instant and
impossible to get wrong. Ship the working version.

Plus three counters: total active, cleared in the last 7 days, and average hours
from `createdAt` to `resolvedAt`.

---

## 9. Who builds what

**`GUIDELINES.md` §3 applies literally: one folder per person, no overlaps.**
Importing someone else's component is fine and expected. *Editing* one is not —
ask them.

### A — Foundation + citizen reporting

```
src/db/schema.ts                ← writes FIRST, by 0:30, then frozen
src/db/seed.ts
src/lib/validations/reports.ts  ← ALL schemas incl. officer/crew, then frozen
src/lib/labels.ts               ← then frozen
src/lib/current-user.ts         ← then frozen
src/lib/auth.ts                 ← scrypt + sessions, see 5b
src/lib/validations/auth.ts
src/lib/actions/auth.ts         ← register / login / logout
src/app/login/page.tsx
src/app/register/page.tsx
src/components/auth/            ← login-form, register-form
src/lib/actions/reports.ts      ← createReport + Blob upload
src/app/report/page.tsx
src/components/report/report-form.tsx
next.config.ts                  ← blob remotePatterns + bodySizeLimit
```

A blocks everyone, so A ships **schema + validations + labels + current-user +
`auth.ts` to `main` before touching any form.** Auth is roughly 45 minutes on top
of A's original slice, which is why `createReport` moved later in §11 — it is the
one piece of A's work that nobody else is waiting on. The Blob store setup is
already done (§6).

### B — Public browsing

```
src/app/reports/page.tsx
src/app/reports/[id]/page.tsx
src/components/reports/report-card.tsx
src/components/reports/report-filters.tsx
src/components/reports/report-timeline.tsx
src/components/reports/status-badge.tsx   ← C and D import this
src/components/reports/risk-badge.tsx     ← C and D import this
```

B owns the badges because B needs them first. C and D import, never edit.

### C — The workflow (officer + crew)

```
src/app/staff/page.tsx
src/app/team/page.tsx
src/components/staff/triage-queue.tsx
src/components/staff/assess-dialog.tsx
src/components/staff/dispatch-dialog.tsx
src/components/staff/reject-dialog.tsx
src/components/staff/resolve-dialog.tsx   ← reused by /team
src/lib/actions/triage.ts
```

C owns the whole state machine — both routes and all four actions — so nobody
has to coordinate on transition rules. `/team` is a filtered list plus C's own
resolve dialog, which is why it's cheap to add here and expensive anywhere else.

### D — Dashboard, landing, polish

```
src/app/dashboard/page.tsx
src/components/dashboard/area-risk-table.tsx
src/components/dashboard/team-workload.tsx
src/components/dashboard/stat-cards.tsx
src/lib/stats/area-risk.ts
src/app/page.tsx      ← landing
src/app/layout.tsx    ← metadata + header (imports A's user switcher)
```

D also owns the last-hour pass: empty states, loading skeletons, the page title,
and making sure nothing says "Create Next App".

**Shared but frozen after 0:30:** `src/db/schema.ts`,
`src/lib/validations/reports.ts`, `src/lib/labels.ts`, `src/lib/current-user.ts`,
`src/lib/auth.ts`.
Need a column? Ask A. Don't add it yourself.

### shadcn components to add up front

Already present: `button card input textarea select badge dialog table tabs
checkbox field empty skeleton separator sonner alert-dialog dropdown-menu`.
Likely additions — **one person adds these at 0:15 and commits, so four people
don't race the CLI:**

```bash
npx shadcn@latest add avatar progress tooltip sheet
```

---

## 10. Decisions already made (so nobody relitigates them at 2:00)

**Photos are a real upload to Vercel Blob.** Store setup and
`BLOB_READ_WRITE_TOKEN` happen **before the clock starts** — the same rule as the
SSO issue in `GUIDELINES.md` §7.2: a 10-minute problem beforehand, a 60-minute
problem at 3:45. Photos are how an officer judges a site, so a pasted-link
fallback would have been visibly weaker, and a Drive link that doesn't hot-link
would break on camera during the demo.

**There is a `users` table, and real register/login.** Superseded — the
original plan was a "Signed in as" picker writing a cookie, and that is gone.
See **§5b** for the spec: scrypt password hashes, a `sessions` table, an
httpOnly cookie, and `getCurrentUser()` reading the session. Roles are still
real data, and attribution on every `report_events` row is still the point.

What we deliberately did **not** build is route-level role gating. Say so on
camera: *"accounts and sessions are real; what a production PHI console would
add on top is route-level authorisation and audited staff provisioning."* A
Server Action is a public POST endpoint (the bundled Next docs say so
explicitly), so the role checks that matter live **in the actions** — §7 step 2.
Judges respect a named limitation far more than a half-built login screen.

**`teams` is a separate table from `users`.** You dispatch a *crew*, not a
person. Crew users carry `team_id`; the report carries `assigned_team_id`. This
is what makes "which team is overloaded" answerable, and it kills the
free-text-name problem where "Fogging Unit A" and "Fogging unit A" are two
different things in your data.

**`rejected` is in the lifecycle** even though the original sketch had four
statuses. One extra enum value and one guard buys a genuine judgment call —
officers can decline a duplicate or false alarm — which is exactly what the
practicality mark rewards. If it costs anyone more than 10 minutes, delete the
value and the action; nothing else depends on it.

**`areas` is a real table, not a text column.** One seed array buys trustworthy
dashboard grouping, a dropdown that can't be typo'd, and zero-report areas
showing up. If A is behind at 0:30, the fallback is a plain `area text` column —
but decide that *before* writing the schema, not after B has built against it.

**Text columns with a TypeScript enum, not `pgEnum`** — and this has a real
cost you should know about. Generating the DDL (§13) confirmed that
`text("status", { enum: [...] })` produces a plain `"status" text NOT NULL`
column with **no CHECK constraint**. The allowed-values list is enforced by
TypeScript and Zod only; Postgres will happily accept `'banana'` from a raw
`INSERT`. We accept that: every write goes through a Zod-validated Server Action,
and in exchange `db:push` never has to `ALTER TYPE` when someone wants a new site
type at 1:30. If you want the database to enforce it too, add `check()`
constraints (also available in `drizzle-orm/pg-core`) — but that is polish, not
a prerequisite.

**No new `route.ts` files.** Server Components read, Server Actions write.

---

## 11. Build order

Slotted into the timeline in `GUIDELINES.md` §8.

| Time | A | B | C | D |
|---|---|---|---|---|
| **before 0:00** | Blob store created, `BLOB_READ_WRITE_TOKEN` pulled | | | |
| 0:00–0:15 | Agree this doc. A is schema owner. One person runs the `shadcn add` batch. | | | |
| 0:15–0:40 | `schema.ts` (incl. `sessions`, §5b) + `db:push` + validations + labels + `current-user` + `auth.ts` → **push to main** | scaffold `/reports` with hardcoded rows | scaffold `/staff` + `/team` shells | scaffold `/dashboard` + landing |
| 0:40–1:20 | `register` / `login` / `logout` + the two forms | list + filters on real data | `assessReport` + assess dialog | `area-risk.ts` + the queries |
| 1:20–1:40 | **seed.ts with real data** (hashed demo passwords) → push | detail page + timeline | dispatch + reject | risk table + team workload |
| 1:40–2:30 | `createReport` + Blob upload + `/report` form, then help wherever it's stuck | polish cards, empty states | resolve + `/team` | stat cards, landing counters, header sign-in/out, metadata |
| **2:30** | **FEATURE FREEZE.** A runs `env:pull` → `db:push` → `db:seed` against Neon, then switches back to local. Everyone tests the deployed URL. | | | |
| 2:30–3:30 | Bug fixes only. Empty states, loading states, error toasts. Dry-run the demo. | | | |
| 3:30–4:00 | Record. | | | |

Merge to `main` every 45 minutes. `npm run verify` before every push.

---

## 12. Seed data

`src/db/seed.ts` — this is demo credibility, not an afterthought. Budget 20
minutes and write it early; every screen looks broken until it exists.

- **8 areas**, real places: Narahenpita, Dehiwala, Maharagama, Kaduwela,
  Moratuwa (Colombo district); Negombo, Gampaha (Gampaha); Kandy (Kandy).
- **3 teams:** Fogging Unit A (Narahenpita), Cleaning Crew 2 (Dehiwala),
  Inspection Team North (Gampaha).
- **~12 users:** 6 citizens, 3 officers (one per district), 3 crew — each crew
  user carrying the `team_id` of their team. **Every seeded user gets the same
  demo password**, hashed with `hashPassword()` from `src/lib/auth.ts`, and the
  phone numbers are the login identifiers. Put the password and the officer /
  crew phone numbers in the README — you will need them on camera, and hunting
  for them mid-take is how a good demo dies.
- **~24 reports** spread deliberately, not randomly:
  - Narahenpita: **5 active**, two of them `high` → guaranteed "Danger zone"
  - Dehiwala: **3 active** → "Watch" + hotspot badge
  - Kandy: **1 cleared, 0 active** → proves clearing lowers the score
  - Gampaha: **0** → proves the empty row renders
- Mixed `createdAt` values across the last 10 days so the list has a sense of
  time. Set them explicitly; don't rely on `defaultNow()`.
- Real text: *"Water collected in discarded tyres behind the vehicle repair shop
  on Elvitigala Mawatha. Larvae visible."* — **no `asdf` rows.**
- Photos: upload 4–5 real images to the Blob store once and paste those URLs into
  the seed. Seeded rows don't need to go through the upload path.
- **Every seeded report gets its `report_events` rows too**, matching its status
  and with a plausible actor. A `dispatched` report with an empty timeline looks
  broken in the demo.

Delete children before parents: `reportEvents` → `reports` → `users` → `teams` →
`areas`.

---

## 13. What was verified, and how

Run before this document was finalised, against `drizzle-orm@0.45.2`,
`drizzle-zod@0.8.3`, `zod@4.5.4`, `next@16.3.4`. Docker was not running, so no
live database was touched — and nothing was pushed to Neon.

| Check | Method | Result |
|---|---|---|
| Schema compiles | `tsc --noEmit` with the §4 schema in `src/db/` | Passed, exit 0 |
| Schema produces valid DDL | `drizzle-kit generate` into a scratch dir | 5 tables, 8 FKs, 7 indexes, correct `ON DELETE` behaviour |
| `.pick()` blocks privilege escalation | Parsed a payload with `status: "cleared"`, `riskLevel: "high"`, `assignedTeamId`, `resolvedAt` injected | All four silently stripped; only the citizen fields survived. *Re-check after the §5b change: `reporterId` is no longer picked either, so the surviving set is 4 fields, and `createReport` supplies `reporterId` from the session.* |
| Enum messages are user-facing | Parsed `siteType: "nonsense"` | `"Choose what kind of site this is"`, not Zod's default |
| Area risk query builds | `.toSQL()` on the §8 statement | Valid `count(...) filter (where ...)` + `left join` + `group by` |
| Team workload query builds | `.toSQL()` | Valid |
| Report list with 3 joins builds | `.toSQL()` | Valid |
| `z.file()` exists and works | `.max()` + `.mime()` against sample `File`s | Both enforce correctly |
| Empty file input behaviour | Parsed a 0-byte `File` | **Fails** the mime check — this is why `optionalPhoto` preprocesses to null (§5) |
| `serverActions.bodySizeLimit` | Read `node_modules/next/dist/docs/` | Confirmed 1MB default, `experimental.serverActions.bodySizeLimit` is the right key |

**One claim this disproved.** An earlier draft of this document said text columns
with an enum still give "a DB-level check". They do not — the generated DDL is a
bare `text` column with no constraint. §10 now states the real trade-off.

All scratch files were deleted; the repo is unchanged apart from this document.

**Added later, and verified live** (not part of the run above):

| Check | Method | Result |
|---|---|---|
| Blob store exists and is public | `vercel blob get-store` | `denguewatch-photos`, `iad1`, Access: Public, linked to the project |
| Upload path works end to end | `put()` → `fetch(blob.url)` → `list()` → `del()` via `tsx` | `200 image/png` from the CDN; store left empty |
| `bodySizeLimit` key is current | `node_modules/next/dist/docs/…/serverActions.md` | `experimental.serverActions.bodySizeLimit`, 1MB default — unchanged in 16.3.4 |
| `remotePatterns` wildcard | `node_modules/next/dist/docs/…/image.md` | `*` = one subdomain, `**` = many at the start. `*` is correct for the store host |
| Nothing regressed | `npm run verify` | typecheck + lint + build all pass |

Sections 5b (authentication) and the §7 `revalidatePath` correction are **specs,
not verified code** — they have not been run.

---

## 14. Demo script (2 minutes)

Maps onto `GUIDELINES.md` §9. Record the deployed URL, signed in to Vercel (§7.2
there — the SSO limitation is settled; the video is the deliverable).

- **0:00–0:15** — "Dengue kills people in Sri Lanka every year, and the people
  who spot breeding sites first aren't the people who can clear them.
  DengueWatch connects those two."
- **0:15–0:45** — *Create.* **Register a citizen account live** — it is eight
  seconds and it proves the accounts are real. Then report a blocked drain in
  Narahenpita, **upload a photo from the device**, submit. Show it appear in the
  public list with its thumbnail.
- **0:45–1:25** — *Update, across two roles.* Log in as an officer: open the
  report, assign **high** risk, dispatch **Fogging Unit A**. Log in as that crew:
  the job is waiting in `/team`; clear it with "fogged". Open the detail page and
  show the **timeline** — the whole decision trail, with names, in one view.
- **1:25–1:45** — *Calculate.* Dashboard: Narahenpita is a **Danger zone** with 5
  active reports; Fogging Unit A has the most open jobs. Point out that clearing
  reports lowers the score, so the dashboard tracks the state of the ground
  rather than a pile of complaints.
- **1:45–2:00** — Stack in one line, live URL on screen.

Two things to say out loud, because they show judgment rather than gaps:
staff accounts are provisioned rather than self-registered and route-level
authorisation is the next thing a real PHI console would add, and the risk score
is a deliberately simple, explainable formula rather than a black box.
