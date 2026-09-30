import "server-only";
import { NextResponse } from "next/server";
import { AccessError } from "@/lib/auth/access";
import { rateLimit } from "@/lib/rate-limit";

/** Blocks cross-site POSTs: the Origin (or Referer) host must match the request host. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) throw new AccessError(401);
  const host = request.headers.get("host");
  if (!host || new URL(origin).host !== host) throw new AccessError(401);
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",").at(0)?.trim() || "local";
}

export function tooManyRequests(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
  );
}

/** Per-key fixed-window limit; returns a 429 response when exceeded, else null. */
export function limited(key: string, limit: number, windowMs: number) {
  const r = rateLimit(key, limit, windowMs);
  return r.ok ? null : tooManyRequests(r.retryAfterMs);
}

/** Maps AccessError and validation errors to responses; rethrows the rest. */
export function errorResponse(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
