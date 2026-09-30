import Link from "next/link";
import { requireWorkspacePage } from "@/lib/auth/access";
import { Shell } from "@/components/relay/Shell";
import { listClaims, listClients, listDocuments } from "@/relay/store";

export default async function WorkspacePage({ params }: PageProps<"/w/[workspaceId]">) {
  const { workspaceId } = await params;
  const { user, workspace } = await requireWorkspacePage(workspaceId);
  const clients = listClients(workspaceId);

  return (
    <Shell user={user} workspace={workspace}>
      <h1 className="text-2xl font-semibold text-ink">Client handovers</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {clients.map((c) => (
          <li key={c.id} className="rounded-lg border border-line bg-surface p-5">
            <Link href={`/w/${workspaceId}/clients/${c.id}`} className="text-lg font-semibold text-brand hover:underline">
              {c.name}
            </Link>
            <p className="mt-1 text-sm text-body">
              {c.sector} · {c.jurisdiction.country}
              {c.jurisdiction.jointCommittee ? ` · JC ${c.jurisdiction.jointCommittee}` : ""}
            </p>
            <p className="mt-3 text-sm text-slate">
              {listClaims(workspaceId, c.id).length} claims from the handover · {listDocuments(workspaceId, c.id).length} documents
            </p>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
