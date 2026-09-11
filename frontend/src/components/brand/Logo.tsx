// Icon: the reference-line monogram, refreshed 9 Sep 2026 with new
// professionally-designed assets (full logo + icon-only mark + OG image,
// all sourced from public/). Rendered from /lengdon-logo-icon.png — a
// transparent-background PNG, correct for this use (composited over
// whatever surface the shell renders behind it); the opaque-background
// counterpart used for the browser-tab favicon set is a separate file
// (public/favicon.ico + favicon-*.png, generated from the designer's
// Favicon.png). No vector source available, so the raster PNG remains
// the single source of truth for the mark. Wordmark: Archivo Bold,
// tight tracking, ledger navy.
export function Logo({
  withWordmark = true,
  size = "default",
}: {
  withWordmark?: boolean;
  size?: "default" | "lg";
}) {
  const dim = size === "lg" ? 40 : 32;

  return (
    <div className="flex items-center gap-2">
      <img
        src="/lengdon-logo-icon.png"
        alt="Lengdon"
        width={dim}
        height={dim}
        className="shrink-0"
      />
      {withWordmark && (
        <span
          style={{
            fontFamily: "var(--font-v2-ui)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#1B3A63",
            fontSize: size === "lg" ? "18px" : "15px",
          }}
        >
          Lengdon
        </span>
      )}
    </div>
  );
}
