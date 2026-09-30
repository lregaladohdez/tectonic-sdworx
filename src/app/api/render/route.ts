import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessError, getCurrentUser } from "@/lib/auth/access";
import { assertSameOrigin, errorResponse, limited, readJson } from "@/lib/http/guards";
import { renderVideo } from "@/lib/video/render";
import { PROMO_VIDEO, promoVideoSchema } from "@/remotion/compositions/PromoVideo.schema";

export const maxDuration = 300;

/** POST PromoVideoProps → { fileName }. Renders to ./out on the server; signed-in users only. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AccessError(401);
    const block = limited(`render:${user.id}`, 2, 60_000);
    if (block) return block;

    const parsed = promoVideoSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    // voiceOver must be a bare file name under public/audio, never a path.
    if (parsed.data.voiceOver && !/^audio\/[a-f0-9]{16}\.mp3$/.test(parsed.data.voiceOver)) {
      return NextResponse.json({ error: "Invalid voiceOver" }, { status: 400 });
    }

    const fileName = `${PROMO_VIDEO.id}-${user.id}.mp4`;
    await renderVideo({ compositionId: PROMO_VIDEO.id, inputProps: parsed.data, fileName });
    return NextResponse.json({ fileName });
  } catch (error) {
    return errorResponse(error);
  }
}
