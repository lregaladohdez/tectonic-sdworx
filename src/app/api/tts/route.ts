import { NextResponse } from "next/server";
import { z } from "zod";
import { textToSpeech } from "@/lib/ai/elevenlabs";
import { AccessError, getCurrentUser } from "@/lib/auth/access";
import { assertSameOrigin, errorResponse, limited } from "@/lib/http/guards";

const body = z.object({
  text: z.string().trim().min(1).max(2000),
});

/** POST { text } → audio/mpeg bytes. Signed-in users only; nothing is written to disk. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AccessError(401);
    const block = limited(`tts:${user.id}`, 5, 60_000);
    if (block) return block;

    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const audio = await textToSpeech(parsed.data.text);
    return new NextResponse(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
