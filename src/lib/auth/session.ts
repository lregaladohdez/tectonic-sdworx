/**
 * Stateless, HMAC-signed session cookie. No provider, no database.
 * Payload: { sub: userId, exp: unix seconds }.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "relay_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionPayload {
  sub: string;
  exp: number;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(userId: string, secret: string, now = Date.now()): string {
  if (secret.length < 16) throw new Error("SESSION_SECRET must be at least 16 characters");
  const payload: SessionPayload = { sub: userId, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

/** Returns the payload for a valid, unexpired token; null otherwise. Never throws. */
export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token || secret.length < 16) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= now) return null;
    return payload;
  } catch {
    return null;
  }
}
