/** Prints the consolidated claim board for the seeded demo without any provider. */
import { assessClient } from "@/relay/assess";
import { createStubLlm } from "@/relay/testing";

async function main() {
const { claims, trust, errors } = await assessClient("ws-demo", "cl-janssens", createStubLlm());
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
