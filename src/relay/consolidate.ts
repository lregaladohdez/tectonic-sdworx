import { getSignal } from "./registry";
import type { ClaimTrust, SignalResult, SuggestedAction, Verdict } from "./types";

/**
 * Higher wins when signals disagree: a negative finding always beats a confirmation,
 * and a confirmation with evidence beats "no evidence found" from another signal.
 */
const PRECEDENCE: Record<Verdict, number> = {
  contradicted: 5,
  outdated: 4,
  expiring: 3,
  confirmed: 2,
  unsupported: 1,
};

/** Contribution of a verdict to the score, before weighting by confidence. */
const VALUE: Record<Verdict, number> = {
  confirmed: 1,
  unsupported: 0,
  expiring: -0.3,
  outdated: -0.7,
  contradicted: -1,
};

/** The winning verdict caps the score, so one contradiction cannot be averaged away. */
const CEILING: Record<Verdict, number> = {
  confirmed: 1,
  unsupported: 0.5,
  expiring: 0.6,
  outdated: 0.45,
  contradicted: 0.35,
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function consolidateClaim(claimId: string, results: SignalResult[]): ClaimTrust {
  const own = results.filter((r) => r.claimId === claimId);
  if (own.length === 0) {
    return { claimId, verdict: "unknown", score: 0.5, signals: [], reasons: [], actions: [] };
  }

  const verdict = own.reduce<Verdict>(
    (best, r) => (PRECEDENCE[r.verdict] > PRECEDENCE[best] ? r.verdict : best),
    own.at(0)!.verdict,
  );

  let weighted = 0;
  let totalWeight = 0;
  for (const r of own) {
    const w = (getSignal(r.signalId)?.weight ?? 1) * clamp01(r.confidence);
    weighted += w * VALUE[r.verdict];
    totalWeight += w;
  }
  const averaged = totalWeight === 0 ? 0.5 : clamp01(0.5 + 0.5 * (weighted / totalWeight));
  const score = Math.min(averaged, CEILING[verdict]);

  const reasons = own.map((r) => `${getSignal(r.signalId)?.name ?? r.signalId}: ${r.summary}`);
  const actions = dedupeActions(own.flatMap((r) => r.actions ?? []));

  return { claimId, verdict, score, signals: own, reasons, actions };
}

export function consolidate(claimIds: string[], results: SignalResult[]): ClaimTrust[] {
  return claimIds.map((id) => consolidateClaim(id, results));
}

function dedupeActions(actions: SuggestedAction[]): SuggestedAction[] {
  const seen = new Set<string>();
  return actions.filter((a) => {
    const key = `${a.type}|${a.personId ?? ""}|${a.documentId ?? ""}|${a.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
