import "server-only";
import { NextResponse } from "next/server";
import { AccessError } from "@/lib/auth/access";
import { rateLimit } from "@/lib/rate-limit";

/** Blocks cross-site POSTs: the Origin (or Referer) host must match the request host. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) throw new AccessError(401);
  const host = request.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // "null" or a malformed Origin is not ours.
    throw new AccessError(401);
  }
  if (!host || originHost !== host) throw new AccessError(401);
}

/**
 * The caller's address for rate limiting. Cloud Run's front end appends the real
 * client IP as the LAST entry of X-Forwarded-For, so that is the trusted one; the
 * first entry is whatever the client sent and must not be used.
 */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
}

/** Largest JSON body any route accepts. Every real request here is well under 4 KB. */
export const MAX_BODY_BYTES = 16 * 1024;

/**
 * Reads a JSON body of at most `maxBytes`. Returns null for anything that is not a
 * small, well-formed JSON document, so a route can answer 400 without parsing
 * arbitrarily large input. Declared length is checked first; the body is still
 * measured after reading in case the header lies or is absent.
 */
export async function readJson(request: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
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

/**
 * Maps AccessError to its status; everything else becomes a generic 500. The real
 * error is logged on the server only (message, not the request), so provider
 * failures and internal paths never reach the client.
 */
export function errorResponse(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api]", error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
