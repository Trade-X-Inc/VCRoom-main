import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { submitToWaitlist, type WaitlistRole } from "@/lib/waitlist";

// SEO-020 Phase 2 — mounted once in __root.tsx (see that file's own
// comment on why: there is no single shared public-layout route in this
// codebase — all 49 public route files individually render their own
// SiteHeader/SiteFooter, confirmed by grep before concluding this —
// so __root.tsx's RootComponent is the only place that wraps every
// route without editing 49 files. Self-gates on pathname below instead
// of relying on route placement, which is what actually keeps this off
// /app/* and the other excluded routes.

const STORAGE_KEY = "lengdon-waitlist-prompt";
const DISMISS_DAYS = 14;
const SHOW_AFTER_MS = 25_000;
const SCROLL_THRESHOLD = 0.25;

type StoredState = { dismissedAt?: number; submitted?: boolean };

function readState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(next: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, blocked) — prompt may show again
    // next load. Never block the UI over this, same discipline as
    // CookieConsentBanner's own writeConsent().
  }
}

function isSuppressed(): boolean {
  const s = readState();
  if (s.submitted) return true;
  if (s.dismissedAt && Date.now() - s.dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return true;
  return false;
}

const EXCLUDED_PREFIXES = ["/sign-up", "/sign-in", "/forgot-password", "/legal", "/app", "/join"];

const INVESTOR_ROUTES = new Set([
  "/for/investors",
  "/for/angels",
  "/for/venture-capital",
  "/for/private-equity",
  "/for/family-offices",
  "/for/limited-partners",
  "/for/syndicates",
  "/for/spvs",
  "/for/advisors",
]);

function inferRole(pathname: string): WaitlistRole {
  return INVESTOR_ROUTES.has(pathname) ? "investor" : "founder";
}

// Mirrors CookieConsentBanner's own body-class toggle (BODY_PADDING_CLASS
// in that file) — polling document.body's class list is how this
// component learns the banner is "resolved" (answered, in which case the
// class is removed, or never shown at all, in which case it was never
// added) without duplicating that component's CONSENT_KEY read logic or
// adding a new context just for this one signal.
const COOKIE_BANNER_BODY_CLASS = "lengdon-cookie-banner-visible";

function cookieBannerVisible(): boolean {
  return document.body.classList.contains(COOKIE_BANNER_BODY_CLASS);
}

export function WaitlistPrompt() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const excluded = EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));

  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const shownRef = useRef(false);
  const triggeredRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const isFinePointer = useRef(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Reset per-page-view trigger state on navigation — "one show per page
  // view" per spec. Does not reset suppression (that's the 14-day/
  // forever localStorage state, checked separately on each attempt).
  useEffect(() => {
    shownRef.current = false;
    triggeredRef.current = false;
    setOpen(false);
    setEligible(false);
  }, [pathname]);

  useEffect(() => {
    if (excluded || typeof window === "undefined") return;
    if (isSuppressed()) return;

    isFinePointer.current = window.matchMedia("(pointer: fine)").matches;

    // Wait for the cookie banner to be resolved (answered or never shown)
    // before this is even eligible to appear, per spec. Polled rather
    // than event-driven since CookieConsentBanner exposes no event/context
    // for this — the body class is the only observable signal it provides.
    //
    // The first check deliberately waits two animation frames before
    // reading anything, rather than checking synchronously. Found live:
    // CookieConsentBanner's own visibility starts false on its first
    // render and only becomes true (adding BODY_PADDING_CLASS) after ITS
    // OWN first effect fires and triggers a second render + a second
    // effect. Both components mount in the same tick, so a synchronous
    // first check here ran before that two-step process had added the
    // class — reading "banner not visible" when the banner was in fact
    // about to render, for a reason that had nothing to do with consent
    // actually being resolved (reproduced live: popup opened while the
    // banner was still showing, unanswered, on a fresh profile). Two
    // rAF callbacks guarantee at least two full paint cycles have
    // elapsed — matching the two-render sequence CookieConsentBanner
    // itself needs — before this component trusts what it reads, which
    // a fixed millisecond delay would only approximate.
    let cancelled = false;
    const waitForBanner = () =>
      new Promise<void>((resolve) => {
        const check = () => {
          if (cancelled) return;
          if (!cookieBannerVisible()) {
            resolve();
          } else {
            setTimeout(check, 500);
          }
        };
        requestAnimationFrame(() => requestAnimationFrame(check));
      });

    let timeTrigger = false;
    let scrollTrigger = false;
    let exitTrigger = false;

    const maybeShow = () => {
      if (triggeredRef.current || shownRef.current) return;
      if ((timeTrigger && scrollTrigger) || exitTrigger) {
        triggeredRef.current = true;
        setEligible(true);
      }
    };

    const startTimer = () => {
      return setTimeout(() => {
        timeTrigger = true;
        maybeShow();
      }, SHOW_AFTER_MS);
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return;
      const pct = window.scrollY / scrollable;
      if (pct >= SCROLL_THRESHOLD) {
        scrollTrigger = true;
        maybeShow();
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      if (!isFinePointer.current) return;
      if (e.clientY <= 0 && !e.relatedTarget) {
        exitTrigger = true;
        maybeShow();
      }
    };

    let timerId: ReturnType<typeof setTimeout> | null = null;

    waitForBanner().then(() => {
      if (cancelled) return;
      timerId = startTimer();
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("mouseout", onMouseOut);
    });

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [pathname, excluded]);

  useEffect(() => {
    if (eligible && !shownRef.current && !isSuppressed()) {
      shownRef.current = true;
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }
  }, [eligible]);

  useEffect(() => {
    if (open) {
      // Focus moves to the field on open, per spec.
      const t = setTimeout(() => emailInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const close = (dismissed: boolean) => {
    setClosing(true);
    const finish = () => {
      setOpen(false);
      setClosing(false);
      if (dismissed) {
        writeState({ ...readState(), dismissedAt: Date.now() });
      }
      // Focus returns to whatever had it before the prompt opened.
      lastFocusedRef.current?.focus?.();
    };
    // No slide animation when prefers-reduced-motion is set — close
    // immediately rather than waiting on a transition that was never
    // rendered (the dialog classNames below also drop the transition
    // class entirely in that case, so this mirrors what's actually drawn).
    if (reducedMotion) {
      finish();
    } else {
      setTimeout(finish, 200);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-close 4s after success.
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => close(false), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading" || status === "success") return;
    setStatus("loading");
    setErrorText("");
    const role = inferRole(pathname);
    const result = await submitToWaitlist({ email, role, source: "popup" });
    if (result.ok) {
      writeState({ ...readState(), submitted: true });
      setStatus("success");
    } else {
      setStatus("error");
      setErrorText(result.error || "Something went wrong. Please try again.");
    }
  };

  if (excluded || !open) return null;

  return (
    <>
      {/* Mobile bottom sheet */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="waitlist-prompt-heading"
        className={`sm:hidden fixed inset-x-0 bottom-0 z-[180] bg-white border-t border-[#e6e9ef] ${
          reducedMotion ? "" : "transition-transform duration-200"
        } ${closing ? "translate-y-full" : "translate-y-0"}`}
        style={{
          maxHeight: "40vh",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 24px rgba(10,37,64,0.12)",
          // Never overlaps the cookie banner: sits above it by exactly its
          // height while the banner is visible, read live rather than
          // cached, since the banner can resolve while this is open.
          bottom: cookieBannerVisible() ? "96px" : "0",
        }}
      >
        <PromptBody
          variant="sheet"
          email={email}
          setEmail={setEmail}
          status={status}
          errorText={errorText}
          onSubmit={handleSubmit}
          onClose={() => close(true)}
          emailInputRef={emailInputRef}
        />
      </div>

      {/* Desktop card, bottom-right */}
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="waitlist-prompt-heading"
        className={`hidden sm:block fixed z-[180] w-[360px] bg-white border border-[#e6e9ef] ${
          reducedMotion ? "" : "transition-all duration-200"
        } ${closing ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
        style={{
          right: "24px",
          bottom: cookieBannerVisible() ? "104px" : "24px",
          boxShadow: "0 12px 40px rgba(10,37,64,0.16)",
        }}
      >
        <PromptBody
          variant="card"
          email={email}
          setEmail={setEmail}
          status={status}
          errorText={errorText}
          onSubmit={handleSubmit}
          onClose={() => close(true)}
          emailInputRef={emailInputRef}
        />
      </div>
    </>
  );
}

function PromptBody({
  variant,
  email,
  setEmail,
  status,
  errorText,
  onSubmit,
  onClose,
  emailInputRef,
}: {
  variant: "sheet" | "card";
  email: string;
  setEmail: (v: string) => void;
  status: "idle" | "loading" | "success" | "error";
  errorText: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const padding = variant === "sheet" ? "px-5 pt-5 pb-2" : "p-6";
  return (
    <div className={padding}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h2
          id="waitlist-prompt-heading"
          style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
          className="font-semibold text-[#0a2540] text-[17px] tracking-[-0.3px]"
        >
          Get early access to Lengdon
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 flex items-center justify-center text-[#64748b] hover:text-[#0a2540] transition-colors"
          style={{ width: 44, height: 44, margin: "-10px -10px 0 0" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {status === "success" ? (
        <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#0a2540] text-[13.5px] leading-[1.6]">
          You're on the list. We will email you as onboarding opens.
        </p>
      ) : (
        <>
          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#64748b] text-[13px] leading-[1.5] mb-4">
            Private beta, onboarding in stages.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
            <label htmlFor="waitlist-prompt-email" className="sr-only">
              Email address
            </label>
            <input
              ref={emailInputRef}
              id="waitlist-prompt-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@firm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ fontFamily: "'Inter:Regular', sans-serif", minHeight: 44 }}
              className="border border-[#e6e9ef] px-3.5 text-[13.5px] text-[#0a2540] placeholder-[#94a3b8] focus:outline-none focus:border-[#0a2540] transition-colors"
            />
            {status === "error" && (
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-red-600 text-[12.5px]">
                {errorText}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              style={{ fontFamily: "'Geist:SemiBold', sans-serif", minHeight: 44 }}
              className="bg-[#0a2540] hover:bg-[#13233a] disabled:opacity-50 text-white font-semibold text-[13.5px] transition-colors duration-150"
            >
              {status === "loading" ? "Joining…" : "Join the waitlist"}
            </button>
          </form>
          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[11px] mt-3">
            <Link to="/legal/privacy" className="underline hover:no-underline">
              Privacy Policy
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
