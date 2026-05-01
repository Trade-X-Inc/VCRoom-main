import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const opts: { v: Theme; label: string; icon: any }[] = [
    { v: "light", label: "Light", icon: Sun },
    { v: "dark", label: "Dark", icon: Moon },
    { v: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Toggle theme"
      >
        {resolved === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-40 rounded-lg border border-border/60 bg-popover shadow-elev p-1 z-50">
          {opts.map((o) => (
            <button
              key={o.v}
              onClick={() => { setTheme(o.v); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent",
                theme === o.v && "bg-accent text-foreground font-medium"
              )}
            >
              <o.icon className="h-3.5 w-3.5" /> {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
