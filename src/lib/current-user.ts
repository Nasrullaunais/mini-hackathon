import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  newSessionToken,
} from "@/lib/auth";

/**
 * FROZEN after 0:30 (DESIGN.md §5b). The session lifecycle: read it, start it,
 * end it. Everyone else only ever calls getCurrentUser().
 *
 * A session is a row in `sessions`, not a signed cookie -- no SESSION_SECRET to
 * copy onto four laptops, and logout is a real DELETE.
 */

/**
 * The signed-in user, or null. Logged-out is NOT an error: `/`, `/reports` and
 * `/reports/[id]` are public. Pages that need a user early-return an Empty state.
 *
 * Wrapped in React's cache() so several components on one page share a single
 * query instead of each running their own.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows.at(0)?.user ?? null;
});

/**
 * Issues a session and sets the cookie. Cookies can only be written from a
 * Server Action or a Route Handler, so this is only ever called from
 * src/lib/actions/auth.ts.
 */
export async function createSession(userId: string): Promise<void> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.insert(sessions).values({ token, userId, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Logout: the row goes, then the cookie. Safe to call when already logged out. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  cookieStore.delete(SESSION_COOKIE);
}
