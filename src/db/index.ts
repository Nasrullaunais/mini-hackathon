import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Run `npm run db:up` (local Docker) or `npm run env:pull` (Neon).",
    );
  }

  // Reuse the client across hot reloads in dev so we don't exhaust connections.
  const globalForDb = globalThis as unknown as {
    client?: ReturnType<typeof postgres>;
  };

  const client =
    globalForDb.client ??
    postgres(connectionString, {
      // Required for pooled/pgbouncer connections such as Neon's pooler.
      prepare: false,
      max: 5,
    });

  if (process.env.NODE_ENV !== "production") globalForDb.client = client;

  return drizzle(client, { schema });
}

let instance: Db | undefined;

/**
 * Connects on first use, not on import. This keeps `next build` working when
 * DATABASE_URL is absent -- a missing env var surfaces as a failed request
 * (see /api/health) instead of a failed build.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    instance ??= createDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
