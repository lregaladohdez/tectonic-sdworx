import type { CSSProperties, ReactNode, SVGProps } from "react";

/*
 * Memphis Milano decorative shapes. All are plain SVG so they work in the
 * Next.js page and inside Remotion compositions alike. Colours come from
 * `currentColor` (set `text-*`) unless a prop says otherwise; the outline is
 * always ink so the shapes read as "drawn" on the paper.
 */

type ShapeProps = SVGProps<SVGSVGElement> & { stroke?: string };

const INK = "#0b0b12";

/** Wavy line, the signature Memphis squiggle. */
export function Squiggle({ stroke = INK, ...props }: ShapeProps) {
  return (
    <svg viewBox="0 0 200 40" fill="none" aria-hidden {...props}>
      <path
        d="M4 20c12-18 24-18 36 0s24 18 36 0 24-18 36 0 24 18 36 0 24-18 36 0"
        stroke={stroke}
        strokeWidth={6}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sharp zigzag ribbon. */
export function Zigzag({ stroke = INK, ...props }: ShapeProps) {
  return (
    <svg viewBox="0 0 200 40" fill="none" aria-hidden {...props}>
      <path
        d="M4 34 28 6l24 28 24-28 24 28 24-28 24 28 24-28 20 28"
        stroke={stroke}
        strokeWidth={6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Outlined triangle filled with currentColor. */
export function Triangle({ stroke = INK, ...props }: ShapeProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden {...props}>
      <path d="M50 6 96 92H4z" fill="currentColor" stroke={stroke} strokeWidth={5} strokeLinejoin="round" />
    </svg>
  );
}

/** Outlined circle filled with currentColor. */
export function Circle({ stroke = INK, ...props }: ShapeProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden {...props}>
      <circle cx="50" cy="50" r="45" fill="currentColor" stroke={stroke} strokeWidth={5} />
    </svg>
  );
}

/** Half circle (flat side down), a classic Memphis "sunrise". */
export function HalfCircle({ stroke = INK, ...props }: ShapeProps) {
  return (
    <svg viewBox="0 0 100 56" aria-hidden {...props}>
      <path d="M4 52a46 46 0 0 1 92 0z" fill="currentColor" stroke={stroke} strokeWidth={5} strokeLinejoin="round" />
    </svg>
  );
}

/** Outlined rectangle with a dense dot fill, like Memphis laminate. */
export function DottedBlock({ stroke = INK, ...props }: ShapeProps) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden {...props}>
      <defs>
        <pattern id="memphis-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="2" fill={stroke} />
        </pattern>
      </defs>
      <rect x="3" y="3" width="114" height="74" fill="currentColor" stroke={stroke} strokeWidth={5} />
      <rect x="3" y="3" width="114" height="74" fill="url(#memphis-dots)" />
    </svg>
  );
}

/** Scatter of small confetti marks in the three brand colours. */
export function Confetti(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 120" fill="none" aria-hidden {...props}>
      <circle cx="18" cy="22" r="6" fill="#006dd8" />
      <path d="M60 10l8 14H52z" fill="#ffbe00" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <rect x="110" y="14" width="14" height="14" fill="#f1002f" transform="rotate(20 117 21)" />
      <path d="M150 30c6-8 12-8 18 0" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <circle cx="40" cy="70" r="5" fill="#f1002f" />
      <path d="M92 60l8 14H84z" fill="#006dd8" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <rect x="140" y="68" width="12" height="12" fill="#ffbe00" transform="rotate(-15 146 74)" />
      <path d="M12 104c6-8 12-8 18 0" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <circle cx="120" cy="104" r="6" fill="#ffbe00" />
      <rect x="180" y="96" width="10" height="10" fill="#006dd8" />
      <path d="M70 92l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={INK} />
    </svg>
  );
}

/**
 * Absolutely positioned decoration. Wrap shapes with it so they sit behind
 * content (pointer-events off, aria hidden) without affecting layout.
 */
export function Deco({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={`pointer-events-none absolute select-none ${className}`} style={style} aria-hidden>
      {children}
    </div>
  );
}
