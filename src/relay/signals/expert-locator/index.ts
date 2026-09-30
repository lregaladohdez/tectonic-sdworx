import { documentsForClaim } from "../../scope";
import type {
  Claim,
  KnowledgeDocument,
  Person,
  SignalContext,
  SignalResult,
  SuggestedAction,
  TrustSignal,
} from "../../types";

/** Points per topic the person and the claim have in common. */
export const TOPIC_POINTS = 3;
/** Points when the person owns a knowledge document that shares a topic with the claim. */
export const OWNER_POINTS = 2;
/** Points when the person covers the client's country. */
export const JURISDICTION_POINTS = 1;
/** Points when the person is the one who made the claim. */
export const SPEAKER_POINTS = 1;

/**
 * A topic-sharing document counts as covering a claim only when it mentions at
 * least this share of the claim's key terms. Below it the document is "thin":
 * it is about the subject, but not about what was said.
 */
export const THIN_COVERAGE_THRESHOLD = 2 / 3;

export interface ExpertMatch {
  person: Person;
  score: number;
  reasons: string[];
}

/** Coverage of one claim by the workspace's knowledge documents (everything but transcripts). */
export interface ClaimCoverage {
  /** Non-transcript documents of the same workspace that share a topic with the claim. */
  documents: KnowledgeDocument[];
  /** Key terms taken from the claim text. */
  terms: string[];
  /** Share of key terms mentioned by the best-matching document, 0 when there is none. */
  coverage: number;
  bestDocument?: KnowledgeDocument;
  /** No document shares a topic with the claim. */
  silent: boolean;
  /** Documents share a topic but mention too few of the claim's terms. */
  thin: boolean;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "by", "with", "from",
  "is", "are", "was", "were", "be", "been", "has", "have", "had", "do", "does", "not", "no",
  "so", "as", "it", "its", "this", "that", "these", "those", "they", "their", "there", "he",
  "she", "his", "her", "we", "our", "you", "your", "under", "over", "every", "each", "per",
  "all", "any", "some", "but", "if", "then", "than", "into", "onto", "about", "very",
]);

const normalise = (s: string) => s.toLowerCase();

/** Cheap stem so "vouchers" matches "voucher" and "applies" matches "apply". */
const stem = (word: string) => {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
};

/** Key terms of a claim: content words of four letters or more, stemmed, in order of first appearance. */
export function keyTerms(text: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of normalise(text).match(/[a-z0-9][a-z0-9-]*/g) ?? []) {
    if (raw.length < 4 || STOPWORDS.has(raw)) continue;
    const term = stem(raw);
    if (seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
  }
  return terms;
}

const sharedTopics = (a: readonly string[], b: readonly string[]) => a.filter((t) => b.includes(t));

const knowledgeDocuments = (claim: Claim, ctx: SignalContext) =>
  documentsForClaim(claim, ctx.documents).filter((d) => d.workspaceId === ctx.workspaceId);

/**
 * Deterministic coverage check. A claim is "silent" when no knowledge document shares a
 * topic with it, and "thin" when the documents that do share a topic mention fewer than
 * THIN_COVERAGE_THRESHOLD of the claim's key terms (e.g. a client file tagged "contact"
 * that lists the contacts but says nothing about how they prefer to be reached).
 */
export function documentCoverage(claim: Claim, ctx: SignalContext): ClaimCoverage {
  const documents = knowledgeDocuments(claim, ctx).filter((d) => sharedTopics(d.topics, claim.topics).length > 0);
  const terms = keyTerms(claim.text);
  let coverage = 0;
  let bestDocument: KnowledgeDocument | undefined;
  for (const doc of documents) {
    const body = normalise(doc.content);
    const hits = terms.filter((t) => body.includes(t)).length;
    const ratio = terms.length === 0 ? 1 : hits / terms.length;
    if (bestDocument === undefined || ratio > coverage) {
      coverage = ratio;
      bestDocument = doc;
    }
  }
  const silent = documents.length === 0;
  const thin = !silent && coverage < THIN_COVERAGE_THRESHOLD;
  return { documents, terms, coverage, bestDocument, silent, thin };
}

/**
 * Pure, transparent ranking of the workspace's people for a claim. Every point is
 * explained in `reasons`; people who score 0 are left out. Never looks outside the
 * context's workspace.
 */
export function rankExperts(claim: Claim, ctx: SignalContext): ExpertMatch[] {
  const people = ctx.people.filter((p) => p.workspaceId === ctx.workspaceId && p.workspaceId === claim.workspaceId);
  const client = ctx.clients.find((c) => c.id === claim.clientId && c.workspaceId === claim.workspaceId);
  const country = client?.jurisdiction.country;
  const relatedDocuments = knowledgeDocuments(claim, ctx).filter(
    (d) => d.ownerId !== undefined && sharedTopics(d.topics, claim.topics).length > 0,
  );

  const matches: (ExpertMatch & { topicCount: number })[] = [];
  for (const person of people) {
    let score = 0;
    const reasons: string[] = [];

    const topics = sharedTopics(person.topics, claim.topics);
    if (topics.length > 0) {
      score += TOPIC_POINTS * topics.length;
      reasons.push(`knows ${topics.join(", ")} (+${TOPIC_POINTS * topics.length})`);
    }

    const owned = relatedDocuments.filter((d) => d.ownerId === person.id);
    if (owned.length > 0) {
      score += OWNER_POINTS;
      const doc = owned.at(0)!;
      reasons.push(`owns "${doc.title}" on ${sharedTopics(doc.topics, claim.topics).join(", ")} (+${OWNER_POINTS})`);
    }

    if (country !== undefined && person.jurisdictions.includes(country)) {
      score += JURISDICTION_POINTS;
      reasons.push(`covers ${country} (+${JURISDICTION_POINTS})`);
    }

    if (claim.speakerId !== undefined && claim.speakerId === person.id) {
      score += SPEAKER_POINTS;
      reasons.push(`made the claim, can confirm what was meant (+${SPEAKER_POINTS})`);
    }

    if (score > 0) matches.push({ person, score, reasons, topicCount: topics.length });
  }

  matches.sort(
    (a, b) => b.score - a.score || b.topicCount - a.topicCount || a.person.name.localeCompare(b.person.name),
  );
  return matches.map(({ person, score, reasons }) => ({ person, score, reasons }));
}

/** A runner-up is only worth a second action when they match on subject matter, not just on country. */
const isSubjectExpert = (m: ExpertMatch) => m.score >= OWNER_POINTS;

async function draftQuestion(claim: Claim, expert: Person, ctx: SignalContext): Promise<string | undefined> {
  try {
    const text = await ctx.llm.generateText(
      [
        `A payroll consultant taking over a client heard this during a handover: "${claim.text}"`,
        `No document confirms it. Draft one short, polite question the consultant could send to ${expert.name} (${expert.role}) to confirm it.`,
        "Answer with the question only, in one sentence.",
      ].join("\n"),
      "You write concise, professional messages between payroll colleagues.",
    );
    const line = text.trim().split("\n").at(0)?.trim() ?? "";
    return line.length > 0 ? line : undefined;
  } catch (err) {
    ctx.log(`expert-locator: could not draft a question for ${claim.id}: ${String(err)}`);
    return undefined;
  }
}

/**
 * When the documents cannot settle a claim, find the person who can. Fires only for
 * claims whose documents are silent or thin; `rankExperts` is exported so the board can
 * show "who to ask" for any claim.
 */
export const expertLocator: TrustSignal = {
  id: "expert-locator",
  name: "Expert locator",
  description:
    "For claims no document settles, names the colleague best placed to confirm them, with a transparent score per shared topic, owned document, jurisdiction and authorship.",
  category: "connect",
  version: "1.0.0",
  weight: 0.5,

  async evaluate(claims: Claim[], ctx: SignalContext): Promise<SignalResult[]> {
    const results = await Promise.all(
      claims.map(async (claim): Promise<SignalResult | undefined> => {
        try {
          const coverage = documentCoverage(claim, ctx);
          if (!coverage.silent && !coverage.thin) return undefined;

          const ranked = rankExperts(claim, ctx);
          const topics = claim.topics.join(", ") || "this subject";
          const gap = coverage.silent
            ? `No document covers ${topics}`
            : `No document covers ${topics} beyond a mention (closest: "${coverage.bestDocument!.title}")`;

          if (ranked.length === 0) {
            return {
              signalId: this.id,
              claimId: claim.id,
              verdict: "unsupported",
              confidence: 0.5,
              summary: `${gap}; nobody in the workspace is listed for it, so this rests on the speaker's word.`,
              evidence: [],
              details: { coverage: coverage.coverage, candidates: [] },
            };
          }

          const [best, second] = ranked;
          const actions: SuggestedAction[] = [
            { type: "ask-expert", label: `Ask ${best.person.name}`, personId: best.person.id },
          ];
          if (second !== undefined && isSubjectExpert(second)) {
            actions.push({ type: "ask-expert", label: `Ask ${second.person.name}`, personId: second.person.id });
          }

          const details: Record<string, unknown> = {
            coverage: coverage.coverage,
            closestDocumentId: coverage.bestDocument?.id,
            candidates: ranked.map((m) => ({ personId: m.person.id, score: m.score, reasons: m.reasons })),
          };
          const question = await draftQuestion(claim, best.person, ctx);
          if (question !== undefined) details.draftQuestion = question;

          return {
            signalId: this.id,
            claimId: claim.id,
            verdict: "unsupported",
            confidence: 0.5,
            summary: `${gap}; ${best.person.name} (${best.person.role}) is the closest expert: ${best.reasons.join("; ")}.`,
            evidence: [],
            actions,
            details,
          };
        } catch (err) {
          ctx.log(`expert-locator: skipped ${claim.id}: ${String(err)}`);
          return undefined;
        }
      }),
    );
    return results.filter((r): r is SignalResult => r !== undefined);
  },
};
