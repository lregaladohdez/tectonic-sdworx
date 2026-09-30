import type { Verdict } from "@/relay/types";

type Tone = Verdict | "unknown";

/*
 * One colour per verdict, shared by the badge, the claim card and the count
 * tiles so a status reads the same everywhere. Semantic tokens from the
 * Ignite palette, with the brand yellow for "expiring".
 */
export const VERDICT_TONE: Record<Tone, { badge: string; card: string; tile: string; text: string }> = {
  confirmed: {
    badge: "bg-success/10 text-success border-success/30",
    card: "border-l-success shadow-[5px_5px_0_0_var(--color-success)]",
    tile: "border-t-success",
    text: "text-success",
  },
  contradicted: {
    badge: "bg-danger/10 text-danger border-danger/30",
    card: "border-l-danger shadow-[5px_5px_0_0_var(--color-danger)]",
    tile: "border-t-danger",
    text: "text-danger",
  },
  outdated: {
    badge: "bg-warning/15 text-warning border-warning/40",
    card: "border-l-warning shadow-[5px_5px_0_0_var(--color-warning)]",
    tile: "border-t-warning",
    text: "text-warning",
  },
  expiring: {
    badge: "bg-sun/15 text-ink border-sun/50",
    card: "border-l-sun shadow-[5px_5px_0_0_var(--color-sun)]",
    tile: "border-t-sun",
    text: "text-ink",
  },
  unsupported: {
    badge: "bg-slate/10 text-slate border-slate/30",
    card: "border-l-slate shadow-[5px_5px_0_0_var(--color-slate)]",
    tile: "border-t-slate",
    text: "text-slate",
  },
  unknown: {
    badge: "bg-surface-alt text-slate border-line",
    card: "border-l-line shadow-[5px_5px_0_0_var(--color-line)]",
    tile: "border-t-line",
    text: "text-slate",
  },
};

const LABELS: Record<Tone, string> = {
  confirmed: "Confirmed",
  contradicted: "Contradicted",
  outdated: "Outdated",
  expiring: "Expiring",
  unsupported: "Unsupported",
  unknown: "Not assessed",
};

export function StatusBadge({ verdict }: { verdict: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${VERDICT_TONE[verdict].badge}`}>
      {LABELS[verdict]}
    </span>
  );
}
