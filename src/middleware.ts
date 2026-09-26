import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");
const PROTECTED = ["/notes"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("session", "", { maxAge: 0, path: "/" });
    return res;
  }
}

export const config = { matcher: ["/notes/:path*"] };
