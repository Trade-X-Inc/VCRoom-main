import { Globe } from "lucide-react";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function LangSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const cur = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-border/60 hover:bg-accent transition-colors text-xs text-muted-foreground hover:text-foreground"
        aria-label="Change language"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="font-medium uppercase">{cur.code}</span>
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-48 rounded-lg border border-border/60 bg-popover shadow-elev p-1 z-50">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent",
                lang === l.code && "bg-accent font-medium"
              )}
            >
              <span>{l.flag}</span>
              <span className="flex-1 text-start">{l.label}</span>
              <span className="text-[10px] text-muted-foreground uppercase">{l.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
