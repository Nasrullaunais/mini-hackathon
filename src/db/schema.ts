import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

/**
 * EXAMPLE TABLE — delete or rename once the hackathon topic is chosen.
 * Copy this shape for new tables: uuid pk, createdAt/updatedAt, then your columns.
 */
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
