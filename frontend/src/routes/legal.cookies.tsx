import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// New document, 22 Sep 2026. Content sourced entirely from a live recon
// pass, not assumed "standard" cookie-policy boilerplate:
//   - Full source-tree grep for cookie-setting code: exactly one cookie
//     exists anywhere in the app (sidebar_state, first-party UI-state,
//     7-day persistent). Confirmed independently of, and consistent
//     with, CookieConsentBanner.tsx's own 13 Sep 2026 header comment.
//   - No analytics/tracking/advertising script of any kind: grepped for
//     GA/gtag, Meta Pixel, Hotjar, Clarity, Mixpanel, PostHog,
//     Intercom, Sentry, Segment, Amplitude across src/, index.html,
//     public/ — zero real hits, no analytics package in package.json.
//   - Supabase's client auth uses localStorage, not cookies (default
//     createClient(), no @supabase/ssr, no custom storage/
//     cookieOptions config) — there is no Supabase session cookie to
//     disclose here; local storage is covered separately below.
//   - One real third-party embed: Daily.co (@daily-co/daily-js,
//     DailyIframe.createFrame()), on two AUTHENTICATED routes only
//     (/app/deal-rooms/:id/meetings, /app/roast/:id/live) — never on
//     the public site. Already listed in legal/sub-processors. Its
//     embedded iframe may set cookies within its own third-party
//     context, outside this app's control — disclosed as a category,
//     not itemised, since we don't control what it sets.
// Nothing below claims a category that doesn't exist, and nothing
// claims zero third-party cookies outright, since Daily.co's iframe is
// a real (if narrow) third-party surface.
//
// Corrected 22 Sep 2026, same day: two claims checked directly against
// the running code rather than assumed. (1) The cookie-consent banner
// described in "Your choices" IS real and live — imported AND rendered
// unconditionally in __root.tsx, not merely referenced. (2) sidebar.tsx
// writes sidebar_state's document.cookie call unconditionally — it
// never checks hasNonEssentialConsent() — so choosing "Essential only"
// in the banner does NOT actually suppress it. Reclassified
// sidebar_state from "Strictly necessary" to "Preference/functionality"
// (it's a UI convenience, not something required for the site to
// function) and rewrote both affected sections so the copy states this
// gap honestly instead of implying a control that doesn't act on the
// one cookie that exists.

export const Route = createFileRoute("/legal/cookies")({
  component: Cookies,
});

const SECTIONS = [
  {
    title: "What this policy covers",
    content: `A cookie is a small piece of data a website stores in your browser. This policy describes every cookie Lengdon sets, why, and how to control them.

This policy applies to lengdon.com and the Lengdon application. It does not apply to third-party sites you navigate to from a link on Lengdon.`,
  },
  {
    title: "Cookies we set",
    content: `Lengdon sets exactly one cookie today.

sidebar_state — Preference/functionality. Remembers whether your navigation sidebar is expanded or collapsed between visits. First-party. Persists for 7 days. Contains no personal data and is not used for tracking of any kind. It is set regardless of the choice you make in the cookie banner (see "Your choices" below) — choosing "Essential only" does not currently suppress it.

We do not set advertising cookies, analytics cookies, or any cookie used to track you across other websites.`,
  },
  {
    title: "Local storage (not a cookie, disclosed for completeness)",
    content: `Signing in to Lengdon stores your session in your browser's local storage, not in a cookie. Local storage keeps you signed in and lets the application confirm who you are on each request. It is first-party, cleared when you sign out, and not accessible to other websites.

Your cookie preference (see "Your choices" below) is also stored in local storage rather than a cookie.

We disclose this here because it serves the same practical purpose as a session cookie, even though it is a different browser mechanism and not itself a cookie.`,
  },
  {
    title: "Third-party cookies",
    content: `Where a deal room includes a live video call, that call is hosted by Daily.co (see our Sub-processors page) inside an embedded frame on that page. Daily.co's frame may set its own cookies to operate the call. We do not control what Daily.co sets; its own privacy and cookie practices govern those cookies, not this policy.

This only happens on pages where you have actively joined a video call. It does not happen on the public Lengdon website or on any page where no call is in progress.

We do not embed any other third-party service that sets cookies.`,
  },
  {
    title: "Your choices",
    content: `On your first visit, a banner lets you choose "Essential only" or "Accept all." This choice does not currently change anything — it does not stop sidebar_state from being set, because Lengdon has no non-essential cookie for it to gate today. It exists so that if a non-essential cookie is ever added, it will not load until you have chosen to accept it.

You can also control cookies directly through your browser's settings — to view, delete, or block cookies from this or any site. sidebar_state only remembers a cosmetic preference, so blocking it will not prevent you from using Lengdon; your sidebar will simply reset to its default state each visit.

Blocking local storage will prevent you from staying signed in.`,
  },
  {
    title: "Changes to this policy",
    content: `If we add a new cookie or change how an existing one is used, we will update this page and, where the change is material, notify registered users in advance.

This policy was last updated: 22 September 2026.

Related: see our Privacy Policy for how we handle personal data more broadly, and our Sub-processors page for every third party we use.`,
  },
];

function Cookies() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Legal"
          title="COOKIE"
          titleOutline="POLICY."
          subtitle="What Lengdon actually stores in your browser, and why. Last updated 22 September 2026."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-[280px] shrink-0">
              <div className="sticky top-24">
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[11px] tracking-[1px] uppercase mb-4">Contents</div>
                <nav aria-label="On this page" className="flex flex-col gap-2">
                  {SECTIONS.map((s, i) => (
                    <a key={i} href={`#section-${i}`}
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="text-[#425466] text-[13px] hover:text-[#0a2540] transition-colors py-0.5">
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <div className="flex-1 max-w-[720px] flex flex-col gap-12">
              {SECTIONS.map((s, i) => (
                <div key={i} id={`section-${i}`}>
                  <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-4">
                    {s.title}
                  </h2>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.8] whitespace-pre-line">
                    {s.content}
                  </div>
                </div>
              ))}
              <div>
                <Link to="/legal/privacy" className="text-[#0a2540] underline hover:no-underline text-[14px]">Privacy Policy</Link>
                {" · "}
                <Link to="/legal/sub-processors" className="text-[#0a2540] underline hover:no-underline text-[14px]">Sub-processors</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
