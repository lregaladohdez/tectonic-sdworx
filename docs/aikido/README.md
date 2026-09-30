# Aikido AI Code Audit: how to produce the two screenshots

Security is 10% of the grade and is judged with Aikido's AI Code Audit, an AI pentest that
reasons about authentication, authorisation, IDOR and business logic. The score is based on
the issues that remain. The submission needs a screenshot of the Aikido platform before and
after fixing, saved in this folder as `before.png` and `after.png`. This folder holds the
instructions only; the images are added by hand by the account owner.

The Aikido GitHub App is already connected to the repository as a pull request check. The
AI Code Audit is a separate run in the Aikido web UI, and only the account owner can
trigger it.

## Steps

1. Open <https://app.aikido.dev/ai-pentests/discounts/hackathon-tectonic-aikido> and sign
   in with "Continue with GitHub". This link carries the hackathon credits.
2. Connect `lregaladohdez/tectonic-sdworx` if it is not listed yet. The App is already
   installed on the repo, so this should be a selection, not a new install. Do not add
   Aikido's GitHub Action on top; Aikido rejects it on a repo the App already protects.
3. Start an AI Code Audit on the `main` branch at the commit you intend to submit. Wait for
   it to finish.
4. Take the baseline screenshot: full browser window, PNG, showing the repository name, the
   findings list and the score or severity summary. Save it as `docs/aikido/before.png`.
   Do not crop out the repo name or the run date.
5. Go through the findings. For each one: fix it in a branch, or, if it is a known gap that
   stays in hackathon scope, document it under "Known gaps" in `SECURITY.md`. Merge the
   fixes to `main` and wait for the pipeline to deploy.
6. In Aikido, mark each finding resolved (fixed) or add the reason it is accepted.
7. Re-run the AI Code Audit on the new `main` commit.
8. Take the second screenshot with the same framing and save it as `docs/aikido/after.png`.
9. Commit both images: `git add docs/aikido/before.png docs/aikido/after.png`. They are
   referenced from `README.md`, `SECURITY.md` and `docs/SUBMISSION.md`.
10. Upload both screenshots in the Builderbase form as well.

Do not include anything sensitive in the screenshots: no `.env.local`, no terminal with keys,
no Aikido API tokens.

## What the reviewer will find already in place

The full list, where each control lives, and how it was verified by hand is in
[SECURITY.md](../../SECURITY.md). In short:

- Signed `httpOnly` session cookie with constant-time verification.
- Login behind a passcode, compared in constant time, rate limited per IP.
- Every store read scoped by workspace id; a record from another workspace is not found
  even with its id (this is the IDOR defence).
- Same-origin check on every state-changing route; zod on every body.
- Per-user rate limits on the provider routes and on reviews.
- Provider keys in server-only modules through a validated env schema; never `NEXT_PUBLIC_`.
- CSP, HSTS in production, `X-Frame-Options: DENY`, `nosniff`.
- `npm audit --audit-level=high` in the pipeline, Aikido PR check, Dependabot.

The known gaps (shared demo passcode, in-memory store, `'unsafe-inline'` in `script-src`)
are listed in the same file, so a finding on one of those is expected and should be
documented rather than treated as a surprise.
