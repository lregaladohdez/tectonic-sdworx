import { describe, expect, it } from "vitest";
import { createSessionToken, SESSION_TTL_SECONDS, verifySessionToken } from "./session";

const secret = "0123456789abcdef0123456789abcdef";

describe("session token", () => {
  it("round-trips a user id", () => {
    const token = createSessionToken("u-1", secret, 1_000_000_000_000);
    expect(verifySessionToken(token, secret, 1_000_000_000_000)?.sub).toBe("u-1");
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken("u-1", secret);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "u-admin", exp: 9e12 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`, secret)).toBeNull();
    expect(verifySessionToken(`${body}.${sig}x`, secret)).toBeNull();
  });

  it("rejects the wrong secret, expiry, and garbage", () => {
    const now = 1_000_000_000_000;
    const token = createSessionToken("u-1", secret, now);
    expect(verifySessionToken(token, "another-secret-that-is-long", now)).toBeNull();
    expect(verifySessionToken(token, secret, now + (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull();
    expect(verifySessionToken("not.a.token", secret)).toBeNull();
    expect(verifySessionToken(undefined, secret)).toBeNull();
  });

  it("refuses a weak secret", () => {
    expect(() => createSessionToken("u-1", "short")).toThrow();
  });
});
