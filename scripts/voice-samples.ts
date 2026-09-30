/**
 * Lists ElevenLabs premade voices and renders the opening line of the demo script
 * with a shortlist of narrator candidates, so the team can pick by ear.
 *
 *   npm run voice:samples                 # shortlist below
 *   npm run voice:samples -- George Lily  # your own shortlist, by voice name or voice id
 *
 * Output: public/audio/samples/<name>.mp3 (git-ignored with the rest of public/audio).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const SCENE_1 =
  "Every payroll consultant knows this moment. A colleague leaves, and a client arrives with a " +
  "twenty-minute handover call. Everything they say sounds right. Some of it isn't.";

/** Calm, clear narrators from the default library. Names, not ids: ids differ per account. */
const DEFAULT_SHORTLIST = ["George", "Lily", "Alice", "Brian", "Daniel"];

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set (run with --env-file=.env.local)");
  const client = new ElevenLabsClient({ apiKey });
  const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";

  const { voices } = await client.voices.search({ category: "premade", pageSize: 100 });
  console.log(`${voices.length} premade voices:\n`);
  for (const v of voices) {
    const l = v.labels ?? {};
    console.log(
      `${v.name?.padEnd(12)} ${v.voiceId}  ${[l.gender, l.age, l.accent, l.description, l.use_case]
        .filter(Boolean)
        .join(", ")}`,
    );
  }

  const wanted = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SHORTLIST;
  const outDir = path.join(process.cwd(), "public", "audio", "samples");
  await mkdir(outDir, { recursive: true });

  console.log(`\nRendering scene 1 with: ${wanted.join(", ")}`);
  for (const name of wanted) {
    const voice = looksLikeId(name)
      ? await resolveId(client, name)
      : voices.find((v) => baseName(v.name) === name.toLowerCase());
    if (!voice) {
      console.warn(`  ${name}: not a premade voice name or a known voice id, skipped`);
      continue;
    }
    const stream = await client.textToSpeech.convert(voice.voiceId, {
      text: SCENE_1,
      modelId,
      outputFormat: "mp3_44100_128",
    });
    const file = path.join(outDir, `${slug(voice.name)}.mp3`);
    await writeFile(file, Buffer.from(await new Response(stream).arrayBuffer()));
    console.log(`  ${voice.name}: ${path.relative(process.cwd(), file)}  (id ${voice.voiceId})`);
  }
  console.log("\nSet ELEVENLABS_VOICE_ID in .env.local to the id you like.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const looksLikeId = (s: string) => /^[A-Za-z0-9]{20}$/.test(s);

/**
 * A voice id from your own collection, or from the shared library. Shared voices can be
 * used for text-to-speech by id without adding them to the account, but `voices.get`
 * does not know them, so fall back to a library search for the name.
 */
async function resolveId(client: ElevenLabsClient, id: string): Promise<{ voiceId: string; name?: string }> {
  const own = await client.voices.get(id).catch(() => undefined);
  if (own) return own;
  const shared = await client.voices.getShared({ search: id, pageSize: 1 }).catch(() => undefined);
  const hit = shared?.voices.find((v) => v.voiceId === id);
  return { voiceId: id, name: hit?.name ?? id };
}

/** "B. Patrick -Professional American ..." → "b-patrick" */
const slug = (name?: string) =>
  (name ?? "voice").split(/ ?- ?/).at(0)!.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "George - Warm, Captivating Storyteller" → "george" */
function baseName(name?: string): string {
  return (name ?? "").split(" - ").at(0)!.trim().toLowerCase();
}
