/**
 * Relay kernel: domain model and the trust-signal plugin contract.
 * Keep this file free of framework and provider imports; signals depend on it.
 */
import type { ZodType } from "zod";

export interface Jurisdiction {
  country: string; // ISO 3166-1 alpha-2, e.g. "BE"
  region?: string; // e.g. "Flanders"
  jointCommittee?: string; // Belgian paritair comité, e.g. "118"
}

export interface Workspace {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  workspaceIds: string[];
}

export interface Person {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: string;
  topics: string[];
  jurisdictions: string[];
}

export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  sector?: string;
  jurisdiction: Jurisdiction;
}

export type DocumentKind =
  | "policy"
  | "client-file"
  | "contract"
  | "email"
  | "note"
  | "transcript"
  | "regulation"
  | "other";

export interface KnowledgeDocument {
  id: string;
  workspaceId: string;
  clientId?: string;
  kind: DocumentKind;
  title: string;
  content: string;
  /** ISO date the document was last updated. */
  updatedAt: string;
  /** ISO date from which the document applies, if different from updatedAt. */
  effectiveFrom?: string;
  /** Id of the document this one replaces. */
  supersedes?: string;
  ownerId?: string;
  topics: string[];
  jurisdiction?: Jurisdiction;
  sourceUrl?: string;
}

export interface LegalAnchor {
  topic: string;
  jurisdiction: Jurisdiction;
  reference?: string;
}

export interface Claim {
  id: string;
  workspaceId: string;
  clientId: string;
  text: string;
  /** Person who made the statement, when known. */
  speakerId?: string;
  /** ISO date the statement was made. */
  saidAt: string;
  /** The transcript (or other document) the claim was extracted from. */
  sourceDocumentId: string;
  /** Verbatim words from the source, for display. */
  quote?: string;
  topics: string[];
  anchors: LegalAnchor[];
}

/**
 * confirmed    evidence supports the claim
 * contradicted evidence says otherwise
 * outdated     the evidence is superseded or past the stale threshold
 * expiring     the evidence is aging or a newer revision exists; check it
 * unsupported  no evidence either way (tacit knowledge)
 */
export type Verdict = "confirmed" | "contradicted" | "outdated" | "expiring" | "unsupported";

export const VERDICTS: readonly Verdict[] = [
  "confirmed",
  "contradicted",
  "outdated",
  "expiring",
  "unsupported",
] as const;

export interface Evidence {
  documentId: string;
  excerpt: string;
  /** Where in the document, e.g. "§3" or "line 12". */
  locator?: string;
  url?: string;
  /** ISO date this evidence applies from (law changes, revisions). */
  effectiveDate?: string;
}

export type ActionType = "ask-expert" | "review-document" | "update-document" | "acknowledge";

export interface SuggestedAction {
  type: ActionType;
  label: string;
  personId?: string;
  documentId?: string;
  url?: string;
}

export interface SignalResult {
  signalId: string;
  claimId: string;
  verdict: Verdict;
  /** 0..1, how sure the signal is about its verdict. */
  confidence: number;
  /** One line a person can read on the claim card. */
  summary: string;
  evidence: Evidence[];
  actions?: SuggestedAction[];
  details?: Record<string, unknown>;
}

export type SignalCategory = "trust" | "capture" | "detect" | "connect";

/** Provider-agnostic LLM access handed to signals. Signals never import provider SDKs. */
export interface LlmClient {
  generateText(prompt: string, system?: string): Promise<string>;
  generateJson<T>(schema: ZodType<T>, prompt: string, system?: string): Promise<T>;
  embed(texts: string[]): Promise<number[][]>;
}

export interface SignalContext {
  workspaceId: string;
  now: Date;
  documents: KnowledgeDocument[];
  clients: Client[];
  people: Person[];
  llm: LlmClient;
  log: (message: string) => void;
}

/**
 * A trust signal plugin. Return one result per claim you have an opinion on;
 * omit claims you cannot judge. Never throw for a single bad claim; log and skip.
 */
export interface TrustSignal {
  id: string;
  name: string;
  description: string;
  category: SignalCategory;
  version: string;
  /** Relative weight in consolidation, default 1. */
  weight?: number;
  evaluate(claims: Claim[], ctx: SignalContext): Promise<SignalResult[]>;
}

export interface ClaimTrust {
  claimId: string;
  verdict: Verdict | "unknown";
  /** 0..1 trust score, 0.5 when no signal had an opinion. */
  score: number;
  signals: SignalResult[];
  reasons: string[];
  actions: SuggestedAction[];
}

export type ReviewStatus = "open" | "accepted" | "resolved" | "asked";

export interface ClaimReview {
  claimId: string;
  workspaceId: string;
  status: ReviewStatus;
  note?: string;
  personId?: string;
  updatedBy: string;
  updatedAt: string;
}
