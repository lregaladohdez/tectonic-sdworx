import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { assertSameOrigin, clientIp, errorResponse, limited } from "@/lib/http/guards";
import { findUserByEmail } from "@/relay/store";

const body = z.object({
  email: z.string().trim().email().max(200),
  passcode: z.string().min(1).max(200),
});

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const block = limited(`login:${clientIp(request)}`, 5, 60_000);
    if (block) return block;

    const { SESSION_SECRET, RELAY_DEMO_PASSCODE } = env();
    if (!SESSION_SECRET || !RELAY_DEMO_PASSCODE) {
      return NextResponse.json({ error: "Login is not configured on this server" }, { status: 503 });
    }

    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const user = findUserByEmail(parsed.data.email);
    const ok = safeEqual(parsed.data.passcode, RELAY_DEMO_PASSCODE);
    if (!user || !ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, workspaceId: user.workspaceIds.at(0) ?? null });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user.id, SESSION_SECRET), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
