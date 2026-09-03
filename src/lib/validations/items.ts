import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { items } from "@/db/schema";

/**
 * Schemas are DERIVED from the Drizzle table, so a column change is a type error
 * here rather than a runtime surprise. Only override what needs a friendlier
 * message or a tighter bound.
 *
 * Copy this file per entity: src/lib/validations/<entity>.ts
 */

/**
 * Optional free text. Normalises the two ways "nothing" arrives -- a form sends
 * "" and a JSON client omits the key -- to NULL, so the column stays clean.
 */
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

export const itemSelectSchema = createSelectSchema(items);

export const itemFormSchema = createInsertSchema(items, {
  title: (schema) =>
    schema
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be 200 characters or fewer"),
})
  .pick({ title: true })
  .extend({
    description: optionalText(2000, "Description"),
  });

export const itemIdSchema = z.uuid("Not a valid item id");

export const toggleItemSchema = z.object({
  id: itemIdSchema,
  done: z.boolean(),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;
