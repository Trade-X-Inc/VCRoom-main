import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { StatusDot } from "@/components/system";
import { EmptyState } from "@/components/system";
import type { SectionStatus } from "@/hooks/useRaiseProgress";

/**
 * One section of a step page (/app/prepare, /app/go-live, /app/close).
 * Wraps existing page components untouched — this provides the accordion
 * chrome: 11px label, status dot, collapse state, anchor deep-linking.
 *
 * Complete sections collapse by default; in-progress expand; not-started
 * collapse. The URL hash (#verification) force-expands + scrolls.
 */
export function PrepareSection({
  id,
  label,
  status,
  summary,
  children,
}: {
  id: string;
  label: string;
  status: SectionStatus;
  /** One line max — shown while collapsed. */
  summary?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(status === "in-progress");
  const [everOpened, setEverOpened] = useState(status === "in-progress");
  const ref = useRef<HTMLElement>(null);

  // Hash deep-link: expand + scroll when targeted, now and on hash change.
  useEffect(() => {
    const check = () => {
      if (window.location.hash === `#${id}`) {
        setOpen(true);
        setEverOpened(true);
        // Twice: once immediately, once after the lazy content mounts and
        // shifts the layout.
        setTimeout(
          () => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          80,
        );
        setTimeout(
          () => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          900,
        );
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [id]);

  const tone =
    status === "complete"
      ? ("positive" as const)
      : status === "in-progress"
        ? ("warning" as const)
        : ("neutral" as const);
  const statusLabel =
    status === "complete"
      ? "Done"
      : status === "in-progress"
        ? "In progress"
        : "Not started";

  return (
    <section id={id} ref={ref} className="hs-hairline-t" style={{ scrollMarginTop: 24 }}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setEverOpened(true);
        }}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        data-testid={`section-${id}`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <span
            style={{
              fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.35)",
            }}
          >
            {label}
          </span>
          {!open && summary && (
            <span className="text-xs text-muted-foreground truncate">{summary}</span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <StatusDot tone={tone} label={statusLabel} />
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform"
            style={{
              color: "rgba(0,0,0,0.35)",
              transform: open ? "rotate(180deg)" : undefined,
            }}
          />
        </div>
      </button>
      {open && (
        <div className="pb-12">
          <Suspense fallback={<EmptyState kind="loading" title="Loading" />}>
            {everOpened ? children : null}
          </Suspense>
        </div>
      )}
    </section>
  );
}
