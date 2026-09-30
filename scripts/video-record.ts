/**
 * Dev-only tooling, never part of the server: records the app footage for the
 * submission demo (docs/VIDEO_SCRIPT.md, scenes 3 to 9).
 *
 *   npm run video:record            # all footage scenes
 *   npm run video:record -- 6 9     # only scenes 6 and 9
 *
 * Needs a production server of this checkout on RELAY_URL (default http://localhost:3002)
 * and RELAY_DEMO_PASSCODE in .env.local. Logs in once, saves the session, then records
 * every scene in its own browser context so each one becomes public/video/scene-N.webm,
 * converted to public/video/scene-N.mp4 (h264, 1920x1080, 30 fps) for Remotion.
 *
 * The page is shown at 125% zoom so card text is readable at video scale. Review state
 * on the demo claims is reset first, so a re-run starts from a clean board.
 *
 * File access is deliberately narrow: every file read or written is a fixed name
 * (`scene-<n>.webm` / `.mp4` with n from FOOTAGE_SCENES, `storage-state.json`) inside
 * the fixed public/video directory, checked by `fileUnder`. Scene numbers from the
 * command line are only used to pick entries of FOOTAGE_SCENES, never to build a path.
 * The Playwright cache lookup only accepts directory names matching `chromium-<digits>`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright-core";
import {
  DEMO_HEIGHT,
  DEMO_WIDTH,
  FOOTAGE_SCENES,
  NARRATION_SECONDS,
  SCENE_HEAD_SECONDS,
  SCENE_TAIL_SECONDS,
} from "../src/remotion/compositions/DemoVideo.schema";
import { syncAikidoShots } from "./aikido-shots";
import { fileUnder, isDirectlyUnder } from "./safe-path";

const BASE = (process.env.RELAY_URL ?? "http://localhost:3002").replace(/\/$/, "");
const EMAIL = "incoming@relay.demo";
const WORKSPACE = "ws-demo";
const CLIENT = "cl-janssens";
const CLAIM_IDS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];
const ZOOM = 1.25;
const OUT = path.join(process.cwd(), "public", "video");
const STATE = fileUnder(OUT, "storage-state.json");
const FFMPEG = process.env.FFMPEG ?? "/opt/homebrew/bin/ffmpeg";
if (!path.isAbsolute(FFMPEG)) throw new Error("FFMPEG must be an absolute path to the ffmpeg binary");

type Scene = (typeof FOOTAGE_SCENES)[number];
const isScene = (n: number): n is Scene => (FOOTAGE_SCENES as readonly number[]).includes(n);

/** public/video/scene-<n>.<ext> for a known scene number only. */
function sceneFile(n: Scene, ext: "webm" | "mp4"): string {
  if (!isScene(n) || !Number.isInteger(n) || n < 1 || n > 99) throw new Error(`Unknown scene ${n}`);
  return fileUnder(OUT, `scene-${n}.${ext}`);
}

const PATHS = {
  login: `${BASE}/login`,
  workspace: `${BASE}/w/${WORKSPACE}`,
  board: `${BASE}/w/${WORKSPACE}/clients/${CLIENT}`,
  brief: `${BASE}/w/${WORKSPACE}/clients/${CLIENT}/brief`,
};

/**
 * The Playwright-managed Chromium binary. CHROMIUM_PATH (absolute) overrides the lookup
 * and is handed to Playwright as the executable, never read here. The cache scan only
 * accepts directory names of the exact form `chromium-<digits>` under the fixed cache
 * directory, and every candidate is resolved and checked to stay inside it.
 */
function chromiumPath(): string {
  const override = process.env.CHROMIUM_PATH;
  if (override) {
    if (!path.isAbsolute(override)) throw new Error("CHROMIUM_PATH must be an absolute path");
    return override;
  }
  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  const dirs = existsSync(cache)
    ? readdirSync(cache)
        .map((d) => path.basename(d))
        .filter((d) => /^chromium-\d{1,8}$/.test(d))
        .sort()
    : [];
  for (const dir of dirs.reverse()) {
    const dirPath = path.resolve(cache, dir);
    if (!isDirectlyUnder(cache, dirPath)) continue;
    for (const app of ["Google Chrome for Testing", "Chromium"] as const) {
      for (const arch of ["chrome-mac-arm64", "chrome-mac"] as const) {
        const bin = path.resolve(dirPath, arch, `${app}.app`, "Contents", "MacOS", app);
        if (bin.startsWith(dirPath + path.sep) && existsSync(bin)) return bin;
      }
    }
  }
  throw new Error("No Playwright Chromium found; set CHROMIUM_PATH");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** tsx compiles functions with a `__name` helper that page.evaluate does not ship; define it. */
const NAME_SHIM = "globalThis.__name = (fn) => fn;";

/** A wall-clock timeline for one scene: `at(3)` waits until three seconds after start. */
class Timeline {
  private readonly t0 = Date.now();
  async at(seconds: number) {
    const wait = this.t0 + seconds * 1000 - Date.now();
    if (wait > 0) await sleep(wait);
  }
  elapsed() {
    return (Date.now() - this.t0) / 1000;
  }
}

/**
 * Runs in every recorded page: zooms the document and draws a pointer, because a headless
 * recording has no cursor. The pointer cancels the zoom so mouse coordinates map 1:1.
 */
function pageSetupScript(zoom: number): string {
  return `
document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.style.zoom = "${zoom}";
  const cursor = document.createElement("div");
  cursor.id = "relay-demo-cursor";
  cursor.style.cssText = "position:fixed;left:0;top:0;width:28px;height:36px;zoom:${1 / zoom};pointer-events:none;z-index:2147483647;transform-origin:4px 3px;transition:transform 120ms ease;filter:drop-shadow(1px 2px 2px rgba(0,0,0,.35));";
  cursor.innerHTML = '<svg viewBox="0 0 28 36" width="28" height="36"><path d="M4 3l17 15-7 1 4 9-4 2-4-9-6 6z" fill="#0b0b12" stroke="#fff8ec" stroke-width="2" stroke-linejoin="round"/></svg>';
  document.documentElement.appendChild(cursor);
  document.addEventListener("mousemove", (e) => { cursor.style.left = e.clientX + "px"; cursor.style.top = e.clientY + "px"; }, true);
  document.addEventListener("mousedown", () => { cursor.style.transform = "scale(0.8)"; }, true);
  document.addEventListener("mouseup", () => { cursor.style.transform = "scale(1)"; }, true);
});
`;
}

async function applyZoom(page: Page) {
  await page.evaluate((z) => {
    document.documentElement.style.zoom = String(z);
  }, ZOOM);
}

/** Moves the mouse in a slow arc to the centre (or a point) of an element. */
async function glide(page: Page, target: Locator, ms = 900, fx = 0.5, fy = 0.5) {
  const box = await target.boundingBox();
  if (!box) throw new Error(`No bounding box for ${target}`);
  const x = box.x + box.width * fx;
  const y = box.y + box.height * fy;
  await page.mouse.move(x, y, { steps: Math.max(12, Math.round(ms / 25)) });
}

/** Scrolls the window smoothly so `target` sits `offset` px under the top edge, in `ms`. */
async function scrollTo(page: Page, target: Locator, ms = 1200, offset = 32) {
  await target.evaluate(
    (el, { ms, offset }) =>
      new Promise<void>((resolve) => {
        const start = el.getBoundingClientRect().top - offset;
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / ms);
          const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
          const wanted = start * (1 - eased);
          const current = el.getBoundingClientRect().top - offset;
          window.scrollBy(0, current - wanted);
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    { ms, offset },
  );
}

/** The claim card whose title contains `text`. */
const card = (page: Page, text: string) => page.locator("article", { has: page.locator("h2", { hasText: text }) });

/** The evidence excerpt boxes inside a card, in document order. */
const evidence = (c: Locator) => c.locator("ul > li");

async function login(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const passcode = process.env.RELAY_DEMO_PASSCODE;
  if (!passcode) throw new Error("RELAY_DEMO_PASSCODE is not set (put it in .env.local)");
  const ctx = await browser.newContext({ viewport: { width: DEMO_WIDTH, height: DEMO_HEIGHT } });
  await ctx.addInitScript(NAME_SHIM);
  const page = await ctx.newPage();
  await page.goto(PATHS.login);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Passcode").fill(passcode);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(PATHS.workspace, { timeout: 30_000 });
  await ctx.storageState({ path: STATE });
  return ctx;
}

async function resetReviews(page: Page) {
  await page.goto(PATHS.workspace);
  const failed = await page.evaluate(
    async ({ ws, ids }) => {
      const bad: string[] = [];
      for (const id of ids) {
        const res = await fetch(`/api/w/${ws}/claims/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "open" }),
        });
        if (!res.ok) bad.push(`${id}:${res.status}`);
      }
      return bad;
    },
    { ws: WORKSPACE, ids: CLAIM_IDS },
  );
  if (failed.length) throw new Error(`Could not reset reviews: ${failed.join(", ")}`);
}

/** Loads every page once so the assessment is cached before the camera rolls. */
async function warm(page: Page) {
  for (const url of [PATHS.workspace, PATHS.board, PATHS.brief]) {
    const t = Date.now();
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    console.log(`warm ${url} ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
  await page.goto(PATHS.board, { waitUntil: "networkidle" });
  const cards = await page.locator("article").evaluateAll((els) =>
    els.map((el) => ({
      title: el.querySelector("h2")?.textContent ?? "",
      verdict: el.querySelector("header span")?.textContent ?? "",
      buttons: [...el.querySelectorAll("footer button")].map((b) => b.textContent?.trim()),
    })),
  );
  for (const c of cards) console.log(`  ${c.verdict.padEnd(13)} ${c.title}  [${c.buttons.join(" | ")}]`);
  if (cards.length !== 8) throw new Error(`Expected 8 claim cards on the board, found ${cards.length}`);
}

type SceneFn = (page: Page, t: Timeline) => Promise<void>;

const SCENES: Record<(typeof FOOTAGE_SCENES)[number], { start: string; run: SceneFn }> = {
  // Workspace page, then the bakery board.
  3: {
    start: PATHS.workspace,
    async run(page, t) {
      const link = page.getByRole("link", { name: "Bakkerij Janssens BV" });
      await page.mouse.move(1300, 700);
      await t.at(0.6);
      await glide(page, link.locator("xpath=.."), 1600, 0.5, 0.4);
      await t.at(3.2);
      await glide(page, link, 700, 0.4, 0.5);
      await t.at(9.0);
      await link.click();
      await page.waitForURL(PATHS.board);
      await page.getByRole("heading", { name: "Claim board" }).waitFor();
      await page.mouse.move(1500, 300, { steps: 20 });
      await t.at(12.5);
      await scrollTo(page, card(page, "13th-month"), 2400, 24);
      await t.at(16);
      await scrollTo(page, card(page, "Meal vouchers"), 2400, 24);
    },
  },
  // The confirmed 13th-month card and its evidence line.
  4: {
    start: PATHS.board,
    async run(page, t) {
      const c = card(page, "13th-month");
      await page.mouse.move(1500, 200);
      await t.at(0.4);
      await scrollTo(page, c, 1400, 40);
      await t.at(2.2);
      await glide(page, c.locator("h2"), 1200, 0.25, 0.5);
      await t.at(6.5);
      await glide(page, c.locator("header span").first(), 900, 0.5, 0.5);
      await t.at(11.0);
      await glide(page, evidence(c).first(), 1400, 0.3, 0.6);
      await t.at(17);
      await glide(page, evidence(c).first(), 1200, 0.6, 0.75);
    },
  },
  // Meal vouchers: the 2024 arrangement next to the 2026 one.
  5: {
    start: PATHS.board,
    async run(page, t) {
      const c = card(page, "Meal vouchers");
      await scrollTo(page, c, 10, 24);
      await page.mouse.move(1500, 200);
      await t.at(0.5);
      await glide(page, c.locator("blockquote"), 1400, 0.3, 0.5);
      await t.at(5.5);
      await glide(page, evidence(c).nth(0), 1400, 0.3, 0.6);
      await t.at(10.5);
      await glide(page, evidence(c).nth(1), 1400, 0.3, 0.6);
      await t.at(15.5);
      await glide(page, c.locator("section p").first(), 1200, 0.2, 0.5);
    },
  },
  // Sunday premium (contradicted), then the JC 118 card: click "Ask Els Peeters".
  6: {
    start: PATHS.board,
    async run(page, t) {
      const sunday = card(page, "Sunday work");
      await scrollTo(page, sunday, 10, 24);
      await page.mouse.move(1500, 200);
      await t.at(0.5);
      await glide(page, sunday.locator("blockquote"), 1400, 0.3, 0.5);
      await t.at(6.5);
      await glide(page, evidence(sunday).first(), 1400, 0.3, 0.6);
      await t.at(12.0);
      const owner = page.locator("article", { has: page.getByRole("button", { name: "Ask Els Peeters" }) }).first();
      const ask = owner.getByRole("button", { name: "Ask Els Peeters" });
      await scrollTo(page, owner, 1600, 24);
      await t.at(14.5);
      await glide(page, ask, 1400, 0.5, 0.5);
      await t.at(19.5);
      await ask.click();
      await owner.getByText("Asked Els Peeters").waitFor({ timeout: 15_000 });
      await glide(page, owner.getByText("Asked Els Peeters"), 900, 0.5, 0.5);
    },
  },
  // Delivery vans (outdated), then WhatsApp (unsupported).
  7: {
    start: PATHS.board,
    async run(page, t) {
      const vans = card(page, "delivery vans");
      await scrollTo(page, vans, 10, 24);
      await page.mouse.move(1500, 200);
      await t.at(0.5);
      await glide(page, vans.locator("h2"), 1200, 0.3, 0.5);
      await t.at(3.5);
      await glide(page, evidence(vans).first(), 1400, 0.3, 0.6);
      await t.at(10.0);
      const wa = card(page, "WhatsApp");
      await scrollTo(page, wa, 1600, 24);
      await t.at(12.5);
      await glide(page, wa.locator("section p").first(), 1200, 0.3, 0.5);
      await t.at(17.5);
      await glide(page, wa.getByRole("button", { name: "Ask Nadia Haddad" }), 1400, 0.5, 0.5);
    },
  },
  // The board header, briefly, for the code scene.
  8: {
    start: PATHS.board,
    async run(page, t) {
      await page.mouse.move(1500, 200);
      await t.at(0.5);
      await glide(page, page.getByRole("heading", { name: "Claim board" }), 1800, 0.5, 0.5);
      await t.at(4);
      await page.mouse.move(1400, 260, { steps: 40 });
    },
  },
  // Accept the confirmed claims, then open the verified brief.
  9: {
    start: PATHS.board,
    async run(page, t) {
      await page.mouse.move(1500, 200);
      const confirmed = page.locator("article", { has: page.locator("header > div > span", { hasText: "Confirmed" }) });
      const n = await confirmed.count();
      await t.at(0.4);
      for (let i = 0; i < n; i++) {
        const c = confirmed.nth(i);
        await scrollTo(page, c, 700, 40);
        const accept = c.getByRole("button", { name: "Accept" });
        await glide(page, accept, 500);
        await accept.click();
        await c.getByText("Accepted", { exact: true }).waitFor({ timeout: 15_000 });
        await sleep(350);
      }
      await scrollTo(page, page.getByRole("heading", { name: "Claim board" }), 900, 120);
      const brief = page.getByRole("link", { name: "Verified client brief" });
      await glide(page, brief, 900);
      await sleep(300);
      await brief.click();
      await page.waitForURL(PATHS.brief);
      await page.getByRole("heading", { name: /verified client brief/ }).waitFor();
      await page.mouse.move(1500, 300, { steps: 20 });
      await t.at(11);
      await scrollTo(page, page.getByRole("heading", { name: "Still open" }), 2400, 200);
    },
  },
};

async function record(browser: Awaited<ReturnType<typeof chromium.launch>>, n: Scene) {
  const scene = SCENES[n];
  const seconds = SCENE_HEAD_SECONDS + NARRATION_SECONDS[n]! + SCENE_TAIL_SECONDS + 3;
  const ctx: BrowserContext = await browser.newContext({
    viewport: { width: DEMO_WIDTH, height: DEMO_HEIGHT },
    storageState: STATE,
    recordVideo: { dir: OUT, size: { width: DEMO_WIDTH, height: DEMO_HEIGHT } },
  });
  await ctx.addInitScript(NAME_SHIM);
  await ctx.addInitScript(pageSetupScript(ZOOM));
  const page = await ctx.newPage();
  const opened = Date.now();
  await page.goto(scene.start, { waitUntil: "networkidle" });
  await applyZoom(page);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const lead = (Date.now() - opened) / 1000;
  const t = new Timeline();
  await scene.run(page, t);
  await t.at(seconds);
  const video = page.video();
  await ctx.close();
  // Playwright writes the recording under OUT with a name of its own; accept it only from there.
  const webm = await video!.path();
  if (!isDirectlyUnder(OUT, webm)) throw new Error(`Unexpected recording location: ${webm}`);
  const target = sceneFile(n, "webm");
  if (existsSync(target)) unlinkSync(target);
  renameSync(webm, target);
  console.log(`scene ${n}: ${t.elapsed().toFixed(1)}s recorded after a ${lead.toFixed(2)}s lead -> ${target}`);
  const mp4 = sceneFile(n, "mp4");
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error",
    "-ss", lead.toFixed(3),
    "-i", target,
    "-an", "-r", "30",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    mp4,
  ]);
  console.log(`scene ${n}: ${mp4}`);
}

async function main() {
  // Command-line scene numbers only select entries of FOOTAGE_SCENES; anything else is an error.
  const only = new Set<number>();
  for (const arg of process.argv.slice(2)) {
    const n = Number(arg);
    if (!isScene(n)) throw new Error(`Unknown scene "${arg}"; footage scenes are ${FOOTAGE_SCENES.join(", ")}`);
    only.add(n);
  }
  const scenes = FOOTAGE_SCENES.filter((n) => only.size === 0 || only.has(n));
  mkdirSync(OUT, { recursive: true });
  const shots = syncAikidoShots();
  console.log(shots.length ? `aikido screenshots: ${shots.join(", ")}` : "aikido screenshots: none (placeholders)");

  const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
  try {
    const session = await login(browser);
    const page = session.pages()[0]!;
    await resetReviews(page);
    await warm(page);
    await session.close();
    for (const n of scenes) await record(browser, n);
  } finally {
    await browser.close();
    if (existsSync(STATE)) unlinkSync(STATE);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
