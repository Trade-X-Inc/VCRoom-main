// Icon: the reference-line monogram (PUBLIC-REGISTER.md §10 item 1,
// resolved 17 Aug 2026), rendered from /favicon.svg. Wordmark: Archivo
// Bold, tight tracking, ledger navy — Direction A paired with Direction B,
// since a wordmark alone has no icon-sized form. Both directions, one mark.
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
        src="/favicon.svg"
        alt="Hockystick"
        width={dim}
        height={dim}
        className="shrink-0"
        style={{ imageRendering: "crisp-edges" }}
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
          Hockystick
        </span>
      )}
    </div>
  );
}
