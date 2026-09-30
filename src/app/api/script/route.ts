import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "@/lib/ai/openai";
import { generateTextWithGemini } from "@/lib/ai/google";
import { AccessError, getCurrentUser } from "@/lib/auth/access";
import { assertSameOrigin, errorResponse, limited, readJson } from "@/lib/http/guards";

const body = z.object({
  topic: z.string().trim().min(1).max(500),
  provider: z.enum(["openai", "google"]).default("google"),
});

const INSTRUCTIONS =
  "You write short, upbeat voice-over scripts (max 60 words) for an SD Worx HR & payroll briefing video. Plain prose, no stage directions.";

/** POST { topic, provider? } → { script }. Signed-in users only. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AccessError(401);
    const block = limited(`script:${user.id}`, 10, 60_000);
    if (block) return block;

    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { topic, provider } = parsed.data;
    const prompt = `Write the voice-over for a video about: ${topic}`;
    const script =
      provider === "google"
        ? await generateTextWithGemini(prompt, INSTRUCTIONS)
        : await generateText(prompt, INSTRUCTIONS);
    return NextResponse.json({ script, provider });
  } catch (error) {
    return errorResponse(error);
  }
}
