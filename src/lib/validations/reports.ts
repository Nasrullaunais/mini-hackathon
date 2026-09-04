import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  ACTIONS_TAKEN,
  REPORT_STATUSES,
  RISK_LEVELS,
  SITE_TYPES,
  reports,
} from "@/db/schema";

/**
 * FROZEN after 0:30 (DESIGN.md §5). Everyone imports from here; nobody edits it.
 *
 * Schemas are derived from the Drizzle table with createInsertSchema, so a
 * column change is a type error here rather than a runtime surprise. A
 * `text({ enum: [...] })` column becomes a z.enum automatically -- but its
 * default message is "Invalid option: expected one of ...", which breaks the
 * user-facing-prose rule, so every enum gets a real message.
 */

/** Same helper as validations/items.ts -- "" and undefined both become NULL. */
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
 * be normalised to null BEFORE the mime check runs -- otherwise every photoless
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
 * `reporterId` is deliberately NOT here. The acting user comes from the session
 * via getCurrentUser() on the server -- the same rule the officer and crew
 * schemas below follow. A hidden <input name="reporterId"> would be forgeable
 * AND is one more thing to wire up; `userIdSchema` still exists because
 * createReport validates the session's user id with it before inserting.
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
 * Staff/crew schemas carry no actorName: the acting user comes from the session
 * on the server (see §5b), never from the form. A form field would be trivially
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
