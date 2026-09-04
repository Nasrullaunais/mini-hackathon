"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/current-user";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import {
  actionError,
  actionSuccess,
  parseForm,
  type ActionState,
} from "@/lib/form";

/** Re-shown on error so a rejected submit doesn't force retyping the whole form. */
export type RegisterSubmitted = { name?: string; phone?: string };

export async function register(
  _prev: ActionState<RegisterSubmitted>,
  formData: FormData,
): Promise<ActionState<RegisterSubmitted>> {
  const rawName = formData.get("name");
  const rawPhone = formData.get("phone");
  const submitted: RegisterSubmitted = {
    name: typeof rawName === "string" ? rawName : undefined,
    phone: typeof rawPhone === "string" ? rawPhone : undefined,
  };

  const parsed = parseForm(registerSchema, formData);
  if (!parsed.ok) return { ...parsed.state, data: submitted };

  const { name, phone, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  if (existing.length > 0) {
    return actionError(
      "That phone number is already registered",
      { phone: ["That phone number is already registered"] },
      submitted,
    );
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ name, phone, passwordHash, role: "citizen" })
    .returning({ id: users.id });

  await createSession(user.id);

  revalidatePath("/", "layout");
  return actionSuccess<RegisterSubmitted>(undefined, "Account created");
}

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { phone, password } = parsed.data;

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  const user = rows.at(0);

  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!ok || !user) {
    return actionError("Phone or password is incorrect");
  }

  await createSession(user.id);

  revalidatePath("/", "layout");
  return actionSuccess(undefined, "Signed in");
}

export async function logout(): Promise<ActionState> {
  await destroySession();
  revalidatePath("/", "layout");
  return actionSuccess(undefined, "Signed out");
}
