import { describe, expect, it } from "vitest";
import { CLAIMS, CLIENTS, DOCUMENTS, PEOPLE } from "../../fixtures/demo-workspace";
import { createContext } from "../../testing";
import { documentFreshness } from "./index";

const ctx = createContext({ workspaceId: "ws-demo", documents: DOCUMENTS, clients: CLIENTS, people: PEOPLE });
const byClaim = async () => {
  const results = await documentFreshness.evaluate(CLAIMS, ctx);
  return new Map(results.map((r) => [r.claimId, r]));
};

describe("document-freshness", () => {
  it("flags a claim whose policy was revised as expiring, citing both versions", async () => {
    const r = (await byClaim()).get("c2");
    expect(r?.verdict).toBe("expiring");
    expect(r?.evidence.map((e) => e.documentId)).toEqual(["doc-mealvoucher-2024", "doc-mealvoucher-2026"]);
    expect(r?.actions?.at(0)?.documentId).toBe("doc-mealvoucher-2026");
  });

  it("marks a claim resting on a 3-year-old email as outdated", async () => {
    const r = (await byClaim()).get("c6");
    expect(r?.verdict).toBe("outdated");
    expect(r?.evidence.at(0)?.documentId).toBe("doc-company-car-email");
    expect(r?.actions?.at(0)?.personId).toBe("p-nadia");
  });

  it("has no opinion on claims with fresh or no supporting documents", async () => {
    const m = await byClaim();
    for (const id of ["c1", "c3", "c4", "c5", "c7", "c8"]) expect(m.has(id)).toBe(false);
  });

  it("never looks at transcripts or other workspaces", async () => {
    const foreign = { ...DOCUMENTS.at(3)!, id: "x", workspaceId: "ws-other", updatedAt: "2019-01-01" };
    const results = await documentFreshness.evaluate(
      [CLAIMS.at(0)!],
      createContext({ workspaceId: "ws-demo", documents: [foreign, DOCUMENTS.at(5)!] }),
    );
    expect(results).toHaveLength(0);
  });
});
