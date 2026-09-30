import type { Claim, KnowledgeDocument } from "./types";

/**
 * The knowledge documents a claim may be judged against: same workspace, never a
 * transcript, and either workspace-wide (no clientId) or filed under the claim's
 * own client. One client's meal-voucher policy says nothing about another client.
 */
export function documentsForClaim(claim: Claim, documents: readonly KnowledgeDocument[]): KnowledgeDocument[] {
  return documents.filter(
    (d) =>
      d.kind !== "transcript" &&
      d.workspaceId === claim.workspaceId &&
      (d.clientId === undefined || d.clientId === claim.clientId),
  );
}
