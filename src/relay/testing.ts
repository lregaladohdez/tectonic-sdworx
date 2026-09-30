import type { ZodType } from "zod";
import type { LlmClient, SignalContext } from "./types";

/** An LLM that never calls a provider. Tests and offline runs use it. */
export function createStubLlm(overrides: Partial<LlmClient> = {}): LlmClient {
  return {
    generateText: async () => "",
    generateJson: async <T>(schema: ZodType<T>) => schema.parse({}),
    embed: async (texts) => texts.map(() => [0]),
    ...overrides,
  };
}

export function createContext(
  partial: Partial<SignalContext> & Pick<SignalContext, "workspaceId">,
): SignalContext {
  return {
    now: new Date("2026-09-30T12:00:00Z"),
    documents: [],
    clients: [],
    people: [],
    llm: createStubLlm(),
    log: () => {},
    ...partial,
  };
}
