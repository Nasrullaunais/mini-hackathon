"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { items } from "@/db/schema";

/**
 * REFERENCE CRUD — copy this file's shape for your own entity.
 * Pattern: validate with zod -> hit the db -> revalidatePath -> return a plain object.
 * Never throw raw errors at the form; return { error } so the UI can show it.
 */

export type ActionState = { error?: string; success?: boolean };

const ItemInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ItemInput.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db.insert(items).values({
    title: parsed.data.title,
    description: parsed.data.description || null,
  });

  revalidatePath("/items");
  return { success: true };
}

export async function updateItem(
  id: string,
  data: { title: string; description?: string | null },
): Promise<ActionState> {
  const parsed = ItemInput.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(items)
    .set({
      title: parsed.data.title,
      description: parsed.data.description || null,
      updatedAt: new Date(),
    })
    .where(eq(items.id, id));

  revalidatePath("/items");
  return { success: true };
}

export async function toggleItem(id: string, done: boolean): Promise<ActionState> {
  await db
    .update(items)
    .set({ done, updatedAt: new Date() })
    .where(eq(items.id, id));

  revalidatePath("/items");
  return { success: true };
}

export async function deleteItem(id: string): Promise<ActionState> {
  await db.delete(items).where(eq(items.id, id));
  revalidatePath("/items");
  return { success: true };
}
