import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { items } from "@/db/schema";
import { itemFormSchema } from "@/lib/validations/items";

/**
 * REST example. Only needed when something OUTSIDE this app calls us --
 * a webhook, a mobile client, a cron. For page forms use Server Actions
 * instead (src/lib/actions/items.ts).
 */

export async function GET() {
  const rows = await db.select().from(items).orderBy(desc(items.createdAt));
  return Response.json(rows);
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = itemFormSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }

  const [created] = await db.insert(items).values(parsed.data).returning();
  return Response.json(created, { status: 201 });
}
