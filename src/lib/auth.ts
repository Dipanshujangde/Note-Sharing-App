import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");

export interface Session { userId: string; email: string }

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { userId: payload.sub, email: payload.email as string };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: Request): Promise<Session | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith("session="))?.slice("session=".length);
  if (!token) return null;
  return verifySessionToken(decodeURIComponent(token));
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get("session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE = "session";
