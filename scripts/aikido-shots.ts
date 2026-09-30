/**
 * Dev-only tooling, never part of the server: copies the Aikido AI Code Audit
 * screenshots (docs/aikido/before.png, after.png) into public/aikido/ so the Remotion
 * composition can show them. When they are missing the DemoVideo composition renders
 * labelled placeholder panels instead.
 *
 * Only the two fixed names in SHOTS are ever read or written, and both directories are
 * fixed under the checkout root; `fileUnder` refuses anything else.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileUnder } from "./safe-path";

const SHOTS = ["before.png", "after.png"] as const;

export function syncAikidoShots(root = process.cwd()): string[] {
  const src = path.join(root, "docs", "aikido");
  const dst = path.join(root, "public", "aikido");
  const copied: string[] = [];
  for (const name of SHOTS) {
    const from = fileUnder(src, name);
    if (!existsSync(from)) continue;
    mkdirSync(dst, { recursive: true });
    copyFileSync(from, fileUnder(dst, name));
    copied.push(name);
  }
  return copied;
}
