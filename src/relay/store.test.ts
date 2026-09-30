import { beforeEach, describe, expect, it } from "vitest";
import { findUserByEmail, getClaim, getDocument, isMember, listClaims, resetStore, setReview, getReview } from "./store";

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

  it("keys reviews by workspace and claim", () => {
    setReview({ workspaceId: "ws-demo", claimId: "c1", status: "accepted", updatedBy: "u-incoming" });
    expect(getReview("ws-demo", "c1")?.status).toBe("accepted");
    expect(getReview("ws-other", "c1")).toBeUndefined();
  });
});
