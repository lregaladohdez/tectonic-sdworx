# Writing a trust signal

A signal is a plugin that looks at claims and returns an opinion per claim, with evidence.
The kernel runs all signals in parallel and consolidates their results. Adding a signal
never changes the kernel or the board.

## Contract

See `src/relay/types.ts`. A signal implements `TrustSignal`:

```ts
export const mySignal: TrustSignal = {
  id: "my-signal",            // kebab-case, unique
  name: "My signal",          // shown on the claim card
  description: "...",
  category: "trust" | "capture" | "detect" | "connect",
  version: "1.0.0",
  weight: 1,                  // optional, relative weight in the score
  async evaluate(claims, ctx) {
    // return ONE SignalResult per claim you have an opinion on; skip the rest
  },
};
```

`SignalContext` gives you the workspace's `documents`, `clients`, `people`, an `llm`
(`generateText`, `generateJson(schema, prompt)`, `embed(texts)`), `now`, and `log`.
Never import provider SDKs in a signal; use `ctx.llm`. Never read data outside
`ctx.workspaceId`.

## Result rules

- `verdict`: `confirmed | contradicted | outdated | expiring | unsupported`.
- `confidence`: 0..1. Deterministic checks use fixed values; LLM judgements pass the model's confidence through.
- `summary`: one sentence a payroll consultant can read on the card. Name the document and the date.
- `evidence`: the exact excerpt(s) you relied on, with `documentId` and `effectiveDate` when relevant. The board shows evidence verbatim, so the human can verify the signal.
- `actions`: optional; `ask-expert` (with `personId`), `review-document`, `update-document`, `acknowledge`.
- Never throw for one bad claim. `ctx.log` and skip it.

## Where things go

```
src/relay/signals/<signal-id>/index.ts        the signal
src/relay/signals/<signal-id>/index.test.ts   vitest against the demo fixtures
src/relay/signals/index.ts                    add the import to ALL
```

Fixtures: `src/relay/fixtures/demo-workspace.ts` (claims c1..c8, five documents, three people).
Offline LLM: `createStubLlm()` in `src/relay/testing.ts`; a signal must degrade gracefully
when the stub returns empty text (return no results, do not throw).

## Verify

```bash
npm test                 # vitest
npm run relay:board      # prints the consolidated board with the stub LLM
npm run typecheck && npm run lint
```

Reference implementation: `src/relay/signals/document-freshness`.
