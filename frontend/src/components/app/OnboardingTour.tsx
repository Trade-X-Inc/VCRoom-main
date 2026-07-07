import { useEffect, useLayoutEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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

  function handlePrimary() {
    if (isLast) onFinish();
    else onNext();
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {hasTarget ? (
        <>
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-[1px] transition-all duration-200"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, ${rect!.left - 6}px 100%, ${rect!.left - 6}px ${rect!.top - 6}px,
                ${rect!.left + rect!.width + 6}px ${rect!.top - 6}px,
                ${rect!.left + rect!.width + 6}px ${rect!.top + rect!.height + 6}px,
                ${rect!.left - 6}px ${rect!.top + rect!.height + 6}px,
                ${rect!.left - 6}px 100%, 100% 100%, 100% 0%
              )`,
            }}
            onClick={onSkip}
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
            step={step}
            steps={steps}
            activeIndex={activeIndex}
            isLast={isLast}
            onSkip={onSkip}
            onPrimary={handlePrimary}
            style={{
              position: "fixed",
              top: rect!.top + rect!.height + 16,
              left: Math.min(rect!.left, window.innerWidth - 360),
            }}
          />
        </>
      ) : (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
          onClick={onSkip}
        >
          <TourCard
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
  step,
  steps,
  activeIndex,
  isLast,
  onSkip,
  onPrimary,
  style,
  onClick,
}: {
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
                i === activeIndex ? "w-4 bg-brand" : "w-1.5 bg-muted",
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
