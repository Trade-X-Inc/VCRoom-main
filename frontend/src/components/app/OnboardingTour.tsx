import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWPORT_MARGIN = 8;

export interface TourStep {
  id: string;
  target?: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
  cta?: { label: string; onClick: () => void };
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function useTargetRect(selector: string | undefined): TargetRect | null {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector(selector!);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [selector]);

  return rect;
}

function useElementSize<T extends HTMLElement>(deps: unknown[]): [React.RefObject<T | null>, { width: number; height: number } | null] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setSize({ width: r.width, height: r.height });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [ref, size];
}

export function OnboardingTour({
  steps,
  activeIndex,
  onNext,
  onSkip,
  onFinish,
}: {
  steps: TourStep[];
  activeIndex: number;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const step = steps[activeIndex];
  const isLast = activeIndex === steps.length - 1;
  const targetSelector = step?.target ? `[data-tour="${step.target}"]` : undefined;
  const rect = useTargetRect(targetSelector);
  const [cardRef, cardSize] = useElementSize<HTMLDivElement>([step?.id, rect?.top, rect?.left]);

  useEffect(() => {
    if (!step) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onSkip();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [step, onSkip]);

  if (!step) return null;

  const hasTarget = !!targetSelector && !!rect;

  // Once we know the card's real size, decide if it fits anchored to the
  // target in either direction. If not, fall back to the centered modal
  // so the card never renders clipped off-screen.
  let anchoredStyle: React.CSSProperties | null = null;
  if (hasTarget) {
    const cardWidth = cardSize?.width ?? 384; // max-w-sm fallback before first measure
    const cardHeight = cardSize?.height ?? 160;

    const fitsBelow = rect!.top + rect!.height + 16 + cardHeight <= window.innerHeight - VIEWPORT_MARGIN;
    const fitsAbove = rect!.top - 16 - cardHeight >= VIEWPORT_MARGIN;

    if (fitsBelow || fitsAbove) {
      const top = fitsBelow
        ? rect!.top + rect!.height + 16
        : rect!.top - 16 - cardHeight;
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect!.left, window.innerWidth - cardWidth - VIEWPORT_MARGIN),
      );
      anchoredStyle = { position: "fixed", top, left, pointerEvents: "auto" };
    }
  }

  function handlePrimary() {
    if (isLast) onFinish();
    else onNext();
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" style={{ pointerEvents: hasTarget && anchoredStyle ? "none" : undefined }}>
      {hasTarget && anchoredStyle ? (
        <>
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-[1px] transition-all duration-200 pointer-events-none"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, ${rect!.left - 6}px 100%, ${rect!.left - 6}px ${rect!.top - 6}px,
                ${rect!.left + rect!.width + 6}px ${rect!.top - 6}px,
                ${rect!.left + rect!.width + 6}px ${rect!.top + rect!.height + 6}px,
                ${rect!.left - 6}px ${rect!.top + rect!.height + 6}px,
                ${rect!.left - 6}px 100%, 100% 100%, 100% 0%
              )`,
            }}
          />
          <div
            className="fixed rounded-lg ring-2 ring-brand pointer-events-none transition-all duration-200"
            style={{
              top: rect!.top - 6,
              left: rect!.left - 6,
              width: rect!.width + 12,
              height: rect!.height + 12,
            }}
          />
          <TourCard
            cardRef={cardRef}
            step={step}
            steps={steps}
            activeIndex={activeIndex}
            isLast={isLast}
            onSkip={onSkip}
            onPrimary={handlePrimary}
            style={anchoredStyle}
          />
        </>
      ) : (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
          onClick={onSkip}
        >
          <TourCard
            cardRef={cardRef}
            step={step}
            steps={steps}
            activeIndex={activeIndex}
            isLast={isLast}
            onSkip={onSkip}
            onPrimary={handlePrimary}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function TourCard({
  cardRef,
  step,
  steps,
  activeIndex,
  isLast,
  onSkip,
  onPrimary,
  style,
  onClick,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  step: TourStep;
  steps: TourStep[];
  activeIndex: number;
  isLast: boolean;
  onSkip: () => void;
  onPrimary: () => void;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={style}
      className="w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-elev p-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{step.title}</div>
        <button
          onClick={onSkip}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
          title="Skip tour"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed mb-5">{step.body}</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIndex ? "w-4 hs-gradient" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {step.cta && (
            <button
              onClick={step.cta.onClick}
              className="rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              {step.cta.label}
            </button>
          )}
          <button
            onClick={onPrimary}
            className="rounded-md bg-gradient-brand px-3 py-1.5 text-xs font-medium text-brand-foreground shadow-glow hover:opacity-90"
          >
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
