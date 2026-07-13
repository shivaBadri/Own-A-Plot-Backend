import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";

// Node-only helpers (bcryptjs, next/headers). Never import this file from
// middleware.ts or any Edge Runtime code — use "@/lib/session" there instead.

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Guard for API routes: returns the session or null. Callers should
 * return a 401 response themselves when this is null. */
export async function requireAdmin() {
  return getSession();
}

// Re-exported so existing `import { createSessionToken, ... } from "@/lib/auth"`
// call sites in route handlers keep working unchanged.
export { SESSION_COOKIE, createSessionToken, verifySessionToken };
export type { SessionPayload };
