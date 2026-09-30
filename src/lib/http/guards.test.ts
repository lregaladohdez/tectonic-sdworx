import { describe, expect, it } from "vitest";
import { AccessError } from "@/lib/auth/access";
import { assertSameOrigin, clientIp, MAX_BODY_BYTES, readJson } from "./guards";

const req = (headers: Record<string, string>, body?: string) =>
  new Request("http://relay.test/api/x", { method: "POST", headers, body });

describe("assertSameOrigin", () => {
  it("accepts a matching Origin and rejects everything else with 401", () => {
    expect(() => assertSameOrigin(req({ host: "relay.test", origin: "https://relay.test" }))).not.toThrow();
    const bad: Record<string, string>[] = [
      { host: "relay.test" },
      { host: "relay.test", origin: "https://evil.test" },
      { host: "relay.test", origin: "null" },
      { host: "relay.test", origin: "not a url" },
      { host: "relay.test", referer: "https://evil.test/relay.test" },
    ];
    for (const headers of bad) {
      expect(() => assertSameOrigin(req(headers))).toThrow(AccessError);
    }
  });
});

describe("clientIp", () => {
  it("uses the address appended by the trusted proxy, not the one the client sent", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(req({}))).toBe("local");
  });
});

describe("readJson", () => {
  it("parses small JSON and refuses oversized or malformed bodies", async () => {
    expect(await readJson(req({ "content-type": "application/json" }, '{"a":1}'))).toEqual({ a: 1 });
    expect(await readJson(req({}, "{not json"))).toBeNull();
    expect(await readJson(req({ "content-length": String(MAX_BODY_BYTES + 1) }, "{}"))).toBeNull();
    expect(await readJson(req({}, JSON.stringify({ a: "x".repeat(MAX_BODY_BYTES) })))).toBeNull();
  });
});
