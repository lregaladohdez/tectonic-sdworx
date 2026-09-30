import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { assertSameOrigin, errorResponse } from "@/lib/http/guards";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    // Invalidate the token server-side as well as clearing the cookie.
    const secret = env().SESSION_SECRET;
    if (secret) revokeSessionToken((await cookies()).get(SESSION_COOKIE)?.value, secret);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
