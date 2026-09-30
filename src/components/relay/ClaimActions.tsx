"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClaimReview, ReviewStatus, SuggestedAction } from "@/relay/types";

interface Props {
  workspaceId: string;
  claimId: string;
  review?: ClaimReview;
  actions: SuggestedAction[];
  peopleNames: Record<string, string>;
}

export function ClaimActions({ workspaceId, claimId, review, actions, peopleNames }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(status: ReviewStatus, personId?: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/w/${workspaceId}/claims/${claimId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, personId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return setError(data.error ?? "Could not save");
    }
    router.refresh();
  }

  const asks = actions.filter((a) => a.type === "ask-expert" && a.personId);
  const btn = "rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {review && review.status !== "open" ? (
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
          {review.status === "asked" && review.personId
            ? `Asked ${peopleNames[review.personId] ?? "an expert"}`
            : review.status === "accepted"
              ? "Accepted"
              : "Resolved"}
        </span>
      ) : null}
      <button type="button" disabled={busy} onClick={() => send("accepted")} className={`${btn} border-success/40 text-success hover:bg-success/10`}>
        Accept
      </button>
      <button type="button" disabled={busy} onClick={() => send("resolved")} className={`${btn} border-line text-body hover:bg-surface-alt`}>
        Mark resolved
      </button>
      {asks.map((a) => (
        <button
          key={a.personId}
          type="button"
          disabled={busy}
          onClick={() => send("asked", a.personId)}
          className={`${btn} border-brand/40 text-brand hover:bg-brand-50`}
        >
          {a.label}
        </button>
      ))}
      {review && review.status !== "open" ? (
        <button type="button" disabled={busy} onClick={() => send("open")} className="text-xs text-slate hover:text-ink">
          Reopen
        </button>
      ) : null}
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </div>
  );
}
