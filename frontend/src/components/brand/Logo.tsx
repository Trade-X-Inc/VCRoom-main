export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-xs font-semibold">
        VR
      </div>
      {withWordmark && <span className="text-sm font-semibold tracking-tight">Venture Room</span>}
    </div>
  );
}
