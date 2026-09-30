import { consolidate } from "./consolidate";
import { runSignals } from "./registry";
import { registerAllSignals } from "./signals";
import { listClaims, listClients, listDocuments, listPeople } from "./store";
import type { Claim, ClaimTrust, LlmClient } from "./types";

export interface Assessment {
  claims: Claim[];
  trust: Map<string, ClaimTrust>;
  errors: { signalId: string; message: string }[];
}

/** Runs every signal over a client's claims and consolidates the results. */
export async function assessClient(
  workspaceId: string,
  clientId: string,
  llm: LlmClient,
  now = new Date(),
): Promise<Assessment> {
  registerAllSignals();
  const claims = listClaims(workspaceId, clientId);
  const report = await runSignals(claims, {
    workspaceId,
    now,
    documents: listDocuments(workspaceId),
    clients: listClients(workspaceId),
    people: listPeople(workspaceId),
    llm,
    log: (m) => console.warn(`[relay] ${m}`),
  });
  const trust = new Map(consolidate(claims.map((c) => c.id), report.results).map((t) => [t.claimId, t]));
  return { claims, trust, errors: report.errors };
}
