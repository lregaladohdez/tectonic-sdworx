/**
 * Copies the Aikido AI Code Audit screenshots (docs/aikido/before.png, after.png) into
 * public/aikido/ so the Remotion composition can show them. When they are missing the
 * DemoVideo composition renders labelled placeholder panels instead.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const SHOTS = ["before.png", "after.png"] as const;

export function syncAikidoShots(root = process.cwd()): string[] {
  const src = path.join(root, "docs", "aikido");
  const dst = path.join(root, "public", "aikido");
  const copied: string[] = [];
  for (const name of SHOTS) {
    const from = path.join(src, name);
    if (!existsSync(from)) continue;
    mkdirSync(dst, { recursive: true });
    copyFileSync(from, path.join(dst, name));
    copied.push(name);
  }
  return copied;
}
