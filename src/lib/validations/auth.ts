import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "@/db/schema";

/**
 * Register and login (DESIGN.md §5b). The login identifier is `phone`, which is
 * already .unique() on `users` -- no email column, no new index.
 *
 * `phone` is nullable on the table (a seeded row may have none) but required on
 * both forms, so it is overridden with a plain required string rather than
 * derived. Everything else comes from the table.
 */

const phoneSchema = z
  .string()
  .trim()
  .min(9, "Enter a valid phone number")
  .max(20, "Enter a valid phone number");

/**
 * Register always creates a citizen -- there is no role field here, and Zod
 * strips one if someone posts it. Staff accounts are provisioned in the seed.
 */
export const registerSchema = createInsertSchema(users, {
  name: (schema) =>
    schema
      .trim()
      .min(2, "Enter your name")
      .max(80, "Name must be 80 characters or fewer"),
  phone: phoneSchema,
})
  .pick({ name: true, phone: true })
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Re-enter your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password"),
});

export type RegisterValues = z.infer<typeof registerSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
