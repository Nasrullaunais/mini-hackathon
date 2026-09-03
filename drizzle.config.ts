import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local on its own; Next.js does.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // fall through to the error below
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Run `npm run env:pull` (Neon) or copy .env.example to .env.local (local Docker).",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
  verbose: true,
  strict: false,
});
