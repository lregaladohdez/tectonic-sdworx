import type {
  Claim,
  Evidence,
  LegalAnchor,
  Person,
  SignalContext,
  SignalResult,
  SuggestedAction,
  TrustSignal,
} from "../../types";
import { REGULATION_FEED, type RegulationNotice } from "./feed";

/** Topics that mean the same thing for matching purposes. Symmetric. */
export const TOPIC_SYNONYMS: Record<string, readonly string[]> = {
  "benefit-in-kind": ["company-car", "voordeel-alle-aard"],
  "company-car": ["benefit-in-kind", "voordeel-alle-aard"],
  "meal-vouchers": ["meal-voucher", "maaltijdcheques"],
  indexation: ["wage-indexation", "index"],
  "holiday-pay": ["annual-holiday", "vakantiegeld"],
};

export const CONFIDENCE_APPLIED = 0.7;
export const CONFIDENCE_UPCOMING = 0.6;

export function topicsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  return (TOPIC_SYNONYMS[a] ?? []).includes(b) || (TOPIC_SYNONYMS[b] ?? []).includes(a);
}

/**
 * Topic (or synonym) and country must match. Joint committee must match when both
 * sides set it. Region is only compared when both sides set it.
 */
export function anchorMatches(anchor: LegalAnchor, notice: RegulationNotice): boolean {
  if (!topicsMatch(anchor.topic, notice.topic)) return false;
  const a = anchor.jurisdiction;
  const n = notice.jurisdiction;
  if (a.country !== n.country) return false;
  if (a.jointCommittee && n.jointCommittee && a.jointCommittee !== n.jointCommittee) return false;
  if (a.region && n.region && a.region !== n.region) return false;
  return true;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const applies = (notice: RegulationNotice, now: Date) => notice.effectiveFrom <= isoDay(now);

/** Already-effective notices first (latest change first), then upcoming ones (soonest first). */
function rank(notices: RegulationNotice[], now: Date): RegulationNotice[] {
  const past = notices.filter((n) => applies(n, now)).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const future = notices.filter((n) => !applies(n, now)).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return [...past, ...future];
}

function pickExpert(people: Person[], workspaceId: string, topic: string): Person | undefined {
  const candidates = people.filter((p) => p.workspaceId === workspaceId);
  const knows = (p: Person, t: string) => p.topics.some((x) => topicsMatch(x, t));
  return (
    candidates.find((p) => knows(p, "regulation") && knows(p, topic)) ??
    candidates.find((p) => knows(p, "regulation")) ??
    candidates.find((p) => knows(p, topic))
  );
}

function deterministicSummary(notice: RegulationNotice, claim: Claim, now: Date): string {
  const source = `${notice.source.name}`;
  if (applies(notice, now)) {
    return `"${notice.title}" (${source}) applies since ${notice.effectiveFrom}; the claim of ${claim.saidAt} about ${notice.topic} may not reflect it.`;
  }
  return `"${notice.title}" (${source}) takes effect on ${notice.effectiveFrom}; this claim about ${notice.topic} will need a check before then.`;
}

/**
 * Optional LLM refinement. Returns undefined with the stub (empty text), on error,
 * or when the model answers with something that is not one usable sentence.
 */
async function llmSummary(
  ctx: SignalContext,
  notice: RegulationNotice,
  claim: Claim,
): Promise<string | undefined> {
  try {
    const prompt = [
      "A payroll consultant said the following about a client:",
      `Claim (${claim.saidAt}): ${claim.text}`,
      "A regulation change notice reads:",
      `Title: ${notice.title}`,
      `Summary: ${notice.summary}`,
      `Effective from: ${notice.effectiveFrom}`,
      `Source: ${notice.source.name}`,
      "In ONE plain sentence, say whether and how this change affects the claim. Name the change, the source and the effective date. No preamble.",
    ].join("\n");
    const text = await ctx.llm.generateText(prompt, "You are a Belgian payroll expert. Answer in one sentence.");
    const line = text.trim().split("\n").find((l) => l.trim().length > 0)?.trim();
    if (!line || line.length < 20) return undefined;
    return line.length > 300 ? `${line.slice(0, 297)}...` : line;
  } catch (e) {
    ctx.log(`regulation-watch: llm summary failed for ${claim.id}: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
}

/**
 * Deterministic matching of claim anchors against a feed of regulation notices.
 * A claim is `outdated` when a matching change already applies, `expiring` when
 * one is coming. Build with a custom feed for tests; the default uses REGULATION_FEED.
 */
export function createRegulationWatch(feed: RegulationNotice[] = REGULATION_FEED): TrustSignal {
  return {
    id: "regulation-watch",
    name: "Regulation watch",
    description:
      "Matches each claim's legal anchors (topic, country, joint committee) against regulation change notices and flags claims made without a change that applies or is coming.",
    category: "detect",
    version: "1.0.0",
    weight: 1,

    async evaluate(claims: Claim[], ctx: SignalContext): Promise<SignalResult[]> {
      const results: SignalResult[] = [];
      for (const claim of claims) {
        try {
          if (claim.workspaceId !== ctx.workspaceId) continue;
          if (!claim.anchors || claim.anchors.length === 0) continue;

          const matched = new Map<string, { notice: RegulationNotice; anchor: LegalAnchor }>();
          for (const anchor of claim.anchors) {
            for (const notice of feed) {
              if (!matched.has(notice.id) && anchorMatches(anchor, notice)) matched.set(notice.id, { notice, anchor });
            }
          }
          if (matched.size === 0) continue;

          const ranked = rank([...matched.values()].map((m) => m.notice), ctx.now);
          const primary = ranked.at(0)!;
          const anchor = matched.get(primary.id)!.anchor;
          const inForce = applies(primary, ctx.now);

          const evidence: Evidence[] = ranked.map((n) => ({
            documentId: `reg:${n.id}`,
            excerpt: n.summary,
            url: n.source.url,
            effectiveDate: n.effectiveFrom,
          }));

          const actions: SuggestedAction[] = [
            { type: "review-document", label: `Read: ${primary.source.name}`, url: primary.source.url },
          ];
          const expert = pickExpert(ctx.people, ctx.workspaceId, anchor.topic);
          if (expert) actions.push({ type: "ask-expert", label: `Ask ${expert.name}`, personId: expert.id });

          const fallback = deterministicSummary(primary, claim, ctx.now);
          const refined = await llmSummary(ctx, primary, claim);

          results.push({
            signalId: this.id,
            claimId: claim.id,
            verdict: inForce ? "outdated" : "expiring",
            confidence: inForce ? CONFIDENCE_APPLIED : CONFIDENCE_UPCOMING,
            summary: refined ?? fallback,
            evidence,
            actions,
            details: {
              noticeIds: ranked.map((n) => n.id),
              primaryNotice: primary.id,
              kind: primary.kind,
              effectiveFrom: primary.effectiveFrom,
              inForce,
              verified: primary.verified !== false,
              anchorTopic: anchor.topic,
              llmSummary: refined !== undefined,
              deterministicSummary: fallback,
            },
          });
        } catch (e) {
          ctx.log(`regulation-watch: skipped ${claim.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      return results;
    },
  };
}

export const regulationWatch: TrustSignal = createRegulationWatch();
