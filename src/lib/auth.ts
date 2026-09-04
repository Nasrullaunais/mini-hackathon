import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * FROZEN after 0:30 (DESIGN.md §5b). Password hashing and session-token
 * generation, and nothing else.
 *
 * Why scrypt from node:crypto and not bcrypt/argon2: those are native modules
 * that need install scripts, which npm 12 blocks in this repo (`allowScripts`
 * in package.json). scrypt is in the standard library and is a genuinely
 * appropriate password hash.
 *
 * This file deliberately imports NOTHING from "@/db" or "next/*". `src/db/seed.ts`
 * runs under tsx, where importing "@/db" throws (it is guarded with server-only),
 * and the seed needs hashPassword() for the demo accounts. The session functions
 * that do touch the database and the cookie live in "@/lib/current-user".
 */

/** The session cookie name. httpOnly; holds an opaque token, never a user id. */
export const SESSION_COOKIE = "dw_session";

/** 7 days, in seconds. Used for both the cookie maxAge and the DB expiry. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Promise wrapper around the callback-style scrypt. */
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/** Returns "scrypt:<saltHex>:<hashHex>" -- store this in users.passwordHash. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await derive(password, salt);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Constant-time compare against a stored hash. A null hash (a seeded account
 * with no password) is a plain false, not an error -- the caller shows the same
 * "Phone or password is incorrect" either way.
 */
export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (stored === null) return false;

  const parts = stored.split(":");
  if (parts.length !== 3) return false;

  const [scheme, saltHex, hashHex] = parts;
  if (scheme !== "scrypt") return false;

  const expected = Buffer.from(hashHex, "hex");
  // timingSafeEqual throws on a length mismatch, so check it first.
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}

/** 32 random bytes, base64url. This is the value the cookie carries. */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
