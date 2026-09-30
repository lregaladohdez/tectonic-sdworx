/**
 * Prints the consolidated claim board for the seeded demo.
 *   npm run relay:board                        stub LLM, no provider calls, first client
 *   npm run relay:board -- --client cl-willems one client by id
 *   npm run relay:board -- --all               every client in the demo workspace
 *   npm run relay:board -- --live              real providers from .env.local (falls back per provider)
 */
import { assessClient } from "@/relay/assess";
import { listClients } from "@/relay/store";
import { createStubLlm } from "@/relay/testing";

const WORKSPACE = "ws-demo";

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const clientArg = args[args.indexOf("--client") + 1];
  const clients = listClients(WORKSPACE);
  const selected = args.includes("--all")
    ? clients
    : clients.filter((c) => c.id === (args.includes("--client") ? clientArg : clients.at(0)?.id));
  if (selected.length === 0) {
    console.error(`Unknown client. Known: ${clients.map((c) => c.id).join(", ")}`);
    process.exit(1);
  }

  const llm = live ? (await import("@/lib/ai/llm")).createLlm() : createStubLlm();
  for (const client of selected) {
    const t0 = Date.now();
    const { claims, trust, errors } = await assessClient(WORKSPACE, client.id, llm);
    console.log(`\n=== ${client.name} (${client.id})  mode=${live ? "live" : "stub"}  ${Date.now() - t0}ms`);
    for (const claim of claims) {
      const t = trust.get(claim.id)!;
      console.log(`\n${claim.id}  ${t.verdict.toUpperCase()}  score=${t.score.toFixed(2)}\n  ${claim.text}`);
      for (const r of t.reasons) console.log(`  - ${r}`);
      if (t.actions.length) console.log(`  actions: ${t.actions.map((a) => a.label).join(" | ")}`);
    }
    if (errors.length) console.log("\nerrors:", errors);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
