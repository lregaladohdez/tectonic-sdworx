import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspacePage } from "@/lib/auth/access";
import { Shell } from "@/components/relay/Shell";
import { StatusBadge } from "@/components/relay/StatusBadge";
import { assessClientCached } from "@/relay/assess-cached";
import { getClient, getReview, listDocuments, listPeople } from "@/relay/store";

export const dynamic = "force-dynamic";

export default async function BriefPage({ params }: PageProps<"/w/[workspaceId]/clients/[clientId]/brief">) {
  const { workspaceId, clientId } = await params;
  const { user, workspace } = await requireWorkspacePage(workspaceId);
  const client = getClient(workspaceId, clientId);
  if (!client) notFound();

  const { claims, trust } = await assessClientCached(workspaceId, clientId);
  const documents = new Map(listDocuments(workspaceId).map((d) => [d.id, d]));
  const people = new Map(listPeople(workspaceId).map((p) => [p.id, p]));

  const rows = claims.map((c) => ({ claim: c, trust: trust.get(c.id)!, review: getReview(workspaceId, c.id) }));
  const verified = rows.filter((r) => r.review?.status === "accepted" || (r.trust.verdict === "confirmed" && r.review?.status !== "open"));
  const pending = rows.filter((r) => !verified.includes(r));

  return (
    <Shell user={user} workspace={workspace}>
      <p className="text-sm text-slate">
        <Link href={`/w/${workspaceId}/clients/${clientId}`} className="hover:underline">Claim board</Link> / Verified brief
      </p>
      <h1 className="text-2xl font-semibold text-ink">{client.name}: verified client brief</h1>
      <p className="text-sm text-body">
        Prepared for {user.name} on {new Date().toISOString().slice(0, 10)}. Only statements that are confirmed by evidence
        or accepted after review appear as facts. Everything else is listed as pending, with the reason.
      </p>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">What you can rely on</h2>
        {verified.length === 0 ? (
          <p className="mt-2 text-sm text-slate">Nothing verified yet. Accept claims on the board to build the brief.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {verified.map(({ claim, trust }) => (
              <li key={claim.id} className="text-sm">
                <p className="font-medium text-ink">{claim.text}</p>
                <p className="text-slate">
                  {trust.signals.flatMap((s) => s.evidence).map((e) => documents.get(e.documentId)?.title ?? e.documentId).filter((v, i, a) => a.indexOf(v) === i).join(" · ") || "Accepted by the consultant"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Still open</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {pending.map(({ claim, trust, review }) => (
            <li key={claim.id} className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge verdict={trust.verdict} />
                <span className="font-medium text-ink">{claim.text}</span>
              </div>
              {trust.reasons.map((r) => (
                <p key={r} className="text-slate">{r}</p>
              ))}
              {review?.status === "asked" && review.personId ? (
                <p className="text-brand">Asked {people.get(review.personId)?.name}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
