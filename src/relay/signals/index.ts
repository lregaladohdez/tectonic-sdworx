/**
 * Signal registration. Add a new signal by importing it here; nothing else changes.
 */
import { registerSignal, listSignals } from "../registry";
import { documentEvidence } from "./document-evidence";
import { documentFreshness } from "./document-freshness";
import { expertLocator } from "./expert-locator";
import { regulationWatch } from "./regulation-watch";

const ALL = [documentFreshness, documentEvidence, regulationWatch, expertLocator];

export function registerAllSignals(): void {
  if (listSignals().length > 0) return;
  for (const signal of ALL) registerSignal(signal);
}
