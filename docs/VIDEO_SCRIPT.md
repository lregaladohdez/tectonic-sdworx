# Demo video script: Relay

Submission demo for the Tectonic × SD Worx track. Hard limit 3:00, target 2:45.
Narration is written for an ElevenLabs voice at about 150 words per minute; each
scene's voice-over is one paragraph so it can be generated with `POST /api/tts`
scene by scene and cut against the screen recording.

Working name: **Relay** (from `src/relay`). Change it everywhere if the team picks
another name.

## One-line pitch

A handover call between two payroll consultants becomes a list of claims, and every
claim shows whether the team's own documents confirm it, contradict it, or have
quietly moved on, plus who to ask.

## Script

| # | Time | On screen | Voice-over |
|---|------|-----------|------------|
| 1 | 0:00–0:13 | Memphis title card: **Relay**, subtitle "Hand over a client. Keep the trust." Cut to one line of the transcript: *"Meal vouchers are seven euro face value, one per day worked."* | Every payroll consultant knows this moment. A colleague leaves, and a client arrives with a twenty-minute handover call. Everything they say sounds right. Some of it isn't. |
| 2 | 0:14–0:31 | Fast montage of where knowledge lives: client file, policy PDF, an email from 2023, a Teams call. Then the challenge line: *"From 'I found something' to 'I know why I can rely on it'."* | At SD Worx, knowledge lives in client files, policies, emails, and in people's heads. Finding it is easy. Knowing which version is current, and who owns it, is the hard part. Our challenge: from "I found something" to "I know why I can rely on it". |
| 3 | 0:32–0:49 | The app. Workspace "SD Worx Antwerp, payroll team 3". Client card **Bakkerij Janssens BV**, Nadia Haddad → Jonas Vermeulen. The transcript on the left, eight claim cards appearing on the right. | Meet Relay. Nadia is leaving. Jonas takes over Bakkerij Janssens, a bakery with fourteen staff under joint committee 118. Their handover call is transcribed, and Relay turns it into eight claims: things Nadia said that Jonas is about to act on. |
| 4 | 0:50–1:08 | The claims board. Each card: claim text, verbatim quote, verdict chip (confirmed / expiring / outdated / contradicted / unsupported), trust score, and a "why" section. Hover a confirmed card (13th month) and show the client file excerpt, §4. | Trust signals check each claim against what the team already has: the client file, policies, emails. Every signal returns a verdict, a confidence, and the evidence it used. The thirteenth month is confirmed: paragraph four of the company agreement, and here is the line. |
| 5 | 1:09–1:26 | Card **Meal vouchers, 7 euro**. Verdict *contradicted* (freshness signal: *expiring*). Two documents side by side: the 2024 arrangement (7.00) and the 2026 arrangement (8.00) with "replaces the 2024 arrangement" highlighted. Action button: *Review "Meal voucher arrangement (2026)"*. | The meal vouchers. Nadia said seven euro. The 2024 arrangement agrees with her, but it was replaced in January 2026, and the new value is eight. Relay puts both documents side by side, marks which one is current, and asks Jonas to review the new version. |
| 6 | 1:27–1:49 | Card **Sunday premium 50%**. Verdict *contradicted*. Quote from the transcript against the client file §7: "100% premium". Then the next JC 118 card, action *Ask Els Peeters, senior payroll expert JC 118*. Click, and the card is marked *Asked Els Peeters*, evidence kept. (The contradicted card itself offers no Ask button today.) | The Sunday premium. Nadia said fifty percent. The company agreement says one hundred. A contradiction with real money attached, and Relay shows both texts on screen. It also knows who owns this topic: Els Peeters, the team's expert on joint committee 118. One click marks it as asked to her, evidence attached. |
| 7 | 1:50–2:10 | Two quick cards. **Delivery vans, no benefit in kind**: verdict *outdated*, the only evidence is an email from May 2023, "40 months old, treat as outdated until reconfirmed", action *Reconfirm*. **Peter prefers WhatsApp**: verdict *unsupported*, "no document mentions this", action *Ask Nadia Haddad*. | Two more. The delivery vans: the only evidence is an email from 2023, forty months old. Relay does not guess whether it still holds; it asks for a reconfirmation. And Peter preferring WhatsApp: no document anywhere. Tacit knowledge. Relay routes the question to Nadia, who said it. |
| 8 | 2:11–2:31 | Code, briefly. `src/relay/types.ts` with the `TrustSignal` interface. `src/relay/signals/` folder listing. Then the Aikido audit, before and after. | Relay is a small kernel and a plugin contract. Freshness is deterministic, no model involved. Contradiction detection uses a language model that must return supporting quotes, or its verdict is dropped. Every read is workspace-scoped, keys stay on the server, and Aikido's code audit ran before and after. |
| 9 | 2:32–2:47 | Back to the claims board, all eight cards, most now *accepted* or *asked*. Title card: **Relay. Find it. Understand it. Trust it.** GitHub URL. | Relay does not replace the handover. It makes it honest: what is confirmed, what has changed, what nobody wrote down, and who to ask. Find it. Understand it. Trust it. |

Voice-over total: 380 words, measured at 2:34 with George (`npm run voice:scenes`
prints the per-scene durations). The times above assume a one-second gap between scenes
and three seconds of title card at each end, so the cut lands at about 2:47. That is
thirteen seconds of margin: if any scene grows, shorten scene 6 or scene 2 first. The
first draft (510 words) rendered at 3:14, so do not add words without re-measuring.

## What the recording needs to exist

Each scene depends on something. Status as of 30 Sep 2026:

- Scene 1, 2, 9: title cards, the transcript line and the knowledge montage. `DemoVideo` in
  Remotion (`src/remotion/compositions/DemoVideo.tsx`, timings in `DemoVideo.schema.ts`), same
  shapes and fonts as `PromoVideo`. **Exists.**
- Scene 3, 4: the workspace page (`/w/ws-demo`) and the claim board
  (`/w/ws-demo/clients/cl-janssens`), seeded from `src/relay/fixtures/demo-workspace.ts`. **Exists.**
  The board is a single column of cards; there is no transcript pane on the left.
- Scene 4 (13th month), 5 (meal vouchers), 7 (vans): `document-freshness` and `document-evidence`
  signals (`src/relay/signals/`). **Exists.** The meal-voucher card shows both arrangements inside
  the freshness signal; there is no separate *Review* button, the summary line carries the ask.
- Scene 6 (Sunday premium contradiction, ask Els): `document-evidence` (LLM, OpenAI with a Google
  fallback) plus `expert-locator` using `Person.topics`; the "Ask Els Peeters" button sits on the
  *shop staff fall under JC 118* card, which is the one the recording clicks. **Exists.**
- Scene 7 (WhatsApp, unsupported): the unsupported verdict and the "Ask Nadia Haddad" action, which
  routes the claim to the person who said it. **Exists.** There is no "capture as a note" action.
- Scene 8: real code (`src/relay/types.ts`, `src/relay/signals/`), typed out as styled cards over a
  faint shot of the board. Aikido screenshots: **pending**. `npm run video:record` and
  `npm run video:render` copy `docs/aikido/before.png` and `after.png` to `public/aikido/` when they
  exist; the composition checks for them at render time and otherwise shows labelled placeholder
  panels ("Audit screenshot: before / after"). Drop the two PNGs in `docs/aikido/` and re-render.
- Scene 9: the review states (*accepted*, *asked*) from `ClaimReview`, set with the Accept / Ask
  buttons on the board, and the Verified client brief page. **Exists.** The recording accepts the
  three confirmed claims and opens the brief; the closing card cuts in at "Find it."
- Footage: `npm run video:record` (needs the production build on port 3002 and
  `RELAY_DEMO_PASSCODE` in `.env.local`) drives the app with Playwright at 125% zoom, with a drawn
  pointer, and writes `public/video/scene-N.mp4` (not committed). It logs in once, resets the demo
  reviews and warms the board (first assessment takes about 10 s) before recording.
  `npm run video:render` produces `out/relay-demo.mp4` (1920×1080, 30 fps, about 2:47).
- Narration: `public/audio/scenes/scene-N.mp3` (George). After a re-voice, update
  `NARRATION_SECONDS` in `DemoVideo.schema.ts` from the ffprobe durations: the scene lengths, the
  music ducking and the recording lengths are all derived from it.

## Recording notes

- Screen at 1920×1080, browser zoom 125% so card text is readable at video scale.
- Record the app walkthrough first, without audio, then generate the voice-over per scene and cut to it. The visuals should follow the voice, not the other way round.
- Keep the cursor slow. Every "Relay shows you" line needs a matching pause on screen.
- Do not show `.env.local`, the terminal with keys, or the Aikido secret.
- Leave 10 seconds of margin under 3:00; the brief says under 3 minutes, and the final upload is final.

## Voice and motion

**Narrator.** One voice for the whole video, calm and clear, no advert energy. The
default in `.env.example` is Rachel, which sounds like a product ad. Shortlist from
the ElevenLabs premade library: **George** (British, warm, documentary; first pick),
**Lily** (British, soft, good for a female narrator), **Alice** (British, clear educator), **Brian** (deep American
narrator), Daniel. Put the API key in `.env.local`, then:

```bash
npm run voice:samples            # lists premade voices, renders scene 1 with the shortlist
npm run voice:samples -- George  # or your own names
```

Listen in `public/audio/samples/`, set `ELEVENLABS_VOICE_ID` to the winner. Keep
`eleven_multilingual_v2`: it pronounces the Dutch names (Bakkerij Janssens, Els Peeters,
Vermeulen) better than the English-only models. Generate one MP3 per scene, not one for
the whole script, so a rewrite of one scene costs one render.

**Motion.** Discrete, and only where it carries meaning:

- Scenes 1, 2 and 9 are Remotion: the existing `PromoVideo` springs (shapes pop in,
  block slides, squiggle draws) are already the right amount. Reuse, do not add.
- Scenes 3 to 8 are a screen recording of the real app, cut to the voice. No zoom
  effects except one slow push-in on the side-by-side evidence in scene 5.
- Three animations inside the app are worth building because they explain the product:
  claim cards appearing one by one as the transcript is read (scene 3), the verdict chip
  and score settling as signals finish (scene 4), and the evidence panel sliding in when a
  card opens (scenes 5 to 7). CSS transitions, 200 to 300 ms, nothing else.
- No particles, camera shake, or transitions between scenes: hard cuts, Memphis style.
  Judges score whether it works and whether it fits the challenge, not the motion design.

**Music.** Yes, but as a bed, not a feature. Rules:

- Instrumental only, no vocals, no recognisable melody that fights the narration.
  Light, playful, a little retro to match the Memphis look: marimba, soft synth, brushed
  drums. Around 100 bpm. Not "corporate inspiration" strings.
- Mixed 18 to 22 dB under the voice, ducked further while the narrator speaks.
- Full volume only on the title cards (scene 1 before the voice starts, scene 9 after it
  ends). Drop it out entirely under scene 6, the contradiction: silence is the emphasis.
- Licensing matters: the video goes on Builderbase and YouTube, so the bed is generated
  with ElevenLabs Music: `npm run music:bed` writes `public/audio/music/bed.mp3` (175 s,
  forced instrumental, prompt in `scripts/music-bed.ts`). Generation is not deterministic;
  re-run for another take, or pass a length and prompt: `npm run music:bed -- 120 "..."`.
