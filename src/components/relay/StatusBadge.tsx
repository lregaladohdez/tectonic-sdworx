import type { Verdict } from "@/relay/types";

const STYLES: Record<Verdict | "unknown", string> = {
  confirmed: "bg-success/10 text-success border-success/30",
  contradicted: "bg-danger/10 text-danger border-danger/30",
  outdated: "bg-warning/15 text-warning border-warning/40",
  expiring: "bg-sun/15 text-ink border-sun/50",
  unsupported: "bg-slate/10 text-slate border-slate/30",
  unknown: "bg-surface-alt text-slate border-line",
};

const LABELS: Record<Verdict | "unknown", string> = {
  confirmed: "Confirmed",
  contradicted: "Contradicted",
  outdated: "Outdated",
  expiring: "Expiring",
  unsupported: "Unsupported",
  unknown: "Not assessed",
};

export function StatusBadge({ verdict }: { verdict: Verdict | "unknown" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[verdict]}`}>
      {LABELS[verdict]}
    </span>
  );
}
