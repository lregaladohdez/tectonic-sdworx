"use client";

import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { Circle, Confetti, HalfCircle, Squiggle, Triangle, Zigzag } from "../../components/MemphisShapes";
import type { PromoVideoProps } from "./PromoVideo.schema";

const inter = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });
const archivoBlack = loadArchivoBlack("normal", { weights: ["400"], subsets: ["latin"] });

const INK = "#0b0b12";

export const PromoVideo = ({ title, subtitle, voiceOver }: PromoVideoProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const pop = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const slide = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });

  const shapesIn = [pop(0), pop(4), pop(8), pop(12), pop(16)];
  const blockIn = slide(6);
  const titleIn = slide(10);
  const subtitleIn = slide(26);
  const squiggleIn = slide(30);
  const drift = Math.sin(frame / 18) * 6;
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      className="bg-pattern-dots text-ink"
      style={{ opacity: fadeOut, fontFamily: inter.fontFamily }}
    >
      {voiceOver ? <Audio src={staticFile(voiceOver)} /> : null}

      {/* Memphis shapes pop in from the corners */}
      <Circle
        className="absolute text-sun"
        style={{
          top: -140,
          right: -120,
          width: 520,
          transform: `scale(${shapesIn[0]}) translateY(${drift}px)`,
        }}
      />
      <Triangle
        className="absolute text-accent"
        style={{
          bottom: -60,
          left: 80,
          width: 300,
          transform: `scale(${shapesIn[1]}) rotate(-12deg) translateY(${-drift}px)`,
        }}
      />
      <HalfCircle
        className="absolute text-brand"
        style={{ bottom: 0, right: 220, width: 260, transform: `scale(${shapesIn[2]})` }}
      />
      <Zigzag
        className="absolute"
        stroke="#006dd8"
        style={{ top: 120, left: 60, width: 340, transform: `scale(${shapesIn[3]}) rotate(-8deg)` }}
      />
      <Confetti
        className="absolute"
        style={{ top: 80, right: 520, width: 320, transform: `scale(${shapesIn[4]})` }}
      />

      <AbsoluteFill className="items-center justify-center">
        {/* Title on a blue block with a hard red shadow */}
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
          <Squiggle
            className="mt-10 w-72"
            stroke="#ffbe00"
            style={{ opacity: squiggleIn, transform: `scaleX(${squiggleIn})` }}
          />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
