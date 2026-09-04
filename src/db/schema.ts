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
 * DengueWatch. See DESIGN.md §4 for the diagram and §5b for auth.
 *
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
 * People, and the role each one acts in. Login is by `phone` -- see §5b.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    role: text("role", { enum: USER_ROLES }).notNull().default("citizen"),
    /** Phone-first country: this is the natural contact key, and the login id. */
    phone: text("phone").unique(),
    /** scrypt, "scrypt:<saltHex>:<hashHex>". NULL = account cannot log in. */
    passwordHash: text("password_hash"),
    /** Home area for a citizen, assigned area for an officer. Optional. */
    areaId: uuid("area_id").references(() => areas.id, { onDelete: "set null" }),
    /** Only set for role = "crew". Which crew this person goes out with. */
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("users_role_idx").on(table.role)],
);

/* --------------------------------------------------------------- sessions */

/**
 * Server-side sessions. The cookie holds only an opaque token, so logout is a
 * real DELETE and no laptop needs a shared signing secret -- see §5b.
 */
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

/* ------------------------------------------------------------------ items */

/**
 * EXAMPLE TABLE -- the reference CRUD at /items. Kept deliberately (§4): it
 * costs nothing and it is the escape hatch that proves the database itself is
 * fine when a DengueWatch page misbehaves.
 */
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  done: boolean("done").notNull().default(false),
  ...timestamps,
});

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
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
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
export type Session = typeof sessions.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type ReportEvent = typeof reportEvents.$inferSelect;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type UserRole = (typeof USER_ROLES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type SiteType = (typeof SITE_TYPES)[number];
export type TeamType = (typeof TEAM_TYPES)[number];
export type ActionTaken = (typeof ACTIONS_TAKEN)[number];
