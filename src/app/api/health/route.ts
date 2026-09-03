import { sql } from "drizzle-orm";
import { db } from "@/db";

// GET /api/health -- proves the deployment can reach the database.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: "up" });
  } catch (err) {
    return Response.json(
      { ok: false, db: "down", error: (err as Error).message },
      { status: 500 },
    );
  }
}
