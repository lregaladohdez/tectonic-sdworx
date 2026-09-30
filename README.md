# Relay: trust-verified client handovers

[![Aikido Security](https://app.aikido.dev/assets/badges/label-only-light-theme.svg)](https://app.aikido.dev)
[![Aikido scan](https://github.com/lregaladohdez/tectonic-sdworx/actions/workflows/aikido.yml/badge.svg)](https://github.com/lregaladohdez/tectonic-sdworx/actions/workflows/aikido.yml)
[![CI](https://github.com/lregaladohdez/tectonic-sdworx/actions/workflows/ci.yml/badge.svg)](https://github.com/lregaladohdez/tectonic-sdworx/actions/workflows/ci.yml)

AI video generator built for SD Worx: a Next.js app that writes a script with an LLM,
voices it with ElevenLabs, and renders the video with Remotion.


Built for the SD Worx track of the Tectonic Hackathon (30 Sep 2026): *"Find it. Understand it.
Trust it."* Relay verifies the handover, not the search. When a payroll consultant inherits a
client, the handover is one document and one conversation. Relay extracts every claim from that
conversation, runs each claim through pluggable **trust signals**, and shows the consultant a
claim board where every statement carries its status, its verbatim evidence, and the human
action it needs. Accepted and confirmed claims become the verified client brief.

## What the demo shows

Seeded workspace: a fictional Belgian bakery, five documents, and a scripted handover between
two consultants. Eight claims, four signals, and a planted story:

| Claim | What the signals find |
| --- | --- |
| Meal vouchers are 7 euro | **Contradicted**: the 2026 policy says 8 euro and replaced the 2024 one; the RSZ raised the employer cap on 1 Jan 2026 (source linked) |
| Sunday premium is 50% | **Contradicted**: the client file, §7, says 100% |
| Delivery vans, no benefit in kind | **Outdated**: the only evidence is a 2023 email; the 2026 CO2 reference values changed |
| Wages in JC 118 indexed every January | **Expiring**: no document, but the FPS Employment fiche shows the Jan 2026 indexation; ask Els Peeters |
| Owner prefers WhatsApp | **Unsupported**: tacit knowledge, route to the person who said it |
| 13th month in December, JC 118, holiday fund in May | **Confirmed**, with the exact passage |

Signals are plugins (`src/relay/signals/*`). Adding one is one folder and one import; see
[docs/signals.md](docs/signals.md). Shipped today:

| Signal | Category | What it does |
| --- | --- | --- |
| Document freshness | detect | Deterministic. Superseded, revised, or old evidence → outdated / expiring |
| Document evidence | trust | Retrieves the relevant passages and judges confirm / contradict / unsupported. LLM when available, deterministic judge otherwise; the evidence stays visible either way |
| Regulation watch | detect | Matches each claim's legal anchor (topic, country, joint committee) against a feed of real 2026 Belgian changes with official sources |
| Expert locator | connect | Scores people by topic, document ownership, jurisdiction and authorship; proposes who to ask |

## Run it

```bash
npm install
cp .env.example .env.local     # set SESSION_SECRET and RELAY_DEMO_PASSCODE at minimum
npm run dev                    # http://localhost:3000 → /login
```

Sign in as `incoming@relay.demo` with the passcode from `.env.local`. Without any provider key
the signals run in deterministic mode and the demo works end to end. With `OPENAI_API_KEY`, or
a Google project / Gemini key, the evidence judge, the regulation summaries and the expert
questions use the LLM; if a provider refuses (for example a Vertex model policy) the client
falls back to the next one automatically.

```bash
npm test               # 50 unit tests: kernel, store scoping, session, all four signals
npm run relay:board    # prints the consolidated board without any provider
npm run typecheck && npm run lint && npm run build
```

## Unfinished, on purpose

- Claims are seeded, not extracted live: the transcript-to-claims step is a prompt away but is
  not wired to an upload yet.
- No Teams, SharePoint or HR-system connectors; documents are seeded.
- Single shared demo passcode instead of per-user credentials or SSO.
- In-memory store: reviews reset when the server restarts.
- The Remotion video briefing exists as a composition but is not generated from the brief yet.
- The regulation feed is curated by hand from official pages, not pulled live.

## Stack

| Concern            | Tool                                         | Where                          |
| ------------------ | -------------------------------------------- | ------------------------------ |
| Web app / API      | Next.js 16 (App Router, Turbopack), React 19 | `src/app`                      |
| Styling            | Tailwind CSS v4, SD Worx palette in a Memphis Milano treatment ([docs/STYLE.md](docs/STYLE.md)) | `src/app/globals.css`, `src/components/MemphisShapes.tsx` |
| Video              | Remotion (Studio, Player, server render)     | `src/remotion`, `src/lib/video`|
| Voices             | ElevenLabs                                   | `src/lib/ai/elevenlabs.ts`     |
| Scripts / LLM      | OpenAI (Responses API), Google Gemini/Vertex | `src/lib/ai/openai.ts`, `google.ts` |
| Env validation     | zod                                          | `src/lib/env.ts`               |

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the keys you have
npm run dev                  # http://localhost:3000
npm run remotion:studio      # Remotion Studio for the video compositions
```

Google: set `GOOGLE_API_KEY` for the Gemini API, **or** `GOOGLE_CLOUD_PROJECT` to bill
against Google Cloud credits through Vertex AI (run `gcloud auth application-default login`
first). If both are set, Vertex wins.

## Scripts

| Command                   | What it does                                        |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Next dev server                                     |
| `npm run build` / `start` | Production build / serve                            |
| `npm run typecheck`       | `tsc --noEmit`                                      |
| `npm run lint`            | ESLint                                              |
| `npm run remotion:studio` | Open Remotion Studio                                |
| `npm run remotion:render` | Render `PromoVideo` to `out/PromoVideo.mp4`         |

## API routes

| Route              | Body                                  | Result                                  |
| ------------------ | ------------------------------------- | --------------------------------------- |
| `POST /api/script` | `{ topic, provider?: "openai"|"google" }` | `{ script }`                        |
| `POST /api/tts`    | `{ text, voiceId? }`                  | `{ url, publicPath }` MP3 under `public/audio` |
| `POST /api/render` | `{ title, subtitle, voiceOver? }`     | `{ outputPath }` MP4 under `out/`       |

Typical flow: script → tts (gives `publicPath`) → render with `voiceOver: publicPath`.

## Video

Compositions live in `src/remotion/compositions`. They can use Tailwind classes, including
the `brand-*` palette, thanks to `@remotion/tailwind-v4`. Register new compositions in
`src/remotion/Root.tsx`. The `PromoVideo` composition takes a `voiceOver` path and plays it
with Remotion's `<Audio>`.

## Security

Security is part of the grade, so it is part of the workflow. Aikido scans every push and PR
and blocks on HIGH+ findings, CI runs `npm audit`, Dependabot keeps dependencies fresh, and
all provider keys stay server-side in `.env.local`. Details and rules in [SECURITY.md](SECURITY.md).

To activate Aikido on a fresh fork: connect the repo at app.aikido.dev, create a CI secret
key under Integrations → Continuous Integration, and store it as the `AIKIDO_SECRET_KEY`
repository secret.
