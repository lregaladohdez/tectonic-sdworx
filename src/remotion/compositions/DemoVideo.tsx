"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import {
  Circle,
  Confetti,
  DottedBlock,
  HalfCircle,
  Squiggle,
  Triangle,
  Zigzag,
} from "../../components/MemphisShapes";
import {
  DEMO_FPS,
  NARRATION_SECONDS,
  SCENE_9_TITLE_AT_SECONDS,
  SCENE_HEAD_SECONDS,
  SCENE_NUMBERS,
  sceneSeconds,
  TITLE_LEAD_SECONDS,
  TOTAL_SECONDS,
  type DemoVideoProps,
} from "./DemoVideo.schema";

const inter = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });
const archivoBlack = loadArchivoBlack("normal", { weights: ["400"], subsets: ["latin"] });

const INK = "#0b0b12";
const MONO = "Consolas, 'SF Mono', Menlo, ui-monospace, monospace";
const sec = (s: number) => Math.round(s * DEMO_FPS);

/* ------------------------------------------------------------------------------------ */
/* Timeline                                                                              */
/* ------------------------------------------------------------------------------------ */

interface SceneSlot {
  n: number;
  from: number;
  duration: number;
  /** Frame (within the scene) where the narration starts. */
  voiceAt: number;
}

const SCENES: SceneSlot[] = (() => {
  let cursor = 0;
  return SCENE_NUMBERS.map((n) => {
    const duration = sec(sceneSeconds(n));
    const voiceAt = sec(SCENE_HEAD_SECONDS + (n === 1 ? TITLE_LEAD_SECONDS : 0));
    const slot = { n, from: cursor, duration, voiceAt };
    cursor += duration;
    return slot;
  });
})();

const slot = (n: number) => SCENES.find((s) => s.n === n)!;

/**
 * Music bed: full on the title cards before the first line and after the last one,
 * a bed under the narration, and silent under scene 6 (the contradiction).
 */
function musicVolume(frame: number): number {
  const s1 = slot(1);
  const s6 = slot(6);
  const s7 = slot(7);
  const s9 = slot(9);
  const voiceIn = (s1.from + s1.voiceAt) / DEMO_FPS;
  const voiceOut = (s9.from + s9.voiceAt) / DEMO_FPS + NARRATION_SECONDS[9]!;
  const t = frame / DEMO_FPS;
  const points: [number, number][] = [
    [0, 0.5],
    [voiceIn - 0.7, 0.5],
    [voiceIn - 0.15, 0.12],
    [s6.from / DEMO_FPS - 0.4, 0.12],
    [s6.from / DEMO_FPS, 0],
    [s7.from / DEMO_FPS, 0],
    [s7.from / DEMO_FPS + 0.5, 0.12],
    [voiceOut + 0.1, 0.12],
    [voiceOut + 0.7, 0.5],
    [TOTAL_SECONDS - 1.2, 0.5],
    [TOTAL_SECONDS, 0],
  ];
  return interpolate(
    t,
    points.map((p) => p[0]),
    points.map((p) => p[1]),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

/* ------------------------------------------------------------------------------------ */
/* Building blocks                                                                       */
/* ------------------------------------------------------------------------------------ */

const useSprings = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const slide = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return { frame, pop, slide };
};

/** Outlined block with the hard Memphis shadow. */
const Block = ({
  children,
  style,
  shadow = INK,
  background = "#fff8ec",
}: {
  children: ReactNode;
  style?: CSSProperties;
  shadow?: string;
  background?: string;
}) => (
  <div
    style={{
      background,
      border: `5px solid ${INK}`,
      boxShadow: `14px 14px 0 0 ${shadow}`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** The corner shapes of PromoVideo, popping in with the same springs. */
const CornerShapes = ({ delay = 0 }: { delay?: number }) => {
  const { frame, pop } = useSprings();
  const s = [pop(delay), pop(delay + 4), pop(delay + 8), pop(delay + 12), pop(delay + 16)];
  const drift = Math.sin(frame / 18) * 6;
  return (
    <>
      <Circle
        className="absolute text-sun"
        style={{ top: -140, right: -120, width: 520, transform: `scale(${s[0]}) translateY(${drift}px)` }}
      />
      <Triangle
        className="absolute text-accent"
        style={{ bottom: -60, left: 80, width: 300, transform: `scale(${s[1]}) rotate(-12deg) translateY(${-drift}px)` }}
      />
      <HalfCircle
        className="absolute text-brand"
        style={{ bottom: 0, right: 220, width: 260, transform: `scale(${s[2]})` }}
      />
      <Zigzag
        className="absolute"
        stroke="#006dd8"
        style={{ top: 120, left: 60, width: 340, transform: `scale(${s[3]}) rotate(-8deg)` }}
      />
      <Confetti className="absolute" style={{ top: 80, right: 520, width: 320, transform: `scale(${s[4]})` }} />
    </>
  );
};

/* ------------------------------------------------------------------------------------ */
/* Scene 1: title card, then one line of the transcript                                  */
/* ------------------------------------------------------------------------------------ */

const TitleCard = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { pop, slide } = useSprings();
  const blockIn = slide(6);
  const titleIn = slide(10);
  const subtitleIn = slide(26);
  const squiggleIn = slide(30);
  void pop;
  return (
    <AbsoluteFill className="bg-pattern-dots text-ink">
      <CornerShapes />
      <AbsoluteFill className="items-center justify-center">
        <div
          className="bg-brand px-16 py-6"
          style={{
            border: `6px solid ${INK}`,
            boxShadow: "22px 22px 0 0 #f1002f",
            transform: `rotate(-2deg) translateY(${(1 - blockIn) * 60}px)`,
            opacity: blockIn,
          }}
        >
          <h1
            className="text-paper uppercase"
            style={{
              fontFamily: archivoBlack.fontFamily,
              fontSize: 168,
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              opacity: titleIn,
              transform: `translateY(${(1 - titleIn) * 30}px)`,
            }}
          >
            {title}
          </h1>
        </div>
        <Sequence from={26} layout="none">
          <p
            className="mt-16 bg-paper px-6 py-2 text-5xl font-semibold text-ink"
            style={{
              border: `4px solid ${INK}`,
              boxShadow: `8px 8px 0 0 ${INK}`,
              opacity: subtitleIn,
              transform: `rotate(1deg) translateY(${(1 - subtitleIn) * 30}px)`,
            }}
          >
            {subtitle}
          </p>
        </Sequence>
        <Sequence from={30} layout="none">
          <Squiggle className="mt-10 w-72" stroke="#ffbe00" style={{ opacity: squiggleIn, transform: `scaleX(${squiggleIn})` }} />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TranscriptLine = () => {
  const { slide } = useSprings();
  const blockIn = slide(0);
  const quoteIn = slide(8);
  return (
    <AbsoluteFill className="bg-pattern-dots text-ink items-center justify-center">
      <Zigzag className="absolute" stroke="#f1002f" style={{ top: 90, right: 90, width: 300, transform: "rotate(6deg)" }} />
      <HalfCircle className="absolute text-mint" style={{ bottom: -4, left: 120, width: 220 }} />
      <Block
        shadow="#006dd8"
        style={{
          width: 1380,
          padding: "56px 72px",
          transform: `rotate(-1deg) translateY(${(1 - blockIn) * 50}px)`,
          opacity: blockIn,
        }}
      >
        <p className="text-3xl font-semibold" style={{ color: "#5a5b5c" }}>
          Handover call, 29 Sep 2026 · Nadia Haddad to Jonas Vermeulen · 12:41
        </p>
        <p
          className="mt-8 text-6xl italic"
          style={{ lineHeight: 1.25, opacity: quoteIn, transform: `translateY(${(1 - quoteIn) * 20}px)` }}
        >
          “Meal vouchers are seven euro face value, one per day worked.”
        </p>
        <Squiggle className="mt-10 w-64" stroke="#ffbe00" />
      </Block>
    </AbsoluteFill>
  );
};

const Scene1 = () => {
  const cut = sec(TITLE_LEAD_SECONDS + SCENE_HEAD_SECONDS + 7.0);
  return (
    <>
      <Sequence from={0} durationInFrames={cut}>
        <TitleCard title="Relay" subtitle="Hand over a client. Keep the trust." />
      </Sequence>
      <Sequence from={cut}>
        <TranscriptLine />
      </Sequence>
    </>
  );
};

/* ------------------------------------------------------------------------------------ */
/* Scene 2: where knowledge lives                                                        */
/* ------------------------------------------------------------------------------------ */

const SOURCES = [
  { at: 1.6, label: "Client file", detail: "Bakkerij Janssens BV · updated 12 Mar 2026", fill: "#9ed2ff", shadow: "#006dd8", rotate: -2 },
  { at: 2.7, label: "Policy PDF", detail: "Meal voucher arrangement (2024)", fill: "#fff2cc", shadow: "#ffbe00", rotate: 1.5 },
  { at: 3.7, label: "An email from 2023", detail: "“the vans are not used privately” · May 2023", fill: "#ffb3c7", shadow: "#f1002f", rotate: -1 },
  { at: 4.8, label: "A Teams call", detail: "Nadia to Jonas · 29 Sep 2026 · 20 minutes", fill: "#c9b8ff", shadow: INK, rotate: 2 },
];

const Scene2 = () => {
  const { frame, pop, slide } = useSprings();
  const head = sec(SCENE_HEAD_SECONDS);
  const lineAt = head + sec(12.0);
  const line2At = head + sec(15.2);
  const cardsOut = interpolate(frame, [lineAt - 8, lineAt], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineIn = slide(lineAt);
  const line2In = slide(line2At);
  return (
    <AbsoluteFill className="bg-pattern-dots text-ink">
      <Confetti className="absolute" style={{ top: 60, left: 80, width: 260 }} />
      <Circle className="absolute text-sun" style={{ bottom: -160, right: -120, width: 420 }} />
      <Squiggle className="absolute" stroke="#006dd8" style={{ bottom: 120, left: 100, width: 260 }} />

      {/* The four places knowledge lives */}
      <AbsoluteFill className="items-center justify-center" style={{ opacity: cardsOut }}>
        <p className="text-4xl font-semibold" style={{ color: "#303642", transform: "translateY(-48px)" }}>
          Where the team’s knowledge lives
        </p>
        <div className="flex gap-12" style={{ transform: "translateY(20px)" }}>
          {SOURCES.map((s, i) => {
            const at = head + sec(s.at);
            const v = pop(at);
            return (
              <div
                key={s.label}
                style={{
                  width: 360,
                  height: 300,
                  background: s.fill,
                  border: `5px solid ${INK}`,
                  boxShadow: `14px 14px 0 0 ${s.shadow}`,
                  transform: `rotate(${s.rotate}deg) scale(${v})`,
                  opacity: frame < at ? 0 : 1,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {i === 0 ? <DottedBlock className="w-24 text-paper" /> : null}
                {i === 1 ? <Triangle className="w-20 text-sun" /> : null}
                {i === 2 ? <Zigzag className="w-28" stroke={INK} /> : null}
                {i === 3 ? <Circle className="w-20 text-brand" /> : null}
                <div>
                  <p className="text-4xl font-semibold" style={{ lineHeight: 1.1 }}>
                    {s.label}
                  </p>
                  <p className="mt-3 text-2xl" style={{ color: "#303642", lineHeight: 1.3 }}>
                    {s.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-16 text-4xl font-semibold" style={{ color: "#303642", opacity: pop(head + sec(6.3)) }}>
          … and in people’s heads.
        </p>
      </AbsoluteFill>

      {/* The challenge line */}
      <AbsoluteFill className="items-center justify-center" style={{ opacity: frame < lineAt ? 0 : 1 }}>
        <p className="text-4xl font-semibold" style={{ color: "#303642", opacity: lineIn, transform: `translateY(${(1 - lineIn) * 20}px)` }}>
          The challenge
        </p>
        <div
          className="mt-10 bg-paper px-14 py-8"
          style={{
            border: `6px solid ${INK}`,
            boxShadow: "18px 18px 0 0 #f1002f",
            transform: `rotate(-1.5deg) translateY(${(1 - lineIn) * 50}px)`,
            opacity: lineIn,
          }}
        >
          <p style={{ fontFamily: archivoBlack.fontFamily, fontSize: 64, lineHeight: 1.1, textTransform: "uppercase" }}>
            From “I found something”
          </p>
        </div>
        <div
          className="mt-12 bg-brand px-14 py-8 text-paper"
          style={{
            border: `6px solid ${INK}`,
            boxShadow: "18px 18px 0 0 #ffbe00",
            transform: `rotate(1deg) translateY(${(1 - line2In) * 50}px)`,
            opacity: line2In,
          }}
        >
          <p style={{ fontFamily: archivoBlack.fontFamily, fontSize: 64, lineHeight: 1.1, textTransform: "uppercase" }}>
            to “I know why I can rely on it”
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------ */
/* Scenes 3 to 7 and 9: the app                                                          */
/* ------------------------------------------------------------------------------------ */

const Footage = ({ n, pushIn = false }: { n: number; pushIn?: boolean }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = pushIn ? interpolate(frame, [0, durationInFrames], [1, 1.08]) : 1;
  return (
    <AbsoluteFill style={{ background: "#fff8ec" }}>
      <OffthreadVideo
        src={staticFile(`video/scene-${n}.mp4`)}
        muted
        style={{ width: "100%", height: "100%", transform: `scale(${scale})`, transformOrigin: "50% 62%" }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------ */
/* Scene 8: the code                                                                     */
/* ------------------------------------------------------------------------------------ */

type Tok = [text: string, color?: string];
const KW = "#ffbe00";
const TY = "#9ed2ff";
const CM = "#8b93a7";
const ST = "#7fe3c5";
const TRUST_SIGNAL: Tok[][] = [
  [["/**", CM]],
  [[" * A trust signal plugin. Return one result per claim you have an opinion on;", CM]],
  [[" * omit claims you cannot judge. Never throw for a single bad claim; log and skip.", CM]],
  [[" */", CM]],
  [["export interface ", KW], ["TrustSignal", TY], [" {"]],
  [["  id: ", undefined], ["string", TY], [";"]],
  [["  name: "], ["string", TY], [";"]],
  [["  description: "], ["string", TY], [";"]],
  [["  category: "], ["SignalCategory", TY], [";  "], ["// \"trust\" | \"capture\" | \"detect\" | \"connect\"", CM]],
  [["  version: "], ["string", TY], [";"]],
  [["  "], ["/** Relative weight in consolidation, default 1. */", CM]],
  [["  weight?: "], ["number", TY], [";"]],
  [["  evaluate(claims: "], ["Claim", TY], ["[], ctx: "], ["SignalContext", TY], ["): "], ["Promise", TY], ["<"], ["SignalResult", TY], ["[]>;"]],
  [["}"]],
  [[""]],
  [["export type ", KW], ["Verdict", TY], [" ="]],
  [["  | "], ["\"confirmed\"", ST], [" | "], ["\"contradicted\"", ST], [" | "], ["\"outdated\"", ST], [" | "], ["\"expiring\"", ST], [" | "], ["\"unsupported\"", ST], [";"]],
];

const CodeCard = () => {
  const { slide } = useSprings();
  const frame = useCurrentFrame();
  const blockIn = slide(0);
  return (
    <AbsoluteFill className="items-center justify-center">
      <Block
        shadow="#006dd8"
        background={INK}
        style={{
          width: 1560,
          padding: "36px 48px 44px",
          transform: `rotate(-0.6deg) translateY(${(1 - blockIn) * 40}px)`,
          opacity: blockIn,
        }}
      >
        <p className="text-2xl font-semibold" style={{ color: "#ffbe00", fontFamily: MONO }}>
          src/relay/types.ts
        </p>
        <pre className="mt-6" style={{ fontFamily: MONO, fontSize: 30, lineHeight: 1.45, color: "#fff8ec", margin: 0 }}>
          {TRUST_SIGNAL.map((line, i) => (
            <div key={i} style={{ opacity: frame >= 6 + i * 2 ? 1 : 0 }}>
              {line.map(([t, c], j) => (
                <span key={j} style={{ color: c }}>
                  {t}
                </span>
              ))}
              {line.length === 1 && line[0]![0] === "" ? " " : null}
            </div>
          ))}
        </pre>
      </Block>
    </AbsoluteFill>
  );
};

const SIGNALS = [
  { name: "document-freshness/", note: "deterministic: dates, supersedes, 18/30-month thresholds. No model.", fill: "#fff2cc" },
  { name: "document-evidence/", note: "LLM verdicts, only kept when they return supporting quotes.", fill: "#9ed2ff" },
  { name: "expert-locator/", note: "who owns the topic, from Person.topics and jurisdictions.", fill: "#c9b8ff" },
  { name: "regulation-watch/", note: "official notices, each with its source link.", fill: "#ffb3c7" },
  { name: "index.ts", note: "the registry: consolidation is a weighted vote over signals.", fill: "#fff8ec" },
];

const FolderCard = () => {
  const { pop, slide } = useSprings();
  const blockIn = slide(0);
  return (
    <AbsoluteFill className="items-center justify-center">
      <Block
        shadow="#ffbe00"
        style={{ width: 1440, padding: "40px 56px 52px", transform: `rotate(0.6deg) translateY(${(1 - blockIn) * 40}px)`, opacity: blockIn }}
      >
        <p className="text-3xl font-semibold" style={{ fontFamily: MONO, color: "#303642" }}>
          src/relay/signals/
        </p>
        <div className="mt-6 flex flex-col gap-4">
          {SIGNALS.map((s, i) => {
            const v = pop(6 + i * 5);
            return (
              <div
                key={s.name}
                className="flex items-baseline gap-8 px-6 py-4"
                style={{ background: s.fill, border: `4px solid ${INK}`, boxShadow: `8px 8px 0 0 ${INK}`, transform: `scale(${v})`, transformOrigin: "left center" }}
              >
                <span style={{ fontFamily: MONO, fontSize: 36, fontWeight: 700, minWidth: 460 }}>{s.name}</span>
                <span className="text-3xl" style={{ color: "#303642" }}>
                  {s.note}
                </span>
              </div>
            );
          })}
        </div>
      </Block>
    </AbsoluteFill>
  );
};

const AuditPanel = ({ label, file, present, delay }: { label: string; file: string; present: boolean; delay: number }) => {
  const { pop } = useSprings();
  const v = pop(delay);
  return (
    <div style={{ transform: `scale(${v})`, width: 760 }}>
      <p className="text-4xl font-semibold uppercase" style={{ fontFamily: archivoBlack.fontFamily }}>
        {label}
      </p>
      <div
        className="mt-4 overflow-hidden"
        style={{ height: 560, border: `5px solid ${INK}`, boxShadow: `12px 12px 0 0 ${label === "Before" ? "#f1002f" : "#006dd8"}`, background: "#ffffff" }}
      >
        {present ? (
          <Img src={staticFile(`aikido/${file}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-pattern-stripes" style={{ color: "#d9dbdd" }}>
            <p className="text-4xl font-semibold" style={{ color: "#303642" }}>
              Audit screenshot: {label.toLowerCase()}
            </p>
            <p className="text-2xl" style={{ color: "#5a5b5c" }}>
              docs/aikido/{file}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const AuditCard = ({ aikido }: Pick<DemoVideoProps, "aikido">) => {
  const { slide } = useSprings();
  const blockIn = slide(0);
  return (
    <AbsoluteFill className="items-center justify-center">
      <div style={{ opacity: blockIn, transform: `translateY(${(1 - blockIn) * 40}px)` }}>
        <div className="flex items-center gap-6">
          <p className="bg-ink px-6 py-3 text-4xl font-semibold text-paper" style={{ border: `4px solid ${INK}`, boxShadow: "8px 8px 0 0 #f1002f" }}>
            Aikido AI Code Audit
          </p>
          <p className="text-3xl" style={{ color: "#303642" }}>
            authN · authZ · IDOR · logic, run before and after the security pass
          </p>
        </div>
        <div className="mt-10 flex gap-16">
          <AuditPanel label="Before" file="before.png" present={aikido.before} delay={8} />
          <AuditPanel label="After" file="after.png" present={aikido.after} delay={16} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Scene8 = ({ aikido }: Pick<DemoVideoProps, "aikido">) => {
  const head = sec(SCENE_HEAD_SECONDS);
  const folderAt = head + sec(6.9);
  const auditAt = head + sec(11.6);
  return (
    <AbsoluteFill className="bg-pattern-dots text-ink">
      <AbsoluteFill style={{ opacity: 0.16 }}>
        <Footage n={8} />
      </AbsoluteFill>
      <Sequence from={0} durationInFrames={folderAt}>
        <CodeCard />
      </Sequence>
      <Sequence from={folderAt} durationInFrames={auditAt - folderAt}>
        <FolderCard />
      </Sequence>
      <Sequence from={auditAt}>
        <AuditCard aikido={aikido} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------ */
/* Scene 9: the board, then the closing card                                             */
/* ------------------------------------------------------------------------------------ */

const CLOSING = [
  { text: "Find it.", at: 0.55, bg: "#006dd8", fg: "#fff8ec", shadow: "#f1002f", rotate: -2 },
  { text: "Understand it.", at: 1.55, bg: "#ffbe00", fg: INK, shadow: INK, rotate: 1 },
  { text: "Trust it.", at: 2.85, bg: "#f1002f", fg: "#fff8ec", shadow: "#006dd8", rotate: -1 },
];

const ClosingCard = ({ repoUrl }: Pick<DemoVideoProps, "repoUrl">) => {
  const { frame, pop, slide } = useSprings();
  const urlIn = slide(sec(3.6));
  return (
    <AbsoluteFill className="bg-pattern-dots text-ink">
      <CornerShapes />
      <AbsoluteFill className="items-center justify-center">
        <p className="text-5xl font-semibold" style={{ opacity: slide(0), transform: "translateY(-16px)" }}>
          Relay
        </p>
        <div className="mt-4 flex flex-col items-center gap-7">
          {CLOSING.map((c) => {
            const at = sec(c.at);
            const v = pop(at);
            return (
              <div
                key={c.text}
                className="px-12 py-4"
                style={{
                  background: c.bg,
                  color: c.fg,
                  border: `6px solid ${INK}`,
                  boxShadow: `18px 18px 0 0 ${c.shadow}`,
                  transform: `rotate(${c.rotate}deg) scale(${v})`,
                  opacity: frame < at ? 0 : 1,
                  fontFamily: archivoBlack.fontFamily,
                  fontSize: 76,
                  lineHeight: 1,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {c.text}
              </div>
            );
          })}
        </div>
        <Squiggle className="mt-12 w-72" stroke="#ffbe00" style={{ opacity: urlIn, transform: `scaleX(${urlIn})` }} />
        <p
          className="mt-6 bg-paper px-6 py-2 text-4xl font-semibold"
          style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 0 ${INK}`, opacity: urlIn, transform: `translateY(${(1 - urlIn) * 20}px)` }}
        >
          {repoUrl}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Scene9 = ({ repoUrl }: Pick<DemoVideoProps, "repoUrl">) => {
  const cut = sec(SCENE_HEAD_SECONDS + SCENE_9_TITLE_AT_SECONDS);
  return (
    <>
      <Sequence from={0} durationInFrames={cut}>
        <Footage n={9} />
      </Sequence>
      <Sequence from={cut}>
        <ClosingCard repoUrl={repoUrl} />
      </Sequence>
    </>
  );
};

/* ------------------------------------------------------------------------------------ */
/* The video                                                                             */
/* ------------------------------------------------------------------------------------ */

const sceneBody = (n: number, props: DemoVideoProps): ReactNode => {
  switch (n) {
    case 1:
      return <Scene1 />;
    case 2:
      return <Scene2 />;
    case 5:
      return <Footage n={5} pushIn />;
    case 8:
      return <Scene8 aikido={props.aikido} />;
    case 9:
      return <Scene9 repoUrl={props.repoUrl} />;
    default:
      return <Footage n={n} />;
  }
};

export const DemoVideo = (props: DemoVideoProps) => (
  <AbsoluteFill style={{ background: "#fff8ec", fontFamily: inter.fontFamily }}>
    <Audio src={staticFile("audio/music/bed.mp3")} volume={musicVolume} />
    {SCENES.map((s) => (
      <Sequence key={s.n} from={s.from} durationInFrames={s.duration} name={`Scene ${s.n}`}>
        <Sequence from={s.voiceAt} layout="none" name={`Voice ${s.n}`}>
          <Audio src={staticFile(`audio/scenes/scene-${s.n}.mp3`)} />
        </Sequence>
        {sceneBody(s.n, props)}
      </Sequence>
    ))}
  </AbsoluteFill>
);
