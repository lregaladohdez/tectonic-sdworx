/**
 * Renders the voice-over of every scene in docs/VIDEO_SCRIPT.md with the configured
 * ElevenLabs voice, one MP3 per scene, and prints the duration of each.
 *
 *   npm run voice:scenes          # all scenes
 *   npm run voice:scenes -- 5 6   # only scenes 5 and 6 (after a rewrite)
 *
 * Output: public/audio/scenes/scene-<n>.mp3. Files are keyed by a hash of voice + text,
 * so an unchanged scene is not rendered twice.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const SCRIPT = path.join(process.cwd(), "docs", "VIDEO_SCRIPT.md");
const OUT = path.join(process.cwd(), "public", "audio", "scenes");

interface Scene {
  n: number;
  time: string;
  text: string;
}

/** Reads the "| # | Time | On screen | Voice-over |" table. */
async function readScenes(): Promise<Scene[]> {
  const md = await readFile(SCRIPT, "utf8");
  const scenes: Scene[] = [];
  for (const line of md.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // ["", "#", "Time", "On screen", "Voice-over", ""] after split
    if (cells.length < 6 || !/^\d+$/.test(cells[1]!)) continue;
    scenes.push({ n: Number(cells[1]), time: cells[2]!, text: cells[4]!.replace(/\*+/g, "") });
  }
  if (scenes.length === 0) throw new Error(`No scene table found in ${SCRIPT}`);
  return scenes;
}

function durationSeconds(file: string): number {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(out.toString().trim());
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set");
  const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
  const client = new ElevenLabsClient({ apiKey });

  const only = new Set(process.argv.slice(2).map(Number));
  const scenes = (await readScenes()).filter((s) => only.size === 0 || only.has(s.n));
  await mkdir(OUT, { recursive: true });

  let total = 0;
  let words = 0;
  for (const scene of scenes) {
    const file = path.join(OUT, `scene-${scene.n}.mp3`);
    const hash = createHash("sha1").update(`${voiceId}:${modelId}:${scene.text}`).digest("hex").slice(0, 12);
    const stamp = `${file}.${hash}`;
    if (!existsSync(stamp) || !existsSync(file)) {
      const stream = await client.textToSpeech.convert(voiceId, {
        text: scene.text,
        modelId,
        outputFormat: "mp3_44100_128",
      });
      await writeFile(file, Buffer.from(await new Response(stream).arrayBuffer()));
      await writeFile(stamp, "");
    }
    const seconds = durationSeconds(file);
    const w = scene.text.split(/\s+/).length;
    total += seconds;
    words += w;
    console.log(
      `scene ${String(scene.n).padStart(2)}  ${scene.time.padEnd(11)}  ${String(w).padStart(3)} words  ${seconds.toFixed(1).padStart(5)} s  ${path.relative(process.cwd(), file)}`,
    );
  }
  const mm = Math.floor(total / 60);
  const ss = Math.round(total % 60);
  console.log(`\nvoice only: ${words} words, ${mm}:${String(ss).padStart(2, "0")} (limit 3:00, leave room for pauses and title cards)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
