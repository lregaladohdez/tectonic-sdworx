import { describe, expect, it } from "vitest";
import { CLAIMS, CLIENTS, DOCUMENTS, PEOPLE } from "../../fixtures/demo-workspace";
import { createContext, createStubLlm } from "../../testing";
import { documentCoverage, expertLocator, rankExperts } from "./index";

const ctx = createContext({ workspaceId: "ws-demo", documents: DOCUMENTS, clients: CLIENTS, people: PEOPLE });
const claim = (id: string) => CLAIMS.find((c) => c.id === id)!;
const byClaim = async (context = ctx) => {
  const results = await expertLocator.evaluate(CLAIMS, context);
  return new Map(results.map((r) => [r.claimId, r]));
};

describe("expert-locator", () => {
  it("only fires for claims the documents leave silent or thin (c3 and c8)", async () => {
    const m = await byClaim();
    expect([...m.keys()].sort()).toEqual(["c3", "c8"]);
    for (const id of ["c1", "c2", "c4", "c5", "c6", "c7"]) expect(m.has(id)).toBe(false);
  });

  it("sends the WhatsApp preference (c3) to Nadia, who knows the contact and said it herself", async () => {
    const r = (await byClaim()).get("c3")!;
    expect(r.verdict).toBe("unsupported");
    expect(r.confidence).toBe(0.5);
    expect(r.evidence).toEqual([]);
    expect(r.summary).toMatch(/^No document covers contact/);
    expect(r.summary).toContain("Nadia Haddad (Outgoing payroll consultant) is the closest expert");
    expect(r.summary).toContain("knows contact");
    expect(r.summary).toContain("made the claim");
    expect(r.actions).toEqual([{ type: "ask-expert", label: "Ask Nadia Haddad", personId: "p-nadia" }]);
  });

  it("sends the indexation question (c8) to Els first, with Tom as runner-up", async () => {
    const r = (await byClaim()).get("c8")!;
    expect(r.verdict).toBe("unsupported");
    expect(r.summary).toMatch(/^No document covers indexation, joint-committee/);
    expect(r.summary).toContain("Els Peeters (Senior payroll expert, food industry (JC 118)) is the closest expert");
    expect(r.actions).toHaveLength(2);
    expect(r.actions?.at(0)).toEqual({ type: "ask-expert", label: "Ask Els Peeters", personId: "p-els" });
    expect(r.actions?.at(1)).toEqual({ type: "ask-expert", label: "Ask Tom De Smet", personId: "p-tom" });
  });

  it("scores experts transparently: Els 7, Tom 4 on c8; Nadia 7 on c3", () => {
    const c8 = rankExperts(claim("c8"), ctx);
    expect(c8.map((m) => [m.person.id, m.score])).toEqual([
      ["p-els", 7],
      ["p-tom", 4],
      ["p-nadia", 4],
    ]);
    expect(c8.at(0)?.reasons).toEqual([
      "knows joint-committee, indexation (+6)",
      "covers BE (+1)",
    ]);

    const c3 = rankExperts(claim("c3"), ctx);
    expect(c3.at(0)?.person.id).toBe("p-nadia");
    expect(c3.at(0)?.score).toBe(7);
    expect(c3.at(0)?.reasons).toEqual([
      "knows contact (+3)",
      'owns "Client file: Bakkerij Janssens BV" on contact (+2)',
      "covers BE (+1)",
      "made the claim, can confirm what was meant (+1)",
    ]);
  });

  it("ranks someone for every claim, and never anyone who scores 0", () => {
    for (const c of CLAIMS) {
      const ranked = rankExperts(c, ctx);
      expect(ranked.length).toBeGreaterThan(0);
      for (const m of ranked) expect(m.score).toBeGreaterThan(0);
    }
    const stranger = { ...PEOPLE.at(1)!, id: "p-none", topics: [], jurisdictions: ["NL"] };
    const ranked = rankExperts(claim("c8"), createContext({ workspaceId: "ws-demo", clients: CLIENTS, people: [stranger] }));
    expect(ranked).toEqual([]);
  });

  it("never returns people or documents from another workspace", async () => {
    const foreignExpert = { ...PEOPLE.at(1)!, id: "p-foreign", workspaceId: "ws-other" };
    const foreignDoc = { ...DOCUMENTS.at(0)!, id: "doc-foreign", workspaceId: "ws-other", ownerId: "p-foreign" };
    const mixed = createContext({
      workspaceId: "ws-demo",
      documents: [...DOCUMENTS, foreignDoc],
      clients: CLIENTS,
      people: [...PEOPLE, foreignExpert],
    });
    for (const c of CLAIMS) {
      for (const m of rankExperts(c, mixed)) expect(m.person.workspaceId).toBe("ws-demo");
    }
    expect(rankExperts(claim("c8"), mixed).map((m) => m.person.id)).not.toContain("p-foreign");

    const foreignOnly = createContext({ workspaceId: "ws-demo", documents: [foreignDoc], clients: CLIENTS, people: [foreignExpert] });
    expect(rankExperts(claim("c8"), foreignOnly)).toEqual([]);
    expect(documentCoverage(claim("c1"), foreignOnly).silent).toBe(true);
  });

  it("tells silent apart from thin coverage", () => {
    expect(documentCoverage(claim("c1"), ctx)).toMatchObject({ silent: false, thin: false });
    expect(documentCoverage(claim("c3"), ctx)).toMatchObject({ silent: false, thin: true, bestDocument: { id: "doc-client-file" } });
    expect(documentCoverage(claim("c8"), ctx)).toMatchObject({ silent: false, thin: true });
    const noDocs = createContext({ workspaceId: "ws-demo", clients: CLIENTS, people: PEOPLE });
    expect(documentCoverage(claim("c1"), noDocs)).toMatchObject({ silent: true, thin: false, coverage: 0 });
  });

  it("drafts a question when the LLM answers, and skips it with the stub", async () => {
    const stub = (await byClaim()).get("c3")!;
    expect(stub.details?.draftQuestion).toBeUndefined();

    const talkative = createContext({
      workspaceId: "ws-demo",
      documents: DOCUMENTS,
      clients: CLIENTS,
      people: PEOPLE,
      llm: createStubLlm({ generateText: async () => "Hi Nadia, can you confirm Peter prefers WhatsApp for urgent questions?\nSecond line ignored." }),
    });
    const r = (await byClaim(talkative)).get("c3")!;
    expect(r.details?.draftQuestion).toBe("Hi Nadia, can you confirm Peter prefers WhatsApp for urgent questions?");
  });

  it("never throws when the LLM or a claim is broken", async () => {
    const logs: string[] = [];
    const broken = createContext({
      workspaceId: "ws-demo",
      documents: DOCUMENTS,
      clients: CLIENTS,
      people: PEOPLE,
      llm: createStubLlm({ generateText: async () => { throw new Error("provider down"); } }),
      log: (m) => logs.push(m),
    });
    const results = await expertLocator.evaluate(CLAIMS, broken);
    expect(results.map((r) => r.claimId).sort()).toEqual(["c3", "c8"]);
    expect(logs.some((l) => l.includes("provider down"))).toBe(true);

    const bad = { ...claim("c8"), topics: undefined as unknown as string[] };
    await expect(expertLocator.evaluate([bad], ctx)).resolves.toEqual([]);
  });
});
