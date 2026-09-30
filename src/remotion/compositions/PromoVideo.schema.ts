import { z } from "zod";

// Kept free of Remotion imports so server code (API routes) can import it.
export const promoVideoSchema = z.object({
  title: z.string().max(80),
  subtitle: z.string().max(160),
  /** Path under /public, e.g. "audio/abc123.mp3" (from ElevenLabs). Optional. */
  voiceOver: z.string().max(64).optional(),
});

export type PromoVideoProps = z.infer<typeof promoVideoSchema>;

export const PROMO_VIDEO = {
  id: "PromoVideo",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 30 * 8,
  defaultProps: {
    title: "SD Worx",
    subtitle: "SD Worx makes work work",
  } satisfies PromoVideoProps,
};
