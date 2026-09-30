import { describe, expect, it } from "vitest";
import { CLAIMS, CLIENTS, DOCUMENTS, PEOPLE } from "../../fixtures/demo-workspace";
import { createContext, createStubLlm } from "../../testing";
import { REGULATION_FEED, type RegulationNotice } from "./feed";
import { anchorMatches, createRegulationWatch, regulationWatch, topicsMatch } from "./index";

const ctx = createContext({ workspaceId: "ws-demo", documents: DOCUMENTS, clients: CLIENTS, people: PEOPLE });
const byClaim = async () => {
  const results = await regulationWatch.evaluate(CLAIMS, ctx);
  return new Map(results.map((r) => [r.claimId, r]));
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

describe("regulation-watch feed", () => {
  it("has unique ids, https sources and ISO dates on every entry", () => {
    expect(REGULATION_FEED.length).toBeGreaterThanOrEqual(3);
    expect(new Set(REGULATION_FEED.map((n) => n.id)).size).toBe(REGULATION_FEED.length);
    for (const n of REGULATION_FEED) {
      expect(n.source.name.length).toBeGreaterThan(0);
      expect(n.source.url).toMatch(/^https:\/\/\S+$/);
      expect(n.publishedAt).toMatch(ISO_DAY);
      expect(n.effectiveFrom).toMatch(ISO_DAY);
      expect(Number.isNaN(Date.parse(n.publishedAt))).toBe(false);
      expect(Number.isNaN(Date.parse(n.effectiveFrom))).toBe(false);
      expect(n.summary.trim().length).toBeGreaterThan(0);
      expect(["change", "indexation", "threshold"]).toContain(n.kind);
    }
  });

  it("covers the notices the demo claims depend on", () => {
    expect(REGULATION_FEED.some((n) => n.topic === "meal-vouchers" && n.jurisdiction.country === "BE")).toBe(true);
    expect(
      REGULATION_FEED.some(
        (n) => n.topic === "indexation" && n.jurisdiction.country === "BE" && n.jurisdiction.jointCommittee === "118",
      ),
    ).toBe(true);
  });
});

describe("regulation-watch matching", () => {
  const base: RegulationNotice = {
    id: "t-1",
    topic: "indexation",
    jurisdiction: { country: "BE", jointCommittee: "200" },
    title: "t",
    summary: "s",
    source: { name: "n", url: "https://example.org/x" },
    publishedAt: "2026-01-01",
    effectiveFrom: "2026-01-01",
    kind: "indexation",
  };

  it("treats synonyms as the same topic", () => {
    expect(topicsMatch("benefit-in-kind", "company-car")).toBe(true);
    expect(topicsMatch("company-car", "benefit-in-kind")).toBe(true);
    expect(topicsMatch("indexation", "holiday-pay")).toBe(false);
  });

  it("excludes a notice for another joint committee, and ignores JC when one side is unset", () => {
    const anchor118 = { topic: "indexation", jurisdiction: { country: "BE", jointCommittee: "118" } };
    expect(anchorMatches(anchor118, base)).toBe(false);
    expect(anchorMatches(anchor118, { ...base, jurisdiction: { country: "BE", jointCommittee: "118" } })).toBe(true);
    expect(anchorMatches(anchor118, { ...base, jurisdiction: { country: "BE" } })).toBe(true);
    expect(anchorMatches({ topic: "indexation", jurisdiction: { country: "BE" } }, base)).toBe(true);
    expect(anchorMatches({ topic: "indexation", jurisdiction: { country: "NL" } }, base)).toBe(false);
  });

  it("gives no result for a claim when the only notice is for JC 200", async () => {
    const signal = createRegulationWatch([base]);
    const c8 = CLAIMS.find((c) => c.id === "c8")!;
    expect(await signal.evaluate([c8], ctx)).toHaveLength(0);
  });

  it("flags an upcoming change as expiring", async () => {
    const future: RegulationNotice = {
      ...base,
      jurisdiction: { country: "BE", jointCommittee: "118" },
      effectiveFrom: "2027-01-01",
    };
    const signal = createRegulationWatch([future]);
    const c8 = CLAIMS.find((c) => c.id === "c8")!;
    const [r] = await signal.evaluate([c8], ctx);
    expect(r.verdict).toBe("expiring");
    expect(r.confidence).toBe(0.6);
    expect(r.summary).toContain("2027-01-01");
  });
});

describe("regulation-watch on the demo workspace (stub LLM)", () => {
  it("flags c2 (meal vouchers, BE) as outdated with the RSZ notice as external evidence", async () => {
    const r = (await byClaim()).get("c2");
    expect(r?.verdict).toBe("outdated");
    expect(r?.confidence).toBe(0.7);
    expect(r?.evidence.at(0)?.documentId).toBe("reg:reg-be-meal-vouchers-2026");
    expect(r?.evidence.at(0)?.url).toMatch(/^https:\/\//);
    expect(r?.evidence.at(0)?.effectiveDate).toBe("2026-01-01");
    expect(r?.summary).toContain("2026-01-01");
    expect(r?.summary).toContain("RSZ");
    expect(r?.actions?.find((a) => a.type === "review-document")?.url).toMatch(/^https:\/\//);
    expect(r?.actions?.find((a) => a.type === "ask-expert")?.personId).toBe("p-tom");
    expect(r?.details?.llmSummary).toBe(false);
  });

  it("flags c8 (indexation, BE, JC 118) as outdated with the January 2026 indexation", async () => {
    const r = (await byClaim()).get("c8");
    expect(r?.verdict).toBe("outdated");
    expect(r?.evidence.map((e) => e.documentId)).toContain("reg:reg-be-jc118-indexation-2026-01");
    expect(r?.summary).toContain("2.19%");
    expect(r?.actions?.find((a) => a.type === "ask-expert")?.personId).toBe("p-tom");
  });

  it("has no opinion on claims without anchors or without a matching notice", async () => {
    const m = await byClaim();
    for (const id of ["c1", "c3", "c4", "c7"]) expect(m.has(id)).toBe(false);
  });

  it("uses the LLM sentence when the model returns one, and never throws when it fails", async () => {
    const talkative = createContext({
      workspaceId: "ws-demo",
      people: PEOPLE,
      llm: createStubLlm({ generateText: async () => "The 8.91 EUR cap since 2026-01-01 makes the 7 euro figure stale." }),
    });
    const c2 = CLAIMS.find((c) => c.id === "c2")!;
    const [r] = await regulationWatch.evaluate([c2], talkative);
    expect(r.summary).toBe("The 8.91 EUR cap since 2026-01-01 makes the 7 euro figure stale.");
    expect(r.details?.llmSummary).toBe(true);

    const broken = createContext({
      workspaceId: "ws-demo",
      llm: createStubLlm({ generateText: async () => { throw new Error("provider down"); } }),
    });
    const [f] = await regulationWatch.evaluate([c2], broken);
    expect(f.verdict).toBe("outdated");
    expect(f.details?.llmSummary).toBe(false);
  });

  it("ignores claims from another workspace", async () => {
    const c2 = { ...CLAIMS.find((c) => c.id === "c2")!, workspaceId: "ws-other" };
    expect(await regulationWatch.evaluate([c2], ctx)).toHaveLength(0);
  });
});
