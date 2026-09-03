import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { items } from "@/db/schema";

/**
 * REST example. Only needed if something outside the app calls us
 * (a fetch from a client lib, a webhook, a mobile client).
 * For normal page forms prefer Server Actions -- see src/lib/actions/items.ts.
 */

export async function GET() {
  const rows = await db.select().from(items).orderBy(desc(items.createdAt));
  return Response.json(rows);
}

const CreateItem = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullish(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = CreateItem.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const [created] = await db.insert(items).values(parsed.data).returning();
  return Response.json(created, { status: 201 });
}
