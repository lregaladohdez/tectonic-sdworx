/**
 * Prints the consolidated claim board for the seeded demo.
 *   npm run relay:board            stub LLM, no provider calls
 *   npm run relay:board -- --live  real providers from .env.local (falls back per provider)
 */
import { assessClient } from "@/relay/assess";
import { createStubLlm } from "@/relay/testing";

async function main() {
  const live = process.argv.includes("--live");
  const llm = live ? (await import("@/lib/ai/llm")).createLlm() : createStubLlm();
  const t0 = Date.now();
  const { claims, trust, errors } = await assessClient("ws-demo", "cl-janssens", llm);
  console.log(`mode=${live ? "live" : "stub"}  ${Date.now() - t0}ms`);
  for (const claim of claims) {
    const t = trust.get(claim.id)!;
    console.log(`\n${claim.id}  ${t.verdict.toUpperCase()}  score=${t.score.toFixed(2)}\n  ${claim.text}`);
    for (const r of t.reasons) console.log(`  - ${r}`);
  }
  if (errors.length) console.log("\nerrors:", errors);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
