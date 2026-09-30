import type { Claim, SignalContext, SignalResult, TrustSignal } from "./types";

const signals = new Map<string, TrustSignal>();

export function registerSignal(signal: TrustSignal): void {
  if (signals.has(signal.id)) {
    throw new Error(`Signal "${signal.id}" is already registered`);
  }
  signals.set(signal.id, signal);
}

export function getSignal(id: string): TrustSignal | undefined {
  return signals.get(id);
}

export function listSignals(): TrustSignal[] {
  return [...signals.values()];
}

/** Test helper. */
export function clearSignals(): void {
  signals.clear();
}

export interface RunReport {
  results: SignalResult[];
  errors: { signalId: string; message: string }[];
}

/** Runs every registered signal (or `only`) in parallel. A failing signal never fails the run. */
export async function runSignals(
  claims: Claim[],
  ctx: SignalContext,
  options: { only?: string[] } = {},
): Promise<RunReport> {
  const selected = listSignals().filter((s) => !options.only || options.only.includes(s.id));
  const settled = await Promise.allSettled(
    selected.map(async (signal) => {
      const results = await signal.evaluate(claims, ctx);
      return results.map((r) => ({ ...r, signalId: signal.id }));
    }),
  );

  const report: RunReport = { results: [], errors: [] };
  settled.forEach((outcome, i) => {
    const signal = selected.at(i)!;
    if (outcome.status === "fulfilled") {
      report.results.push(...outcome.value);
    } else {
      const message = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      ctx.log(`signal ${signal.id} failed: ${message}`);
      report.errors.push({ signalId: signal.id, message });
    }
  });
  return report;
}
