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
| Session: HMAC-SHA256 signed cookie, `httpOnly`, `SameSite=Lax`, `Secure` in production, 8 h expiry, constant-time verification | `src/lib/auth/session.ts` |
| Login: seeded users + shared passcode compared in constant time, 5 attempts per IP per minute, generic error for unknown user and wrong passcode | `src/app/api/auth/login/route.ts` |
| Workspace scoping: every store read takes a workspace id; a record from another workspace is not found even with its id | `src/relay/store.ts` |
| Membership: pages redirect to login without a session and 404 for non-members; API routes return 401 / 404 the same way | `src/lib/auth/access.ts` |
| CSRF: every state-changing route checks that the Origin host equals the request host | `src/lib/http/guards.ts` |
| Input validation: zod on every route body, length caps on text sent to providers | each `route.ts` |
| Rate limits per user on provider routes (script, tts, render) and on reviews | `src/lib/http/guards.ts` |
| Provider keys: server-only modules, never `NEXT_PUBLIC_`, loaded through a validated env schema | `src/lib/env.ts`, `src/lib/ai/*` |
| Generated audio is streamed back to the caller, never written under `public/` | `src/app/api/tts/route.ts` |
| Security headers: CSP, HSTS (2 years, production only), `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policy | `next.config.ts` |
| Dependencies: Aikido GitHub App check on every PR, `npm audit --audit-level=high` in the pipeline, Dependabot weekly; deploys only run after the pipeline passes | `.github/workflows/pipeline.yml` |

Verified by hand with curl on 2026-09-30: unauthenticated board → 307 to login; cross-origin
login → 401; wrong passcode → 401; member reading another workspace → 404; review on another
workspace's claim → 404; review naming a person from another workspace → 404; sixth failed
login in a minute → 429. Unit tests cover the session token, the scoped store and the
consolidation logic (`npm test`).

## Known gaps (hackathon scope)

- Single shared passcode for the demo users instead of per-user credentials or SSO.
- In-memory store and rate limiter: one process, state resets on restart. On Cloud Run each
  instance keeps its own counters, so with `--max-instances=3` the effective login limit is up
  to 15 attempts per IP per minute, still far too slow for guessing a random passcode.
- The Cloud Run demo is reachable by anyone (`allUsers` invoker); the app's own login is the
  only gate.
- The Remotion render route writes MP4 files to the server's `out/` directory; they are not
  served, but they are not cleaned up either.
- `script-src` allows `'unsafe-inline'` because Next injects inline scripts; nonces are the
  next step.

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

`package.json` carries three `overrides` that pin transitive packages to patched releases:

| Override | Pulled in by | Fixes |
| --- | --- | --- |
| `brace-expansion@1` -> `1.1.21` | `eslint` -> `minimatch@3` | HIGH advisory in `<=1.1.20` |
| `brace-expansion@5` -> `5.0.12` | `typescript-eslint` -> `minimatch@10` | HIGH advisory in `5.0.0-5.0.11` |
| `fast-uri@3` -> `3.1.8` | `@remotion/bundler` -> `webpack` -> `schema-utils` -> `ajv` | HIGH advisory in `3.0.0-3.1.7` |

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
patched release, so it was the smallest possible relaxation of the guard.

## Reporting

Open a GitHub issue labelled `security`, or contact the maintainers directly for anything
sensitive.
