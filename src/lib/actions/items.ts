"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import {
  itemFormSchema,
  itemIdSchema,
  toggleItemSchema,
} from "@/lib/validations/items";
import {
  actionError,
  actionSuccess,
  parseForm,
  type ActionState,
} from "@/lib/form";

/**
 * REFERENCE CRUD -- copy this shape for your own entity.
 *
 * Every action: validate -> write -> revalidatePath -> return an ActionState.
 * Never throw at the UI; return actionError() so the form can render it.
 */

export async function createItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(itemFormSchema, formData);
  if (!parsed.ok) return parsed.state;

  await db.insert(items).values(parsed.data);

  revalidatePath("/items");
  return actionSuccess(undefined, "Item created");
}

export async function updateItem(
  id: string,
  values: unknown,
): Promise<ActionState> {
  const parsedId = itemIdSchema.safeParse(id);
  if (!parsedId.success) return actionError("Not a valid item id");

  const parsed = itemFormSchema.safeParse(values);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0].message);
  }

  await db
    .update(items)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(items.id, parsedId.data));

  revalidatePath("/items");
  return actionSuccess(undefined, "Item updated");
}

export async function toggleItem(
  id: string,
  done: boolean,
): Promise<ActionState> {
  const parsed = toggleItemSchema.safeParse({ id, done });
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  await db
    .update(items)
    .set({ done: parsed.data.done, updatedAt: new Date() })
    .where(eq(items.id, parsed.data.id));

  revalidatePath("/items");
  return actionSuccess();
}

export async function deleteItem(id: string): Promise<ActionState> {
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return actionError("Not a valid item id");

  await db.delete(items).where(eq(items.id, parsed.data));

  revalidatePath("/items");
  return actionSuccess(undefined, "Item deleted");
}
