import Link from "next/link";
import { requireWorkspacePage } from "@/lib/auth/access";
import { Shell } from "@/components/relay/Shell";
import { REGULATION_FEED } from "@/relay/signals/regulation-watch/feed";
import { listClaims, listClients, listDocuments, listPeople } from "@/relay/store";
import type { Claim, DocumentKind, KnowledgeDocument, Person } from "@/relay/types";

const KIND: Record<DocumentKind, [singular: string, plural: string]> = {
  policy: ["policy", "policies"],
  "client-file": ["client file", "client files"],
  contract: ["contract", "contracts"],
  email: ["email", "emails"],
  note: ["note", "notes"],
  transcript: ["transcript", "transcripts"],
  regulation: ["regulation", "regulations"],
  other: ["other document", "other documents"],
};

const STRIPES = ["bg-brand", "bg-accent", "bg-sun"];

/** Who handed the client over and when, taken from the claims themselves. */
function handoverOf(claims: Claim[], people: Map<string, Person>) {
  const counts = new Map<string, number>();
  for (const c of claims) if (c.speakerId) counts.set(c.speakerId, (counts.get(c.speakerId) ?? 0) + 1);
  const speakerId = [...counts.entries()].sort((a, b) => b[1] - a[1]).at(0)?.[0];
  const date = claims.map((c) => c.saidAt).sort().at(-1);
  return { speaker: speakerId ? people.get(speakerId) : undefined, date };
}

/** "1 client file, 2 policies, 1 email" for the documents that count as evidence. */
function describeSources(documents: KnowledgeDocument[]): string {
  const counts = new Map<DocumentKind, number>();
  for (const d of documents) if (d.kind !== "transcript") counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1);
  return [...counts].map(([kind, n]) => `${n} ${KIND[kind][n === 1 ? 0 : 1]}`).join(", ");
}

const jurisdictionLabel = (j: { country: string; jointCommittee?: string }) =>
  j.jointCommittee ? `${j.country} · JC ${j.jointCommittee}` : j.country;

export default async function WorkspacePage({ params }: PageProps<"/w/[workspaceId]">) {
  const { workspaceId } = await params;
  const { user, workspace } = await requireWorkspacePage(workspaceId);
  const clients = listClients(workspaceId);
  const people = listPeople(workspaceId);
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const documents = listDocuments(workspaceId);
  const documentsById = new Map(documents.map((d) => [d.id, d]));
  const supersededBy = new Map(documents.filter((d) => d.supersedes).map((d) => [d.supersedes!, d]));
  const totalClaims = clients.reduce((n, c) => n + listClaims(workspaceId, c.id).length, 0);
  const recentDocuments = [...documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const notices = [...REGULATION_FEED].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  return (
    <Shell user={user} workspace={workspace}>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Client handovers</h1>
        <p className="mt-1 text-sm text-body">
          {clients.length} clients are changing hands, {totalClaims} statements in total. Open a client to see every
          claim from the handover call, what the team&apos;s documents say about it, and who to ask.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((c, i) => {
          const claims = listClaims(workspaceId, c.id);
          const own = documents.filter((d) => d.clientId === c.id);
          const handover = handoverOf(claims, peopleById);
          return (
            <li key={c.id} className="flex flex-col rounded-lg border border-line bg-surface p-5">
              <span className={`mb-3 h-1.5 w-12 rounded-full ${STRIPES[i % STRIPES.length]}`} />
              <Link href={`/w/${workspaceId}/clients/${c.id}`} className="text-lg font-semibold text-brand hover:underline">
                {c.name}
              </Link>
              <p className="mt-1 text-sm text-body">
                {c.sector} · {jurisdictionLabel(c.jurisdiction)}
              </p>
              {handover.speaker ? (
                <p className="mt-3 text-sm text-body">
                  Handed over by <span className="font-medium text-ink">{handover.speaker.name.split(" (")[0]}</span>
                  {handover.date ? ` on ${handover.date}` : ""}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate">
                {claims.length} claims · {describeSources(own)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">Regulation watch</h2>
          <p className="mt-1 text-sm text-slate">
            Changes every claim is checked against. Each one was verified on an official page; the source is linked.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {notices.map((n) => (
              <li key={n.id} className="border-l-2 border-sun pl-3">
                <a href={n.source.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink hover:underline">
                  {n.title}
                </a>
                <p className="text-xs text-slate">
                  Applies from {n.effectiveFrom} · {jurisdictionLabel(n.jurisdiction)} · {n.source.name}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">Who to ask</h2>
          <p className="mt-1 text-sm text-slate">
            The team behind these clients. Claims no document settles are routed to the person who knows the topic.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {people.map((p) => (
              <li key={p.id} className="flex flex-col gap-1">
                <p className="text-sm">
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="text-slate"> · {p.role}</span>
                </p>
                <p className="flex flex-wrap gap-1">
                  {p.topics.map((t) => (
                    <span key={t} className="rounded-full border border-line bg-surface-alt px-2 py-0.5 text-xs text-body">
                      {t}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Knowledge sources</h2>
        <p className="mt-1 text-sm text-slate">
          Everything the signals may quote, newest first. A replaced document stays visible so the change can be traced.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Document</th>
                <th className="py-2 pr-4 font-medium">Kind</th>
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Updated</th>
                <th className="py-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody>
              {recentDocuments.map((d) => {
                const replacedBy = supersededBy.get(d.id);
                const replaces = d.supersedes ? documentsById.get(d.supersedes) : undefined;
                return (
                  <tr key={d.id} className="border-b border-line-soft align-top">
                    <td className="py-2 pr-4">
                      <p className={replacedBy ? "text-slate line-through" : "text-ink"}>{d.title}</p>
                      {replacedBy ? <p className="text-xs text-warning">Replaced by {replacedBy.title}</p> : null}
                      {replaces ? <p className="text-xs text-slate">Replaces {replaces.title}</p> : null}
                    </td>
                    <td className="py-2 pr-4 text-body">{KIND[d.kind][0]}</td>
                    <td className="py-2 pr-4 text-body">{d.clientId ? clientsById.get(d.clientId)?.name : "Workspace"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-body">{d.updatedAt}</td>
                    <td className="py-2 text-body">{d.ownerId ? peopleById.get(d.ownerId)?.name : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
