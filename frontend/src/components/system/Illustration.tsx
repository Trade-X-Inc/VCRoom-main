/**
 * The Hockystick characters — minimal line-art figures for empty, loading,
 * error and no-results states. 64×64, 2px stroke, ink only (currentColor),
 * round caps. Like Notion's empty states, but warmer.
 *
 * Never show a spinner: the loading figure walks instead.
 */

export type IllustrationName = "empty" | "loading" | "error" | "no-results";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** A small figure sitting on the edge of an empty box, legs dangling. */
function Empty() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden {...STROKE}>
      {/* open box */}
      <path d="M14 42 H50 V58 H14 Z" />
      <path d="M14 42 L8 36" />
      <path d="M50 42 L56 36" />
      {/* figure sitting on the left edge */}
      <circle cx="24" cy="27" r="5" />
      <path d="M24 32 V42" />
      {/* hands resting on the edge */}
      <path d="M24 36 L18 42" />
      <path d="M24 36 L30 42" />
      {/* legs dangling over the front */}
      <path d="M22 42 V51 L20 53" />
      <path d="M27 42 V52 L29 53" />
    </svg>
  );
}

/** The figure walking slowly. Two leg poses swap via CSS steps(). */
function Loading() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      aria-hidden
      className="hs-walk-bob"
      {...STROKE}
    >
      <circle cx="32" cy="17" r="5" />
      <path d="M32 22 V38" />
      {/* pose A */}
      <g className="hs-walk-a">
        <path d="M32 27 L25 34" />
        <path d="M32 27 L39 32" />
        <path d="M32 38 L25 50 L23 50" />
        <path d="M32 38 L40 48 L42 48" />
      </g>
      {/* pose B */}
      <g className="hs-walk-b">
        <path d="M32 27 L39 34" />
        <path d="M32 27 L25 32" />
        <path d="M32 38 L39 50 L41 50" />
        <path d="M32 38 L26 49 L24 49" />
      </g>
      {/* ground ticks */}
      <path d="M12 54 H18" opacity="0.35" />
      <path d="M46 54 H52" opacity="0.35" />
    </svg>
  );
}

/** The figure with hands up in a gentle shrug. */
function ErrorFig() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden {...STROKE}>
      <circle cx="32" cy="17" r="5" />
      <path d="M32 22 V40" />
      {/* shrug arms, palms up */}
      <path d="M32 27 L22 23 L19 25" />
      <path d="M32 27 L42 23 L45 25" />
      {/* legs */}
      <path d="M32 40 L26 53" />
      <path d="M32 40 L38 53" />
      {/* a small stray mark, slightly off-kilter */}
      <path d="M46 10 L48 8" opacity="0.35" />
    </svg>
  );
}

/** The figure scanning the horizon through binoculars. */
function NoResults() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden {...STROKE}>
      <circle cx="28" cy="20" r="5" />
      <path d="M28 25 V42" />
      {/* arms raised to the binoculars */}
      <path d="M28 30 L40 17" />
      <path d="M28 32 L42 22" />
      {/* binoculars */}
      <circle cx="44" cy="14" r="3.5" />
      <circle cx="51" cy="17" r="3.5" />
      {/* sight lines */}
      <path d="M50 8 L54 5" opacity="0.35" />
      <path d="M56 13 L60 12" opacity="0.35" />
      {/* legs */}
      <path d="M28 42 L23 54" />
      <path d="M28 42 L33 54" />
    </svg>
  );
}

const FIGURES: Record<IllustrationName, () => React.ReactElement> = {
  empty: Empty,
  loading: Loading,
  error: ErrorFig,
  "no-results": NoResults,
};

export function Illustration({
  name,
  className,
}: {
  name: IllustrationName;
  className?: string;
}) {
  const Figure = FIGURES[name];
  return (
    <span className={className} style={{ display: "inline-flex", color: "#0A0A0B" }}>
      <Figure />
    </span>
  );
}
