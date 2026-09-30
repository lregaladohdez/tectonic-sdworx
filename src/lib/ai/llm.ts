import "server-only";
import type { ZodType } from "zod";
import { env } from "@/lib/env";
import type { LlmClient } from "@/relay/types";
import { google, generateTextWithGemini } from "./google";
import { generateText as generateWithOpenAI } from "./openai";

const hasGoogle = () => Boolean(env().GOOGLE_CLOUD_PROJECT || env().GOOGLE_API_KEY);
const hasOpenAI = () => Boolean(env().OPENAI_API_KEY);

/** True when at least one text provider is configured. */
export function llmAvailable(): boolean {
  return hasGoogle() || hasOpenAI();
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = trimmed.search(/[[{]/);
  return JSON.parse(start >= 0 ? trimmed.slice(start) : trimmed);
}

/**
 * Provider-agnostic LLM client for signals. Google (Gemini on Vertex or the
 * Gemini API) is preferred because the hackathon credits are there; OpenAI is
 * the fallback for text. Embeddings always come from Gemini.
 */
export function createLlm(): LlmClient {
  const generateText = async (prompt: string, system?: string) => {
    if (hasGoogle()) return generateTextWithGemini(prompt, system);
    if (hasOpenAI()) return generateWithOpenAI(prompt, system);
    throw new Error("No LLM configured. Set GOOGLE_CLOUD_PROJECT, GOOGLE_API_KEY or OPENAI_API_KEY.");
  };

  return {
    generateText,
    async generateJson<T>(schema: ZodType<T>, prompt: string, system?: string): Promise<T> {
      const instructions = `${system ?? ""}\nRespond with a single JSON value and nothing else. No prose, no code fences.`;
      const text = await generateText(prompt, instructions.trim());
      return schema.parse(extractJson(text));
    },
    async embed(texts: string[]): Promise<number[][]> {
      if (!hasGoogle()) throw new Error("Embeddings need Google configured (GOOGLE_CLOUD_PROJECT or GOOGLE_API_KEY).");
      const response = await google().models.embedContent({
        model: env().GOOGLE_EMBEDDING_MODEL,
        contents: texts,
      });
      return (response.embeddings ?? []).map((e) => e.values ?? []);
    },
  };
}
