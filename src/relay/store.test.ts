import { beforeEach, describe, expect, it } from "vitest";
import { CLAIMS, CLIENTS, DOCUMENTS, PEOPLE } from "./fixtures/demo-workspace";
import { findUserByEmail, getClaim, getDocument, isMember, listClaims, listClients, resetStore, setReview, getReview } from "./store";

describe("store is workspace-scoped", () => {
  beforeEach(() => resetStore());

  it("does not return records from another workspace, even by id", () => {
    expect(getClaim("ws-demo", "c1")).toBeDefined();
    expect(getClaim("ws-other", "c1")).toBeUndefined();
    expect(getDocument("ws-other", "doc-client-file")).toBeUndefined();
    expect(listClaims("ws-other", "cl-janssens")).toHaveLength(0);
  });

  it("checks membership", () => {
    const outsider = findUserByEmail("OUTSIDER@relay.demo")!;
    expect(isMember(outsider, "ws-demo")).toBe(false);
    expect(isMember(findUserByEmail("incoming@relay.demo")!, "ws-demo")).toBe(true);
  });

  it("seeds three clients whose claims and documents all point at records that exist", () => {
    expect(listClients("ws-demo").map((c) => c.id)).toEqual(["cl-janssens", "cl-willems", "cl-debrug"]);
    const ids = {
      clients: new Set(CLIENTS.map((c) => c.id)),
      documents: new Set(DOCUMENTS.map((d) => d.id)),
      people: new Set(PEOPLE.map((p) => p.id)),
    };
    for (const c of CLAIMS) {
      expect(ids.clients.has(c.clientId), c.id).toBe(true);
      expect(ids.documents.has(c.sourceDocumentId), c.id).toBe(true);
      if (c.speakerId) expect(ids.people.has(c.speakerId), c.id).toBe(true);
      expect(DOCUMENTS.find((d) => d.id === c.sourceDocumentId)?.clientId, c.id).toBe(c.clientId);
      expect(listClaims("ws-demo", c.clientId).length).toBeGreaterThanOrEqual(5);
    }
    for (const d of DOCUMENTS) {
      if (d.clientId) expect(ids.clients.has(d.clientId), d.id).toBe(true);
      if (d.ownerId) expect(ids.people.has(d.ownerId), d.id).toBe(true);
      if (d.supersedes) expect(DOCUMENTS.find((x) => x.id === d.supersedes)?.clientId, d.id).toBe(d.clientId);
    }
    expect(new Set([...CLAIMS.map((c) => c.id), ...DOCUMENTS.map((d) => d.id)]).size).toBe(CLAIMS.length + DOCUMENTS.length);
  });

  it("keys reviews by workspace and claim", () => {
    setReview({ workspaceId: "ws-demo", claimId: "c1", status: "accepted", updatedBy: "u-incoming" });
    expect(getReview("ws-demo", "c1")?.status).toBe("accepted");
    expect(getReview("ws-other", "c1")).toBeUndefined();
  });
});
