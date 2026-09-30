# Builderbase submission sheet

Copy-paste source for the Builderbase form. Tectonic Hackathon, SD Worx track, 30 Sep 2026.
Replace `VIDEO_URL_TBD` with the YouTube link once the video is uploaded.

## Project name

Relay

## Tagline

Hand over a client. Keep the trust.

## Short description

Relay verifies the handover, not the search. When a payroll consultant inherits a client,
the handover is one call and one document, and some of what they hear is outdated or wrong.
Relay turns the handover call into a list of claims and runs each claim through pluggable
trust signals: document evidence, document freshness, regulation watch and an expert
locator. The claim board shows every claim with its verdict (confirmed, contradicted,
outdated, expiring or unsupported), the verbatim passage or regulation behind it, and the
colleague to ask. Nothing is hidden: every verdict links to its evidence. Accepted claims
become the verified client brief. Built for the SD Worx track: find it, understand it,
trust it.

## Longer description

The challenge asks how fragmented organisational knowledge can become a trusted shared
resource, with one role, one workflow and one trust signal. Relay picks the incoming
payroll consultant, the client handover, and a verdict with evidence on every claim the
outgoing colleague made.

A handover call is transcribed and split into claims: "meal vouchers are 7 euro", "Sunday
premium is 50%", "the owner prefers WhatsApp". Each claim goes through four trust signals
that run in parallel. Document evidence retrieves the relevant passages from the client's
own file, policies and emails and judges whether they confirm or contradict the claim.
Document freshness is deterministic and flags evidence that is superseded, revised or old.
Regulation watch matches the claim's legal anchor (topic, country, joint committee) against
a curated feed of real 2026 Belgian changes with official sources. The expert locator scores
colleagues by topic, ownership and jurisdiction and proposes who to ask. The
results are consolidated with a fixed precedence (contradicted, outdated, expiring,
unsupported, confirmed) into one verdict per claim.

"Detect" on screen: the 2024 meal voucher arrangement next to the 2026 one that replaced
it; a 2023 email about delivery vans marked outdated because the CO2 reference values
changed; the Sunday premium quote against company agreement paragraph 7, which says 100%.
"Connect" is the ask button: the card names Els Peeters, the team's JC 118 expert, and one
click marks the claim as asked to her, with both excerpts kept on the card. Tacit knowledge with no document behind it
is marked unsupported and routed to the person who said it.

The evidence is always visible because the signal contract requires it. A result carries the
exact excerpt it relied on, with document id and date, and the board prints it verbatim
next to the verdict. Without an LLM key the signals run deterministically and the
demo still works; with a key the evidence judge reads the passages and shows its reasoning.
The consultant accepts, resolves or asks, and the accepted claims form the verified brief.

The demo workspace has three fictional Belgian clients, sixteen documents, five colleagues
and nineteen claims. Every read is scoped to the caller's workspace and to the claim's own
client.

## How to run it

1. `npm install` (Node 22 or newer).
2. `cp .env.example .env.local`, then set `SESSION_SECRET` (`openssl rand -hex 32`) and `RELAY_DEMO_PASSCODE`.
3. `npm run dev` and open <http://localhost:3000>; sign in as `incoming@relay.demo` with the passcode.
4. Provider keys are optional: without them the signals run deterministically; with `OPENAI_API_KEY` or `GOOGLE_API_KEY` the evidence judge uses the LLM.
5. `npm test` runs the 59 unit tests; `npm run relay:board -- --all` prints the boards in the terminal.

Or use the live demo: <https://tectonic-sdworx-970554784378.europe-west1.run.app>, same
login. The passcode is shared with the jury separately and is not in the repository.

## What is unfinished

- Claims are seeded, not extracted live: the transcript-to-claims step is a prompt away but
  is not wired to an upload yet.
- No Teams, SharePoint or HR-system connectors; the sixteen documents are seeded.
- The regulation feed is curated by hand from official pages, not pulled live.
- Single shared demo passcode instead of per-user credentials or SSO.
- In-memory store and rate limiter: reviews reset when the server restarts, and it is one
  process.
- The Remotion briefing exists as a composition but is not generated from the verified
  brief yet.
- Rendered videos are written to the container's ephemeral disk and are not downloadable.

## Links

| What | Where |
| --- | --- |
| Public repository | <https://github.com/lregaladohdez/tectonic-sdworx> |
| Live demo (Cloud Run, europe-west1) | <https://tectonic-sdworx-970554784378.europe-west1.run.app> |
| Demo video (under 3 minutes) | VIDEO_URL_TBD |
| README | [README.md](../README.md) |
| Security controls and known gaps | [SECURITY.md](../SECURITY.md) |
| How the signals work | [signals.md](signals.md) |
| Video script | [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md) |

Demo logins: `incoming@relay.demo` (Jonas, the incoming consultant), `nadia@relay.demo`
(same workspace) and `outsider@relay.demo` (another workspace, shows the scoping).

## Aikido AI Code Audit

Both screenshots are added by hand after the audit runs; the steps are in
[aikido/README.md](aikido/README.md). Until then these two links point at files that do
not exist yet.

- Before: [docs/aikido/before.png](aikido/before.png)
- After: [docs/aikido/after.png](aikido/after.png)

## Pre-submission checklist

- [ ] Demo video is under 3:00, uploaded, and the link replaces every `VIDEO_URL_TBD` (`grep -r VIDEO_URL_TBD .`).
- [ ] `docs/aikido/before.png` and `docs/aikido/after.png` are committed and show the repo name and the findings.
- [ ] Aikido findings are fixed or documented and marked resolved; the after run is the latest run.
- [ ] README.md is current: run commands, counts, links, unfinished list.
- [ ] No keys in the repo: `git grep -nE "(sk-[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,})"` returns nothing and `.env.local` is untracked.
- [ ] Pipeline is green on `main` (Actions tab).
- [ ] Cloud Run URL redirects `/` to `/login` and the demo login works.
- [ ] Builderbase form filled with the texts above; the repository is public.
- [ ] No code changes after submitting. Final means final.
