// Icon: the reference-line monogram (PUBLIC-REGISTER.md §10 item 1,
// resolved 17 Aug 2026; mark refreshed 25 Aug 2026 with a founder-provided
// asset, rendered from /Lengdon-Favicon.png — same geometry, no vector
// source available so the raster PNG is now the single source of truth
// for the mark, used here and for the generated favicon set). Wordmark:
// Archivo Bold, tight tracking, ledger navy — Direction A paired with
// Direction B, since a wordmark alone has no icon-sized form. Both
// directions, one mark.
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
        src="/Lengdon-Favicon.png"
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
