# Security

Security is a graded part of this project. Keep these rules when contributing.

## Threat model in one paragraph

Relay holds client payroll knowledge for a team of consultants. The assets are the
documents, the extracted claims, and the review decisions. The main risks are another
tenant reading them, an anonymous caller spending provider credits, and a forged request
acting as a signed-in user. Everything below exists to close those three.

## Controls that exist in the code

| Control | Where |
| --- | --- |
| Session: HMAC-SHA256 signed cookie, `httpOnly`, `SameSite=Lax`, `Secure` in production, 8 h expiry, constant-time verification; sign-out revokes the token server-side | `src/lib/auth/session.ts`, `src/app/api/auth/logout/route.ts` |
| Login: seeded users + shared passcode compared in constant time, 5 attempts per IP per minute (IP taken from the proxy-appended end of `X-Forwarded-For`), generic error for unknown user and wrong passcode | `src/app/api/auth/login/route.ts`, `src/lib/http/guards.ts` |
| Workspace scoping: every store read takes a workspace id; a record from another workspace is not found even with its id | `src/relay/store.ts` |
| Membership: pages redirect to login without a session and 404 for non-members; API routes return 401 / 404 the same way | `src/lib/auth/access.ts` |
| CSRF: every state-changing route checks that the Origin host equals the request host | `src/lib/http/guards.ts` |
| Input validation: JSON bodies capped at 16 KB before parsing, zod on every route body, length caps on text sent to providers and on video props | `src/lib/http/guards.ts`, each `route.ts` |
| Rate limits per user on provider routes (script, tts, render) and on reviews; the limiter keeps at most 10 000 keys | `src/lib/http/guards.ts`, `src/lib/rate-limit.ts` |
| Provider keys: server-only modules, never `NEXT_PUBLIC_`, loaded through a validated env schema | `src/lib/env.ts`, `src/lib/ai/*` |
| Generated audio is streamed back to the caller, never written under `public/` | `src/app/api/tts/route.ts` |
| Security headers: per-request CSP with a script nonce and `strict-dynamic` (no `unsafe-inline` for scripts), HSTS (2 years, production only), `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policy, no `X-Powered-By` | `src/proxy.ts`, `next.config.ts` |
| Errors: `AccessError` maps to 401/404, anything else is logged server-side and answered with a generic 500 | `src/lib/http/guards.ts` |
| Dependencies: Aikido GitHub App check on every PR, `npm audit --audit-level=high` in the pipeline, Dependabot weekly; deploys only run after the pipeline passes | `.github/workflows/pipeline.yml` |

Verified by hand with curl on 2026-09-30: unauthenticated board → 307 to login; cross-origin
login → 401; wrong passcode → 401; member reading another workspace → 404; review on another
workspace's claim → 404; review naming a person from another workspace → 404; sixth failed
login in a minute → 429. Unit tests cover the session token, the scoped store and the
consolidation logic (`npm test`).

## Known gaps (hackathon scope)

- Single shared passcode for the demo users instead of per-user credentials or SSO.
- In-memory store, rate limiter and sign-out list: one process, state resets on restart. On
  Cloud Run each instance keeps its own counters, so with `--max-instances=3` the effective
  login limit is up to 15 attempts per IP per minute, still far too slow for guessing a random
  passcode, and a signed-out token is only refused by the instance that saw the sign-out (it
  expires everywhere within 8 h).
- The Cloud Run demo is reachable by anyone (`allUsers` invoker); the app's own login is the
  only gate.
- The Remotion render route writes MP4 files to the server's `out/` directory; they are not
  served, but they are not cleaned up either.
- `style-src` allows `'unsafe-inline'`: React `style={{...}}` attributes (the score bars on the
  claim cards, the Remotion player) cannot carry a nonce, and without `unsafe-inline` the browser
  drops them. With scripts locked to a nonce, injected CSS cannot run code or read data, so this is
  accepted. `script-src` is nonce-based, see the hardening pass below.

## Hardening pass before the Aikido audit (30 Sep 2026)

A second pass on branch `feat/security-hardening`, done the way the AI Code Audit reasons:
authentication, authorisation, injection, headers, secrets, dependencies, error handling.
Every item was checked by reading the code and, where it matters, with curl and a headless
Chrome run against a production build (`next build && next start`).

### Aikido baseline findings and what closed them

| # | Finding | Fix |
| --- | --- | --- |
| 1 | Next.js critical (code injection), dependency | `next` and `eslint-config-next` 16.3.6 -> **16.3.8** (released 30 Sep 2026), which also carries GHSA-cjq9-62q9-8jv4 (high, SSRF in image optimisation) and the SSG/ISR cache-poisoning fixes for self-hosted apps. Installed with `--min-release-age=0` because the release was hours old; same reasoning as the earlier 16.3.6 bump. |
| 2 | HSTS missing on the live URL | Already in `next.config.ts` for production; confirmed sent by `NODE_ENV=production next start` (`Strict-Transport-Security: max-age=63072000; includeSubDomains`). The Dockerfile sets `NODE_ENV=production`. |
| 3 | CSP allows inline JavaScript | `src/proxy.ts` generates a nonce per request and sets `script-src 'self' 'nonce-…' 'strict-dynamic'`; Next stamps the nonce on every script it emits. `'unsafe-inline'` is gone from `script-src`. The root layout is `force-dynamic` so the 404 page is rendered per request as well (a prerendered page has no nonce). Verified in headless Chrome: login, board, the Accept action, the brief and the 404 page load without a CSP violation. |
| 4 | `ws` high (DoS) | Override `ws@8` -> 8.21.3 (8.21.1 tightened the fragment defaults from GHSA-96hv-2xvq-fx4p). |
| 5 | `X-Powered-By` | `poweredByHeader: false`. |
| 6 | `zod` low (prototype pollution) | Remotion pinned a second copy at 4.4.3; override `zod: "$zod"` dedupes everything to the app's 4.6.5. |
| 7 | `protobufjs` low (DoS) | Override `protobufjs@7` -> 8.8.0 (`@google/genai` only uses `protobufjs/minimal`; import verified). |
| 8 | `actions/checkout` persists credentials | `persist-credentials: false` on both checkout steps in `pipeline.yml`. |
| 9 | CSP allows inline CSS | Accepted, see "Known gaps": style attributes cannot take a nonce. |

`npm audit --audit-level=moderate`: 0 vulnerabilities after the changes.

### Found in the pass and fixed

- **Sign-out did not invalidate the token** (`src/app/api/auth/logout/route.ts`): the cookie was
  cleared but a copied token stayed valid for up to 8 h. Logout now records the token's signature
  in an in-process revocation list (`revokeSessionToken` in `src/lib/auth/session.ts`) that
  `verifySessionToken` checks. Only tokens that verify are recorded, entries expire with the
  token, and the list lives on `globalThis` because Next bundles routes separately. Unit-tested;
  verified with curl (old cookie after sign-out -> 307 to login).
- **Login rate limit could be bypassed by spoofing `X-Forwarded-For`**
  (`src/lib/http/guards.ts`): the first entry of the header was used, which is whatever the client
  sends. Cloud Run's front end appends the real address as the last entry, so that is now used.
  Verified: six attempts with different fake first entries -> 429 on the sixth. Unit-tested.
- **Unbounded rate-limiter map** (`src/lib/rate-limit.ts`): anonymous callers could create one
  bucket per spoofed address for as long as the process lived. Capped at 10 000 keys; expired
  buckets are dropped first. Unit-tested.
- **No request-body size cap**: routes called `request.json()` on whatever arrived. `readJson` now
  refuses bodies over 16 KB (declared or measured) before parsing. Verified: 20 KB login body -> 400.
- **Malformed `Origin` crashed the CSRF check**: `new URL("null")` threw and surfaced as a 500.
  Now 401 like any other cross-origin request. Unit-tested.
- **Unknown errors were rethrown to the framework**: `errorResponse` now logs the error name and
  message on the server and answers `{"error":"Something went wrong"}` with 500, so provider
  failures and paths never reach a client in any environment.
- **Video props had no length caps** (`PromoVideo.schema.ts`): `title` <= 80, `subtitle` <= 160,
  `voiceOver` <= 64 characters. Verified: 500-character title -> 400.
- **Logout cookie lacked `Secure`** in production; added for symmetry with login.

### Checked and found fine

- Session token: HMAC-SHA256 over the payload, `timingSafeEqual` on the signature, expiry
  enforced server-side, tampered payload and wrong secret rejected (tests in `session.test.ts`).
- Login: passcode compared with `timingSafeEqual` after the user lookup, so unknown user and wrong
  passcode take the same path and return the same "Invalid credentials"; 503 when not configured.
- Authorisation: every page calls `requireWorkspacePage` and every workspace route
  `requireWorkspaceMember`; every store read takes the workspace id. Verified: member on another
  workspace -> 404, review on another workspace's claim -> 404, review naming a person from another
  workspace -> 404, valid cookie with a foreign `Origin` -> 401, GET on the review route -> 405.
- 404 vs 403: non-members always get 404, so workspace and claim ids are never confirmed.
- Provider routes (`/api/script`, `/api/tts`, `/api/render`): session required, per-user limits
  (10, 5, 2 per minute), same-origin check, zod with caps (topic 500, text 2000 characters).
- File names: `/api/render` writes `out/PromoVideo-<userId>.mp4` where the id comes from the
  store, never the request; `voiceOver` must match `^audio/[a-f0-9]{16}\.mp3$`
  (`../../etc/passwd` -> 400). Nothing is written under `public/` at request time.
- Shell and path injection: Remotion renders through headless Chrome, no shell; inputs only reach
  React props.
- LLM prompts: the only user-controlled text that reaches a prompt is the 500-character
  `topic` of `/api/script`; signal prompts are built from seeded documents and claims. LLM output is
  parsed with zod (`generateJson`) or truncated to one line, and is never used as a path, URL or
  command; the only links rendered come from the static regulation feed.
- No `dangerouslySetInnerHTML`; React escapes every value rendered.
- Open redirects: the post-login destination is the workspace id returned by the server, never a
  query parameter.
- Secrets: no `NEXT_PUBLIC_` variable exists; `.env*` is ignored by git, Docker and gcloud;
  `git log -p --all -S` for key prefixes (`sk-`, `AIza`, `SESSION_SECRET=`, …) only hits
  `ask-expert`, the audit checklist and the empty template. Keys are read through the validated env
  schema in server-only modules.
- Container: runs as `node`, no secrets in the image; Cloud Run secrets come from Secret Manager.
- Pipeline: `permissions: contents: read`, keyless Workload Identity Federation, no stored keys.
- Logging: only provider error messages (truncated) and signal names are logged; no tokens, no PII.
- Caching: authenticated pages are served with `Cache-Control: private, no-cache, no-store`; TTS
  audio with `private, no-store`.
- Memory growth: the assessment cache and the review map are keyed by records that must exist in
  the caller's workspace, so they are bounded by the seeded data.
- Methods: every API route exports only `POST`.
- `npm audit --audit-level=high` and `--audit-level=moderate`: clean.

### Deliberately left alone

- Shared demo passcode and in-memory state: hackathon scope, see "Known gaps".
- `__Host-` cookie prefix: requires `Secure`, which would break local `http://` development.
- GitHub Actions pinned to major tags, not SHAs: Dependabot keeps them current; SHA pinning is a
  reasonable follow-up.
- `style-src 'unsafe-inline'`: see "Known gaps".

## Aikido process for the grade

1. Sign in at the hackathon link from the brief with "Continue with GitHub", connect this repo.
2. Run the AI Code Audit once as the baseline and screenshot it.
3. Fix or document each finding, mark it resolved, re-run, screenshot again.
4. Keep both screenshots for the Builderbase submission.

### Aikido AI Code Audit

The AI Code Audit is Aikido's AI pentest: it reads the repository and reasons about
authentication, authorisation, IDOR and business logic, not just dependencies. It is
separate from the GitHub App check that runs on pull requests, and only the account owner
can start it from the Aikido web UI. The security grade (10%) is based on the issues that
remain after it.

The baseline run is taken on `main` at the commit intended for submission, on or just after
30 Sep 2026, before any fixes prompted by the audit. Its screenshot is saved as
`docs/aikido/before.png`. Each finding is then fixed, or documented under "Known gaps" above
when it is accepted hackathon scope, and marked resolved in Aikido. The audit is re-run on
the fixed commit and that screenshot is saved as `docs/aikido/after.png`. Both are added by
hand and committed before the Builderbase form is submitted; the step-by-step instructions
are in [docs/aikido/README.md](docs/aikido/README.md).

## Dependency overrides

`package.json` carries `overrides` that pin transitive packages to patched releases:

| Override | Pulled in by | Fixes |
| --- | --- | --- |
| `brace-expansion@1` -> `1.1.21` | `eslint` -> `minimatch@3` | HIGH advisory in `<=1.1.20` |
| `brace-expansion@5` -> `5.0.12` | `typescript-eslint` -> `minimatch@10` | HIGH advisory in `5.0.0-5.0.11` |
| `fast-uri@3` -> `3.1.8` | `@remotion/bundler` -> `webpack` -> `schema-utils` -> `ajv` | HIGH advisory in `3.0.0-3.1.7` |
| `ws@8` -> `8.21.3` | `@elevenlabs/elevenlabs-js`, `@google/genai`, `@remotion/renderer`, `openai` | Aikido HIGH (DoS); 8.21.1+ tightened the fragment defaults after GHSA-96hv-2xvq-fx4p |
| `protobufjs@7` -> `8.8.0` | `@google/genai` (only `protobufjs/minimal`) | Aikido LOW (DoS via option parsing) |
| `zod` -> `$zod` (the app's own range) | `@remotion/studio` pins `4.4.3` | Aikido LOW (prototype pollution); one deduped copy at 4.6.5 |

They exist because the maintainers' npm config sets `min-release-age = 30` (a supply-chain
guard that refuses packages published less than 30 days ago), and the patched versions were
published on 2026-09-14/15. Until that window closes `npm audit fix` cannot pick them up, so
they are pinned explicitly and the lockfile was refreshed once with
`npm install --min-release-age=15`. CI runners have no release-age guard, so `npm ci` from
the lockfile works there unchanged.

After **2026-10-15** the overrides can be removed: run `npm audit fix` (or a normal
`npm update`), confirm `npm ls brace-expansion fast-uri` still shows patched versions, and
delete the `overrides` block.

For the same reason `next` and `eslint-config-next` were moved to `16.3.6` on 2026-09-30
with `npm install --min-release-age=7`: [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)
(critical, RCE in `next/og`, affects `>=16.2.0 <16.3.6`) was published that day. The app
does not use `next/og`, but the audit gate blocks on it regardless. 16.3.6 is the oldest
patched release, so it was the smallest possible relaxation of the guard. The same day,
`next` 16.3.8 shipped with further fixes (SSRF in image optimisation, SSG/ISR cache poisoning
for self-hosted apps), so the hardening pass moved to it with `npm install --min-release-age=0`;
the `ws`, `protobufjs` and `zod` overrides above were added in that install. After 2026-10-30
the guard covers all of them and a normal `npm update` can take over.

## Reporting

Open a GitHub issue labelled `security`, or contact the maintainers directly for anything
sensitive.
