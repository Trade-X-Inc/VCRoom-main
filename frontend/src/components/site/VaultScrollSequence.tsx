import { useEffect, useRef, useState } from "react";

/*
  VaultScrollSequence — a full-page fixed-background canvas image sequence
  driven by real page scroll (no scroll-hijacking, no libraries).

  Architecture (v2 — full-page fixed background):
  - The canvas is `position: fixed`, covers the whole viewport, and sits
    behind all page content (z-index below everything). It does not wrap
    hero content and does not create its own tall scroll zone — the page's
    OWN scroll (from top to the FAQ section) drives the frame index.
  - Frame 1 = scrollY 0. Frame 199 = the FAQ section's top offset. Past that,
    the vault holds on the last frame, static.
  - Rendered once, standalone, near the top of the page tree (see index.tsx);
    every section above it needs a transparent background so the canvas
    shows through, and every section from the problem section onward needs
    an opaque bg so the canvas visually disappears beneath it.

  How it stays smooth (unchanged from v1):
  1. Pre-decoded frames — every frame is an Image() that has finished loading
     (and we call .decode() so the bitmap is ready) before it's ever drawn.
  2. rAF gating — scroll events only record the target scroll position; the
     actual canvas draw happens in a single requestAnimationFrame loop and ONLY
     when the computed frame index changes. No draw-per-scroll-event.
  3. No layout thrash — the only per-frame op is ctx.drawImage on a fixed-size
     canvas. No CSS transforms, no opacity, no DOM frame swaps.
*/

const FRAME_COUNT = 199;
const DESKTOP_DIR = "/vault/desktop";
const MOBILE_DIR = "/vault/mobile";
const CONCURRENCY = 4;
const MOBILE_BREAKPOINT = 768;
export const FAQ_SECTION_ID = "faq-section";

const framePath = (dir: string, i: number) =>
  `${dir}/frame-${String(i).padStart(3, "0")}.webp`;

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function VaultScrollSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const loadedRef = useRef<boolean[]>([]);
  const currentFrameRef = useRef<number>(-1);
  const targetProgressRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const faqOffsetRef = useRef<number>(0);

  const bgColorRef = useRef<string>("#FFFFFF");

  const [loadPct, setLoadPct] = useState(0);
  const [ready, setReady] = useState(false); // 30%+ loaded → scrubbing enabled
  // Resolve mode synchronously on first render so the load effect never fires once
  // with the wrong frame set (which would double-load desktop frames on mobile).
  // SSR-safe: window is undefined server-side → defaults to desktop, non-reduced.
  const [reduced] = useState(() =>
    typeof window !== "undefined" && prefersReducedMotion());
  const [isMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT);

  // Cover-fit draw: scale so the frame fills the ENTIRE viewport (both
  // dimensions), crop the excess, centered. Fill with the frame's OWN sampled
  // background color first (not a hardcoded white) so an ultra-wide viewport's
  // exposed margin blends seamlessly into the frame edge instead of risking a
  // visible seam if a future frame set isn't pure white.
  const drawFrame = (idx: number) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[idx];
    const ctx = canvas?.getContext("2d");
    if (!canvas || !img || !ctx) return;
    const cw = canvas.width, ch = canvas.height;
    ctx.fillStyle = bgColorRef.current;
    ctx.fillRect(0, 0, cw, ch);
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    currentFrameRef.current = idx;
  };

  // Size the canvas to the full viewport * DPR for crisp rendering.
  const sizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    const cur = currentFrameRef.current;
    if (cur >= 0 && framesRef.current[cur]) drawFrame(cur);
  };

  // Sample the frame's own corner pixel color (a 1x1 offscreen canvas read) so
  // the fill behind the cover-fit crop matches the frame exactly, rather than
  // assuming pure white — protects against a future frame set with an
  // off-white/grey background producing a visible seam at wide viewports.
  const sampleBgColor = (img: HTMLImageElement) => {
    try {
      const sample = document.createElement("canvas");
      sample.width = 1;
      sample.height = 1;
      const sctx = sample.getContext("2d");
      if (!sctx) return;
      sctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = sctx.getImageData(0, 0, 1, 1).data;
      bgColorRef.current = `rgb(${r}, ${g}, ${b})`;
    } catch {
      // canvas read can throw on a tainted/cross-origin image; keep the white default
    }
  };

  // Measure the FAQ section's top offset from the page top (frame 199 target).
  const measureFaqOffset = () => {
    const el = document.getElementById(FAQ_SECTION_ID);
    if (el) {
      const rect = el.getBoundingClientRect();
      faqOffsetRef.current = rect.top + window.scrollY;
    }
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
      if (!cancelled) {
        const img = framesRef.current[1];
        if (img) sampleBgColor(img);
        sizeCanvas();
        drawFrame(1);
      }
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

  // Scroll + rAF loop: map real page scroll (0 -> FAQ offset) to a frame,
  // draw only on change. Scrolling up reverses naturally since frame index
  // is a pure function of scrollY, not a monotonic counter.
  useEffect(() => {
    if (reduced) return;

    const onScroll = () => {
      const faqOffset = faqOffsetRef.current;
      const p = faqOffset > 0 ? Math.min(1, Math.max(0, window.scrollY / faqOffset)) : 0;
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

    const remeasure = () => { measureFaqOffset(); onScroll(); };

    // Measure once now, and again after fonts/images settle layout (a common
    // source of an inaccurate FAQ offset on first paint).
    remeasure();
    const remeasureTimer = window.setTimeout(remeasure, 500);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { sizeCanvas(); remeasure(); });
    sizeCanvas();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
      window.clearTimeout(remeasureTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [ready, reduced]);

  // Reduced-motion: fixed full-viewport static image of the final frame, no
  // canvas, no scroll listener.
  if (reduced) {
    return (
      <div
        className="fixed inset-0 z-0"
        style={{ background: "#FFFFFF" }}
        aria-hidden="true"
      >
        <img
          src={framePath(isMobile ? MOBILE_DIR : DESKTOP_DIR, FRAME_COUNT)}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 h-screen w-screen"
        style={{ background: "#FFFFFF" }}
        aria-hidden="true"
      />
      {/* Minimal loading indicator until 30% loaded — light surface + ink text
          to read against the white canvas. Fixed so it doesn't scroll with
          the page (the vault it's reporting on is also fixed). */}
      {!ready && (
        <div className="fixed inset-x-0 bottom-8 z-10 flex justify-center">
          <div className="flex items-center gap-3 border px-4 py-2" style={{ background: "rgba(255,255,255,0.9)", borderColor: "#E4E4E7" }}>
            <div className="h-1 w-32" style={{ background: "#E4E4E7" }}>
              <div className="h-1" style={{ width: `${loadPct}%`, background: "#7C3AED" }} />
            </div>
            <span className="text-xs" style={{ color: "#52525B", fontFamily: "DM Sans, sans-serif" }}>
              Loading {loadPct}%
            </span>
          </div>
        </div>
      )}
    </>
  );
}
