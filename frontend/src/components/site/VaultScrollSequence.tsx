import { useEffect, useRef, useState } from "react";

/*
  VaultScrollSequence — a scroll-scrubbed canvas image sequence, no libraries.

  How it stays smooth (per the three rules):
  1. Pre-decoded frames — every frame is an Image() that has finished loading
     (and we call .decode() so the bitmap is ready) before it's ever drawn.
  2. rAF gating — scroll events only record the target scroll position; the
     actual canvas draw happens in a single requestAnimationFrame loop and ONLY
     when the computed frame index changes. No draw-per-scroll-event.
  3. No layout thrash — the only per-frame op is ctx.drawImage on a fixed-size
     canvas. No CSS transforms, no opacity, no DOM frame swaps.
*/

const FRAME_COUNT = 240;
const DESKTOP_DIR = "/vault/desktop";
const MOBILE_DIR = "/vault/mobile";
const CONCURRENCY = 4;
const MOBILE_BREAKPOINT = 768;

const framePath = (dir: string, i: number) =>
  `${dir}/frame-${String(i).padStart(3, "0")}.webp`;

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function VaultScrollSequence({ children }: { children?: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const loadedRef = useRef<boolean[]>([]);
  const currentFrameRef = useRef<number>(-1);
  const targetProgressRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const [loadPct, setLoadPct] = useState(0);
  const [ready, setReady] = useState(false); // 30%+ loaded → scrubbing enabled
  // Resolve mode synchronously on first render so the load effect never fires once
  // with the wrong frame set (which would double-load desktop frames on mobile).
  // SSR-safe: window is undefined server-side → defaults to desktop, non-reduced.
  const [reduced] = useState(() =>
    typeof window !== "undefined" && prefersReducedMotion());
  const [isMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT);

  // Draw a given frame index to the canvas (letterbox-cover to fill).
  const drawFrame = (idx: number) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[idx];
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    let dw = cw, dh = ch, dx = 0, dy = 0;
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; }
    else { dw = cw; dh = cw / ir; dy = (ch - dh) / 2; }
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
    currentFrameRef.current = idx;
  };

  // Size the canvas to its display box * DPR for crisp rendering.
  const sizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    // redraw whatever frame we're on after a resize
    const cur = currentFrameRef.current;
    if (cur >= 0 && framesRef.current[cur]) drawFrame(cur);
  };

  // Load pipeline: frame 1 first (LCP), then the rest with a concurrency limit.
  useEffect(() => {
    if (reduced) return; // reduced-motion: static frame handled separately
    const dir = isMobile ? MOBILE_DIR : DESKTOP_DIR;
    framesRef.current = new Array(FRAME_COUNT + 1).fill(null);
    loadedRef.current = new Array(FRAME_COUNT + 1).fill(false);
    let loadedCount = 0;
    let cancelled = false;

    const loadOne = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.src = framePath(dir, i);
        const done = () => {
          if (cancelled) return resolve();
          framesRef.current[i] = img;
          loadedRef.current[i] = true;
          loadedCount++;
          const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
          setLoadPct(pct);
          if (pct >= 30) setReady(true);
          resolve();
        };
        // decode() gives us a ready-to-draw bitmap; fall back to onload
        img.decode?.().then(done).catch(() => { img.onload = done; img.onerror = done; });
        if (!img.decode) { img.onload = done; img.onerror = done; }
      });

    // Frame 1 immediately (this is the LCP / initial paint).
    loadOne(1).then(() => {
      if (!cancelled) drawFrame(1);
    });

    // Remaining frames via a simple concurrency-limited queue.
    const queue: number[] = [];
    for (let i = 2; i <= FRAME_COUNT; i++) queue.push(i);
    let active = 0;
    const pump = () => {
      while (active < CONCURRENCY && queue.length && !cancelled) {
        const i = queue.shift()!;
        active++;
        loadOne(i).then(() => { active--; pump(); });
      }
    };
    pump();

    return () => { cancelled = true; };
  }, [reduced, isMobile]);

  // Scroll + rAF loop: map wrapper scroll to a frame, draw only on change.
  useEffect(() => {
    if (reduced) return;
    const onScroll = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      // progress 0→1 across the tall wrapper
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      targetProgressRef.current = p;
    };

    const tick = () => {
      if (ready) {
        const p = targetProgressRef.current;
        // map progress to an available (loaded) frame
        let idx = Math.min(FRAME_COUNT, Math.max(1, Math.round(p * (FRAME_COUNT - 1)) + 1));
        if (!loadedRef.current[idx]) {
          // nearest loaded frame below, so scrubbing never stalls on a gap
          let j = idx;
          while (j > 1 && !loadedRef.current[j]) j--;
          idx = j;
        }
        if (idx !== currentFrameRef.current && loadedRef.current[idx]) drawFrame(idx);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sizeCanvas);
    sizeCanvas();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sizeCanvas);
      cancelAnimationFrame(rafRef.current);
    };
  }, [ready, reduced]);

  // Reduced-motion: render the final open-vault frame as a static image, no canvas/scroll.
  if (reduced) {
    return (
      <div className="relative w-full" style={{ background: "#0A0A0B" }}>
        <div className="relative min-h-screen w-full overflow-hidden">
          <img
            src={framePath(isMobile ? MOBILE_DIR : DESKTOP_DIR, FRAME_COUNT)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="relative z-10">{children}</div>
        </div>
      </div>
    );
  }

  const scrubHeight = isMobile ? "200vh" : "300vh";

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ height: scrubHeight, background: "#0A0A0B" }}>
      {/* Sticky viewport: canvas + overlaid hero content */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ background: "#0A0A0B" }}
          aria-hidden="true"
        />
        {/* subtle darkening so overlaid white text always clears AA on lighter frames */}
        <div className="absolute inset-0" style={{ background: "rgba(10,10,11,0.45)" }} aria-hidden="true" />

        {/* Minimal loading indicator until 30% loaded */}
        {!ready && (
          <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center">
            <div className="flex items-center gap-3 px-4 py-2" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-1 w-32" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div className="h-1" style={{ width: `${loadPct}%`, background: "#7C3AED" }} />
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "DM Sans, sans-serif" }}>
                Loading {loadPct}%
              </span>
            </div>
          </div>
        )}

        {/* Hero content overlay */}
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
