import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  hashPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { handleApiError, validationError, readJson } from "@/lib/api-utils";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * A dummy hash to compare against when the email does not exist.
 *
 * Without it, a missing account returns in ~1ms while a wrong password takes
 * ~150ms of bcrypt work — a timing oracle that lets an attacker enumerate valid
 * admin emails. Hashing a throwaway value equalises the two paths.
 */
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash() {
  dummyHashPromise ??= hashPassword("timing-equalisation-placeholder");
  return dummyHashPromise;
}

export async function POST(request: NextRequest) {
  // 10 attempts per 5 minutes per IP. Brute-forcing a bcrypt(12) hash through
  // this is not viable.
  const limit = rateLimit(`login:${clientIp(request.headers)}`, 10, 300_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const body = await readJson(request);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { email, password } = parsed.data;

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });

    const hash = admin?.passwordHash ?? (await getDummyHash());
    const valid = await verifyPassword(password, hash);

    if (!admin || !valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      adminId: admin.id,
      email: admin.email,
    });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
