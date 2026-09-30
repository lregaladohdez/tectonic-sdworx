/**
 * Renders the submission demo: copies the Aikido screenshots into public/ when they
 * exist, then `remotion render DemoVideo out/relay-demo.mp4`.
 *
 *   npm run video:render
 */
import { execFileSync } from "node:child_process";
import { syncAikidoShots } from "./aikido-shots";

const shots = syncAikidoShots();
console.log(shots.length ? `aikido screenshots: ${shots.join(", ")}` : "aikido screenshots: none (placeholders)");
execFileSync("npx", ["remotion", "render", "DemoVideo", "out/relay-demo.mp4", ...process.argv.slice(2)], {
  stdio: "inherit",
});
