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
        <span className={`font-bold tracking-tight text-foreground ${size === "lg" ? "text-[18px]" : "text-[15px]"}`}>
          Hockystick
        </span>
      )}
    </div>
  );
}
