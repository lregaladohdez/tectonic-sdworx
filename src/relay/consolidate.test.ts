import { beforeEach, describe, expect, it } from "vitest";
import { consolidateClaim } from "./consolidate";
import { clearSignals, registerSignal } from "./registry";
import type { SignalResult } from "./types";

const result = (over: Partial<SignalResult>): SignalResult => ({
  signalId: "a",
  claimId: "c1",
  verdict: "confirmed",
  confidence: 1,
  summary: "ok",
  evidence: [],
  ...over,
});

describe("consolidateClaim", () => {
  beforeEach(() => clearSignals());

  it("is unknown at 0.5 with no results", () => {
    const t = consolidateClaim("c1", []);
    expect(t.verdict).toBe("unknown");
    expect(t.score).toBe(0.5);
  });

  it("lets a negative verdict beat a confirmation", () => {
    const t = consolidateClaim("c1", [
      result({ signalId: "a", verdict: "confirmed", confidence: 0.9 }),
      result({ signalId: "b", verdict: "contradicted", confidence: 0.7 }),
    ]);
    expect(t.verdict).toBe("contradicted");
    expect(t.score).toBeLessThan(0.5);
  });

  it("lets a confirmation with evidence beat 'no evidence found'", () => {
    const t = consolidateClaim("c1", [
      result({ signalId: "a", verdict: "unsupported", confidence: 0.6 }),
      result({ signalId: "b", verdict: "confirmed", confidence: 0.7 }),
    ]);
    expect(t.verdict).toBe("confirmed");
  });

  it("ignores results for other claims", () => {
    const t = consolidateClaim("c1", [result({ claimId: "c2", verdict: "contradicted" })]);
    expect(t.verdict).toBe("unknown");
  });

  it("weights by signal weight and confidence", () => {
    registerSignal({ id: "heavy", name: "Heavy", description: "", category: "trust", version: "1", weight: 3, evaluate: async () => [] });
    registerSignal({ id: "light", name: "Light", description: "", category: "trust", version: "1", weight: 0.5, evaluate: async () => [] });
    const t = consolidateClaim("c1", [
      result({ signalId: "heavy", verdict: "confirmed", confidence: 1 }),
      result({ signalId: "light", verdict: "expiring", confidence: 1 }),
    ]);
    expect(t.verdict).toBe("expiring");
    // the averaged score would be ~0.9, but the expiring verdict caps it
    expect(t.score).toBe(0.6);
    expect(t.reasons.at(0)).toMatch(/^Heavy: /);
  });

  it("dedupes identical actions", () => {
    const action = { type: "ask-expert" as const, label: "Ask Els", personId: "p-els" };
    const t = consolidateClaim("c1", [
      result({ signalId: "a", verdict: "unsupported", actions: [action] }),
      result({ signalId: "b", verdict: "unsupported", actions: [{ ...action }] }),
    ]);
    expect(t.actions).toHaveLength(1);
  });
});
