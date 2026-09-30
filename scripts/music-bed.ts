/**
 * Composes the instrumental music bed for the demo video with ElevenLabs Music.
 *
 *   npm run music:bed                 # 175 s bed from the default prompt
 *   npm run music:bed -- 120 "calm marimba, 90 bpm"   # length in seconds, custom prompt
 *
 * Output: public/audio/music/bed.mp3 (git-ignored). Re-run for another take;
 * generation is not deterministic.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const DEFAULT_PROMPT =
  "Playful retro instrumental for a product demo video: marimba, soft analog synth, brushed drums, " +
  "light bass, around 100 bpm, warm and optimistic, Memphis design 1980s Milan mood, no vocals, " +
  "steady dynamics suitable as a bed under narration, gentle intro, clean ending.";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const client = new ElevenLabsClient({ apiKey });

  const seconds = Number(process.argv[2] ?? 175);
  const prompt = process.argv[3] ?? DEFAULT_PROMPT;
  const out = path.join(process.cwd(), "public", "audio", "music", "bed.mp3");
  await mkdir(path.dirname(out), { recursive: true });

  console.log(`composing ${seconds}s: ${prompt}`);
  const stream = await client.music.compose({
    prompt,
    musicLengthMs: seconds * 1000,
    forceInstrumental: true,
    outputFormat: "mp3_44100_128",
  });
  await writeFile(out, Buffer.from(await new Response(stream).arrayBuffer()));

  const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out])
    .toString()
    .trim();
  console.log(`wrote ${path.relative(process.cwd(), out)} (${Number(dur).toFixed(1)} s)`);
}

main().catch((e) => {
  console.error(e?.body ?? e);
  process.exit(1);
});
