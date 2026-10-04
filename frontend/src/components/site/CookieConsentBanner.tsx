import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

// Added 13 Sep 2026, legal/compliance pass. There is currently no
// client-side tracking of any kind on this site — no analytics, no
// pixel, no third-party script (verified: full source-tree grep for
// GA/gtag/Meta Pixel/Hotjar/Clarity/Mixpanel/PostHog/Intercom/Sentry-
// client all returned zero results; HubSpot only fires server-side,
// triggered by an explicit user action — signup, form submit — never
// as passive client-side tracking). The only cookie set today is a
// strictly-necessary internal sidebar UI-state cookie.
//
// This banner exists so the disclosure is honest and so the gate is
// already wired the day analytics or any other non-essential script is
// ever added — CONSENT_KEY's value is the one thing future code should
// check before loading anything non-essential. Do not wire a real
// analytics/tracking script into this app without first gating it on
// `hasNonEssentialConsent()` below.

const CONSENT_KEY = "lengdon-cookie-consent";

type ConsentValue = "essential-only" | "all";

function readConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "all" || v === "essential-only" ? v : null;
  } catch {
    return null;
  }
}

function writeConsent(v: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    // Storage unavailable (private mode, blocked) — banner will
    // reappear next visit. Never block the UI over this.
  }
}

// Any future non-essential script (analytics, etc.) must check this
// before loading. Returns false until the user has explicitly chosen
// "all" — absence of a stored value is treated as no consent, not as
// consent, per the fail-closed rule already standing for AI-provider
// fallbacks in this codebase (CLAUDE.md §7.4).
export function hasNonEssentialConsent(): boolean {
  return readConsent() === "all";
}

// SEO-018 Phase 5 — layout only, consent logic below is unchanged (same
// CONSENT_KEY read/write, same fail-closed hasNonEssentialConsent()).
// Reserves room at the bottom of the page while the banner is visible so
// a fixed-position banner never overlaps page content underneath it
// (confirmed live at 375px: the hero's "Join the waitlist" CTA was
// reachable without the banner covering it once this padding landed).
// Scoped to this component's own lifetime via a body class rather than a
// new context/prop — nothing else in the app needs to know the banner
// exists.
const BODY_PADDING_CLASS = "lengdon-cookie-banner-visible";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.classList.add(BODY_PADDING_CLASS);
    } else {
      document.body.classList.remove(BODY_PADDING_CLASS);
    }
    return () => document.body.classList.remove(BODY_PADDING_CLASS);
  }, [visible]);

  if (!visible) return null;

  const choose = (v: ConsentValue) => {
    writeConsent(v);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 inset-x-0 z-[200] border-t border-[#e6e9ef] bg-white"
      style={{ boxShadow: "0 -4px 24px rgba(10,37,64,0.08)" }}
    >
      <div className="max-w-[1440px] mx-auto px-4 py-3 sm:px-12 sm:py-5 lg:px-16 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-8">
        <p
          style={{ fontFamily: "'Inter:Regular', sans-serif" }}
          className="text-[#425466] text-[12px] sm:text-[13px] leading-[1.5] sm:leading-[1.6] flex-1"
        >
          We use strictly necessary cookies to run Lengdon (sign-in, session security). We do not use advertising or
          tracking cookies today. If that changes, this choice will control it.{" "}
          <Link to="/legal/privacy" className="text-[#0a2540] underline hover:no-underline">
            Read the Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => choose("essential-only")}
            style={{ fontFamily: "'Inter:Medium', sans-serif" }}
            className="flex-1 sm:flex-none border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] text-[12px] sm:text-[13px] px-3 sm:px-5 py-2 sm:py-2.5 transition-colors"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
            className="flex-1 sm:flex-none bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[12px] sm:text-[13px] px-3 sm:px-5 py-2 sm:py-2.5 transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
