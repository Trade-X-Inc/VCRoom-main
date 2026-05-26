export function Logo({
  withWordmark = true,
  size = "default",
}: {
  withWordmark?: boolean;
  size?: "default" | "lg";
}) {
  const badge =
    size === "lg"
      ? "grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-base shrink-0"
      : "grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-sm shrink-0";
  const wordmark =
    size === "lg"
      ? "font-bold text-[17px] tracking-tight text-foreground"
      : "font-bold text-[15px] tracking-tight text-foreground";

  return (
    <div className="flex items-center gap-2">
      <div className={badge}>H</div>
      {withWordmark && <span className={wordmark}>Hockeystick</span>}
    </div>
  );
}
