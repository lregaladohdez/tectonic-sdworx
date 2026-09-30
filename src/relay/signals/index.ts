/**
 * Signal registration. Add a new signal by importing it here; nothing else changes.
 */
import { registerSignal, listSignals } from "../registry";
import { documentFreshness } from "./document-freshness";

const ALL = [documentFreshness];

export function registerAllSignals(): void {
  if (listSignals().length > 0) return;
  for (const signal of ALL) registerSignal(signal);
}
