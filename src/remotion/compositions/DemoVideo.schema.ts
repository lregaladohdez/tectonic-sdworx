import { z } from "zod";

/*
 * Timing constants for the submission demo (docs/VIDEO_SCRIPT.md). Kept free of
 * Remotion imports so scripts/video-record.ts can share the numbers: the footage of a
 * scene must run at least as long as the scene it is cut into.
 */

export const DEMO_FPS = 30;
export const DEMO_WIDTH = 1920;
export const DEMO_HEIGHT = 1080;

/** Scenes that are a screen recording (public/video/scene-N.mp4). */
export const FOOTAGE_SCENES = [3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Duration of public/audio/scenes/scene-N.mp3 in seconds (ffprobe, George voice).
 * Re-measure after `npm run voice:scenes`: the cut is built from these numbers.
 */
export const NARRATION_SECONDS: Record<number, number> = {
  1: 10.91,
  2: 16.67,
  3: 17.14,
  4: 17.83,
  5: 17.0,
  6: 22.43,
  7: 20.34,
  8: 20.11,
  9: 12.31,
};

/** Silence before the narration starts in every scene, and after it ends. Together: the 1 s gap. */
export const SCENE_HEAD_SECONDS = 0.5;
export const SCENE_TAIL_SECONDS = 0.5;
/** Extra title-card time: music at full volume before the first line and after the last one. */
export const TITLE_LEAD_SECONDS = 1.0;
export const TITLE_OUT_SECONDS = 2.0;

/** Total length of scene N in seconds, narration plus head, tail and the title-card extras. */
export function sceneSeconds(n: number): number {
  const base = SCENE_HEAD_SECONDS + NARRATION_SECONDS[n]! + SCENE_TAIL_SECONDS;
  if (n === 1) return base + TITLE_LEAD_SECONDS;
  if (n === 9) return base + TITLE_OUT_SECONDS;
  return base;
}

export const SCENE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const TOTAL_SECONDS = SCENE_NUMBERS.reduce((s, n) => s + sceneSeconds(n), 0);

/** Where the recording of scene 9 gives way to the closing title card (narration time, "Find it."). */
export const SCENE_9_TITLE_AT_SECONDS = 8.6;

export const demoVideoSchema = z.object({
  /** True when public/aikido/before.png and after.png were reachable at render time. */
  aikido: z.object({ before: z.boolean(), after: z.boolean() }),
  repoUrl: z.string(),
});

export type DemoVideoProps = z.infer<typeof demoVideoSchema>;

export const DEMO_VIDEO = {
  id: "DemoVideo",
  fps: DEMO_FPS,
  width: DEMO_WIDTH,
  height: DEMO_HEIGHT,
  durationInFrames: Math.round(TOTAL_SECONDS * DEMO_FPS),
  defaultProps: {
    aikido: { before: false, after: false },
    repoUrl: "github.com/lregaladohdez/tectonic-sdworx",
  } satisfies DemoVideoProps,
};
