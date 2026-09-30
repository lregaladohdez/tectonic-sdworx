# Relay: trust-verified client handovers

[![Aikido Security](https://app.aikido.dev/assets/badges/label-only-light-theme.svg)](https://app.aikido.dev)
[![Pipeline](https://github.com/lregaladohdez/tectonic-sdworx/actions/workflows/pipeline.yml/badge.svg)](https://github.com/lregaladohdez/tectonic-sdworx/actions/workflows/pipeline.yml)

Built for the SD Worx track of the Tectonic Hackathon (30 Sep 2026): *"Find it. Understand
it. Trust it."* **Relay verifies the handover, not the search.**

When a payroll consultant inherits a client, the handover is one document and one
conversation. Some of what they hear is tacit, some is outdated, some is wrong, and they
cannot tell which until a payslip fails. Relay turns the handover into a list of **claims**,
runs every claim through pluggable **trust signals**, and shows the consultant a **claim
board** where each statement carries its verdict, the verbatim evidence behind it, and the
human action it needs. Nothing is hidden behind a black box: every verdict links to a
passage, a regulation or a person. Accepted claims become the **verified client brief**.

## What the demo shows

A seeded workspace: a fictional Belgian bakery (Bakkerij Janssens BV, joint committee 118),
five documents, three colleagues, and a scripted handover call between the outgoing
consultant Nadia and the incoming consultant Jonas. Eight claims, four signals, and a
planted story:

| Claim                                         | What the signals find                                                                                                             |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Meal vouchers are 7 euro                      | **Contradicted**: the 2026 arrangement says 8 euro and replaced the 2024 one; the RSZ raised the employer cap on 1 Jan 2026 (source linked) |
| Sunday premium is 50%                         | **Contradicted**: the client file, company agreement §7, says 100%                                                                |
| Delivery vans, no benefit in kind             | **Outdated**: the only evidence is an email from May 2023; the 2026 CO2 reference values changed                                  |
| Wages in JC 118 indexed every January         | **Expiring**: no document covers it, but the FPS Employment fiche shows the Jan 2026 indexation; ask Els Peeters                  |
| Owner prefers WhatsApp                        | **Unsupported**: tacit knowledge; route it to Nadia, who said it                                                                   |
| 13th month in December, JC 118, holiday in May | **Confirmed**, with the exact passage                                                                                             |

Those are the verdicts of the deterministic judge (`npm run relay:board`). With an LLM
key the evidence judge reads the passages instead of matching values, and it is stricter:
the "shop staff under JC 118" claim becomes *unsupported* because the client file only
names blue-collar and office staff, and the indexation claim becomes *confirmed* because
regulation watch judges the FPS fiche as supporting it. Both readings are shown with their
reasoning, which is the point.

For each claim the consultant can **accept** it, mark it **resolved**, or **ask** the
proposed expert; the brief page collects the accepted claims.

## How it works

```
handover transcript ──▶ claims ──▶ [ signal, signal, signal, signal ] ──▶ consolidate ──▶ claim board ──▶ review ──▶ brief
                                       run in parallel, each returns              precedence: contradicted > outdated >
                                       verdict + confidence + evidence            expiring > unsupported > confirmed
```

The kernel (`src/relay`) knows nothing about payroll: types, a registry, a scoped store,
consolidation and the seeded fixtures. Signals are plugins under `src/relay/signals/*`.
Adding one is one folder and one import; see [docs/signals.md](docs/signals.md).

| Signal             | Category | What it does                                                                                                                                                                              |
|--------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Document evidence  | trust    | Retrieves the relevant passages and judges confirm / contradict / unsupported. LLM when a key is present, deterministic value matching otherwise; the evidence stays visible either way |
| Document freshness | detect   | Deterministic, no model. Superseded, revised or old evidence → outdated / expiring                                                                                                        |
| Regulation watch   | detect   | Matches each claim's legal anchor (topic, country, joint committee) against a curated feed of real 2026 Belgian changes with official sources; an LLM judges whether the change contradicts or supports the claim |
| Expert locator     | connect  | Scores people by topic, document ownership, jurisdiction and authorship; proposes who to ask                                                                                              |

## Run it

Node 22 or newer.

```bash
npm install
cp .env.example .env.local     # set SESSION_SECRET (openssl rand -hex 32) and RELAY_DEMO_PASSCODE
npm run dev                    # http://localhost:3000 → /login
```

Sign in as `incoming@relay.demo` (Jonas) with the passcode from `.env.local`. Other seeded
users: `nadia@relay.demo` (same workspace) and `outsider@relay.demo` (another workspace, to
see the scoping in action).

**Providers are optional.** Without any key the signals run in deterministic mode and the
demo works end to end; the board header says *offline*. With `OPENAI_API_KEY`, or a Gemini
key (`GOOGLE_API_KEY`) or a Google Cloud project (`GOOGLE_CLOUD_PROJECT`), the evidence
judge, the regulation summaries and the expert questions use the LLM. `LLM_PROVIDER` picks
which one is tried first; if a provider refuses (for example a Vertex model policy) the
client falls back to the other one. A live board takes about 6 to 9 seconds and is cached
per process for five minutes. `ELEVENLABS_API_KEY` is only needed for the voice tooling.

```bash
npm test                        # 55 unit tests: kernel, consolidation, scoped store, session, all four signals
npm run relay:board             # prints the consolidated board with the deterministic judge
npm run relay:board -- --live   # same, with the providers from .env.local
npm run typecheck && npm run lint && npm run build
```

## Where things are

| Path                                          | What                                                                             |
|-----------------------------------------------|----------------------------------------------------------------------------------|
| `src/relay/`                                  | Kernel: `types.ts` (the `TrustSignal` contract), `registry.ts`, `consolidate.ts`, `store.ts`, `assess.ts`, `fixtures/` |
| `src/relay/signals/*`                         | The four signals, each with its tests                                            |
| `src/app/w/[workspaceId]/clients/[clientId]/` | Claim board page and `brief/` (verified brief)                                   |
| `src/app/api/w/[workspaceId]/claims/[claimId]/review/` | The review endpoint (accept / resolve / ask)                            |
| `src/lib/auth/`, `src/lib/http/guards.ts`     | Signed session cookie, workspace membership, same-origin check, rate limits      |
| `src/lib/ai/`                                 | OpenAI, Google (Gemini API or Vertex), ElevenLabs clients; `llm.ts` picks and falls back |
| `src/components/relay/`                       | Claim card, status badge, actions, shell, login form                             |
| `src/remotion/`, `scripts/voice-*.ts`, `scripts/music-bed.ts` | Demo video tooling (title cards, per-scene voice-over, music bed) |
| `docs/`                                       | [signals.md](docs/signals.md), [STYLE.md](docs/STYLE.md), [VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md) |

## API

All routes validate their body with zod. State-changing routes require a session, check
that the request `Origin` matches the host, and are rate limited per user.

| Route                                                | Body                                         | Result                                                        |
|------------------------------------------------------|----------------------------------------------|---------------------------------------------------------------|
| `POST /api/auth/login`                               | `{ email, passcode }`                        | Sets the session cookie; `{ ok, workspaceId }`                |
| `POST /api/auth/logout`                              |                                              | Clears the cookie                                             |
| `POST /api/w/:workspaceId/claims/:claimId/review`    | `{ status: open\|accepted\|resolved\|asked, note?, personId? }` | The stored review; 404 for a claim or person outside the caller's workspace |
| `POST /api/script`                                   | `{ topic, provider?: "openai"\|"google" }`   | `{ script, provider }` (video tooling)                        |
| `POST /api/tts`                                      | `{ text, voiceId? }`                         | `audio/mpeg` stream, never written to disk (video tooling)    |
| `POST /api/render`                                   | `{ title, subtitle, voiceOver? }`            | `{ fileName }` MP4 under `out/` (video tooling)               |

## Security

Security is part of the grade, so it is part of the workflow. Signed `httpOnly` session
cookie with constant-time verification, seeded users behind a passcode with login rate
limiting, every store read scoped by workspace id (a record from another workspace is *not
found*, even with its id), same-origin checks on mutations, zod on every input, provider
keys in server-only modules loaded through a validated env schema, CSP and the usual
headers. The Aikido GitHub App checks every PR and blocks on HIGH+ findings, the pipeline
runs `npm audit` and only deploys when the tests pass, and Dependabot keeps dependencies
fresh. The controls, how they were verified, and the known gaps are in
[SECURITY.md](SECURITY.md).

To activate Aikido on a fresh fork: connect the repo at app.aikido.dev (this installs the
PR check App). Do not add Aikido's GitHub Action on top; Aikido rejects it on a repo the App
already protects.

## Deploy (Google Cloud Run)

Current deployment: <https://tectonic-sdworx-970554784378.europe-west1.run.app>

The app ships as one container ([Dockerfile](Dockerfile)) that runs `next start` and can
render videos server-side with Remotion's headless Chrome. Every push to `main` runs
[pipeline.yml](.github/workflows/pipeline.yml): tests, then a Cloud Build and a Cloud Run
deploy in `europe-west1` through keyless Workload Identity Federation
(`scripts/gcp/setup-github-deploy.sh` creates the pool, provider and service account once),
then a smoke test of `/` and `/login`.

To do the same by hand:

```bash
PROJECT=qwiklabs-gcp-02-8ec6a39cdba0
REGION=europe-west1
IMAGE=$REGION-docker.pkg.dev/$PROJECT/apps/tectonic-sdworx:$(git rev-parse --short HEAD)

gcloud auth login && gcloud config set project $PROJECT
gcloud artifacts repositories create apps --repository-format=docker --location=$REGION  # once
gcloud builds submit --region=$REGION --tag $IMAGE --timeout=1500 .
gcloud run deploy tectonic-sdworx --region=$REGION --image=$IMAGE \
  --no-allow-unauthenticated --memory=4Gi --cpu=2 --timeout=600 --concurrency=4
```

A fresh deploy starts private: only Google identities with `roles/run.invoker` can call it
(test with `curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" <url>`).
The demo deployment above is **public**, opened once with:

```bash
gcloud run services add-iam-policy-binding tectonic-sdworx --region=$REGION \
  --member=allUsers --role=roles/run.invoker
```

Why public is acceptable here: the anonymous surface is the landing redirect, the login page
and the login endpoint. Everything else needs the signed session cookie: pages redirect to
`/login`, every API route answers 401 without a session and 401 to cross-origin POSTs, the
provider routes (script, tts, render) are rate-limited per user, login is limited to 5
attempts per IP per minute with constant-time passcode comparison, and the container runs as
a non-root user with CSP, HSTS, `X-Frame-Options: DENY` and `nosniff` on every response. Verified
against the public URL on 30 Sep 2026 (see [SECURITY.md](SECURITY.md)). Spend is capped by
`--max-instances=3`; the pipeline never changes the invoker binding, so a redeploy keeps it.
To close it again, run the same command with `remove-iam-policy-binding`.

Secrets never go in the image, the repo, or plain env vars. Login needs `SESSION_SECRET`
and `RELAY_DEMO_PASSCODE`; the providers need their keys. Put them in Secret Manager and
bind them to the service (the runtime service account needs
`roles/secretmanager.secretAccessor`):

```bash
for pair in SESSION_SECRET:session-secret RELAY_DEMO_PASSCODE:relay-demo-passcode \
            ELEVENLABS_API_KEY:elevenlabs-api-key OPENAI_API_KEY:openai-api-key \
            GOOGLE_API_KEY:google-api-key; do
  var=${pair%%:*}; name=${pair##*:}
  val=$(grep -E "^$var=." .env.local | tail -1 | cut -d= -f2-)
  [ -z "$val" ] && continue
  if gcloud secrets describe $name >/dev/null 2>&1; then
    printf '%s' "$val" | gcloud secrets versions add $name --data-file=-
  else
    printf '%s' "$val" | gcloud secrets create $name --data-file=-
  fi
done
gcloud run services update tectonic-sdworx --region=$REGION \
  --update-secrets=SESSION_SECRET=session-secret:latest,RELAY_DEMO_PASSCODE=relay-demo-passcode:latest,OPENAI_API_KEY=openai-api-key:latest
```

Caveat: the hackathon Qwiklabs project carries an org policy
(`constraints/vertexai.allowedModels` = deny all) that blocks every Gemini model on Vertex,
so on this project use OpenAI or a Gemini API key. The fallback in `src/lib/ai/llm.ts`
handles the refusal automatically.

## Demo video tooling

The submission video is scripted in [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md). With
`ELEVENLABS_API_KEY` set:

| Command                     | What it does                                                               |
|-----------------------------|----------------------------------------------------------------------------|
| `npm run voice:samples`     | Renders scene 1 with a shortlist of narrator voices into `public/audio/samples/` |
| `npm run voice:scenes`      | One MP3 per scene from the script table, with measured durations           |
| `npm run music:bed`         | Generates the instrumental bed with ElevenLabs Music                       |
| `npm run remotion:studio`   | Remotion Studio for the title cards (`PromoVideo` composition)             |
| `npm run remotion:render`   | Renders `PromoVideo` to `out/PromoVideo.mp4`                               |

## Unfinished, on purpose

- Claims are seeded, not extracted live: the transcript-to-claims step is a prompt away
  but is not wired to an upload yet.
- No Teams, SharePoint or HR-system connectors; the five documents are seeded.
- The regulation feed is curated by hand from official pages, not pulled live.
- Single shared demo passcode instead of per-user credentials or SSO.
- In-memory store and rate limiter: reviews reset when the server restarts, and it is one
  process.
- The Remotion briefing exists as a composition but is not generated from the verified
  brief yet.
- Rendered videos are written to the container's ephemeral disk and are not downloadable.
