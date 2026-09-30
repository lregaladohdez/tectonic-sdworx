import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspacePage } from "@/lib/auth/access";
import { ClaimCard } from "@/components/relay/ClaimCard";
import { Shell } from "@/components/relay/Shell";
import { assessClientCached, llmMode } from "@/relay/assess-cached";
import { getClient, getReview, listDocuments, listPeople } from "@/relay/store";
import { VERDICTS } from "@/relay/types";

export const dynamic = "force-dynamic";

export default async function ClaimBoardPage({ params }: PageProps<"/w/[workspaceId]/clients/[clientId]">) {
  const { workspaceId, clientId } = await params;
  const { user, workspace } = await requireWorkspacePage(workspaceId);
  const client = getClient(workspaceId, clientId);
  if (!client) notFound();

  const { claims, trust, errors } = await assessClientCached(workspaceId, clientId);
  const documents = new Map(listDocuments(workspaceId).map((d) => [d.id, d]));
  const people = new Map(listPeople(workspaceId).map((p) => [p.id, p]));

  const counts = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<string, number>;
  for (const t of trust.values()) counts[t.verdict] = (counts[t.verdict] ?? 0) + 1;
  const reviewed = claims.filter((c) => (getReview(workspaceId, c.id)?.status ?? "open") !== "open").length;

  return (
    <Shell user={user} workspace={workspace}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate">
            <Link href={`/w/${workspaceId}`} className="hover:underline">Client handovers</Link> / {client.name}
          </p>
          <h1 className="text-2xl font-semibold text-ink">Claim board</h1>
          <p className="mt-1 text-sm text-body">
            Every statement from the handover, with its evidence and status. Signals run in {llmMode()} mode.
          </p>
        </div>
        <Link
          href={`/w/${workspaceId}/clients/${clientId}/brief`}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-400"
        >
          Verified client brief
        </Link>
      </div>

      <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          ["Claims", claims.length],
          ["Confirmed", counts.confirmed],
          ["Contradicted", counts.contradicted],
          ["Outdated", counts.outdated + counts.expiring],
          ["Unsupported", counts.unsupported],
          ["Reviewed", reviewed],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-3">
            <dt className="text-xs text-slate">{label}</dt>
            <dd className="text-xl font-semibold text-ink">{n}</dd>
          </div>
        ))}
      </dl>

      {errors.length > 0 ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-body">
          Some signals failed and were skipped: {errors.map((e) => e.signalId).join(", ")}.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {claims.map((claim) => (
          <ClaimCard
            key={claim.id}
            workspaceId={workspaceId}
            claim={claim}
            trust={trust.get(claim.id)!}
            review={getReview(workspaceId, claim.id)}
            documents={documents}
            people={people}
          />
        ))}
      </div>
    </Shell>
  );
}
