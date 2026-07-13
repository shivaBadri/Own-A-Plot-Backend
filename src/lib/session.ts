import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "admin_session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me"
);

export interface SessionPayload {
  adminId: string;
  email: string;
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
