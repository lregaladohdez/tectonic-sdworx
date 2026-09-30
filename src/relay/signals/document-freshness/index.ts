import type { Claim, Evidence, KnowledgeDocument, SignalContext, SignalResult, TrustSignal } from "../../types";

/** Months after which supporting evidence is flagged. */
export const AGING_MONTHS = 18;
export const STALE_MONTHS = 30;

const monthsBetween = (from: string, to: Date) => {
  const a = new Date(from);
  return (to.getFullYear() - a.getFullYear()) * 12 + (to.getMonth() - a.getMonth());
};

const excerpt = (doc: KnowledgeDocument) => doc.content.split("\n").at(0)!.slice(0, 160);

/**
 * Deterministic, no LLM. Looks at the documents that share a topic with the claim
 * and flags evidence that is superseded, revised, or simply old.
 */
export const documentFreshness: TrustSignal = {
  id: "document-freshness",
  name: "Document freshness",
  description: "Flags claims whose supporting documents are superseded, revised, or older than the stale threshold.",
  category: "detect",
  version: "1.0.0",
  weight: 0.8,

  async evaluate(claims: Claim[], ctx: SignalContext): Promise<SignalResult[]> {
    const corpus = ctx.documents.filter((d) => d.kind !== "transcript");
    const supersededBy = new Map<string, KnowledgeDocument>();
    for (const d of corpus) if (d.supersedes) supersededBy.set(d.supersedes, d);

    const results: SignalResult[] = [];
    for (const claim of claims) {
      const relevant = corpus.filter(
        (d) => d.workspaceId === claim.workspaceId && d.topics.some((t) => claim.topics.includes(t)),
      );
      if (relevant.length === 0) continue;

      const current = relevant.filter((d) => !supersededBy.has(d.id));
      const revised = relevant.filter((d) => supersededBy.has(d.id));

      if (revised.length > 0) {
        const old = revised.at(0)!;
        const next = supersededBy.get(old.id)!;
        const evidence: Evidence[] = [
          { documentId: old.id, excerpt: excerpt(old), effectiveDate: old.effectiveFrom ?? old.updatedAt },
          { documentId: next.id, excerpt: excerpt(next), effectiveDate: next.effectiveFrom ?? next.updatedAt },
        ];
        results.push({
          signalId: this.id,
          claimId: claim.id,
          verdict: "expiring",
          confidence: 0.6,
          summary: `"${old.title}" was replaced by "${next.title}" on ${next.updatedAt}; check the claim against the current version.`,
          evidence,
          actions: [{ type: "review-document", label: `Review ${next.title}`, documentId: next.id }],
          details: { revised: old.id, replacedBy: next.id },
        });
        continue;
      }

      const newest = current.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b));
      const age = monthsBetween(newest.updatedAt, ctx.now);
      if (age < AGING_MONTHS) continue;

      const stale = age >= STALE_MONTHS;
      results.push({
        signalId: this.id,
        claimId: claim.id,
        verdict: stale ? "outdated" : "expiring",
        confidence: stale ? 0.8 : 0.6,
        summary: `The newest supporting document, "${newest.title}", is ${age} months old (${newest.updatedAt}); ${
          stale ? "treat it as outdated until reconfirmed" : "it is due for a check"
        }.`,
        evidence: [{ documentId: newest.id, excerpt: excerpt(newest), effectiveDate: newest.updatedAt }],
        actions: [
          {
            type: "update-document",
            label: `Reconfirm ${newest.title}`,
            documentId: newest.id,
            personId: newest.ownerId,
          },
        ],
        details: { ageMonths: age, agingMonths: AGING_MONTHS, staleMonths: STALE_MONTHS },
      });
    }
    return results;
  },
};
