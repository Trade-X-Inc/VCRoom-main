import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Public chrome, rebuilt to PUBLIC-REGISTER.md (17 Aug 2026). Shared by every
// public page — see SiteHeader for why the whole frame converts at once.
//
// Removed here: hs-gradient, bg-gradient-soft (§13 — no gradients), rounded-lg
// and rounded-md (radius ceiling is 2px), the "✓" glyph in the newsletter
// success state, and "See you Tuesday" (a delivery-schedule claim we do not
// keep). The logo mark is untouched — brand identity is out of scope (§10.1).

const UI = "var(--font-v2-ui)";
const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const RULE = "var(--v2-rule)";
const SURFACE = "var(--v2-surface)";
const PANEL = "var(--v2-panel)";
const ACCENT = "var(--v2-accent)";
const SATISFIED = "var(--v2-satisfied)";
const ADVERSE = "var(--v2-adverse)";

const linkStyle: React.CSSProperties = {
  fontFamily: UI, fontSize: "13px", color: INK_2, textDecoration: "none",
};

const colHeading: React.CSSProperties = {
  fontFamily: UI, fontSize: "11px", fontWeight: 500, letterSpacing: "0.09em",
  textTransform: "uppercase", color: INK_3, marginBottom: "12px",
};

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubscribe = async () => {
    if (!email.trim() || state === "loading") return;
    setState("loading");
    try {
      const { error } = await supabase
        .from("waitlist_entries")
        .insert({ email: email.trim().toLowerCase(), full_name: "", type: "newsletter" });
      if (error) throw error;
      setState("success");
      fetch("/api/hubspot-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }).catch(() => {});
    } catch {
      setState("error");
    }
  };

  return (
    <div style={{ marginBottom: "40px", paddingBottom: "40px", borderBottom: `1px solid ${RULE}` }}>
      <p style={{ fontFamily: UI, fontSize: "13.5px", fontWeight: 500, color: INK, margin: "0 0 4px" }}>
        Notes on fundraising practice
      </p>
      <p style={{ fontFamily: UI, fontSize: "12.5px", color: INK_3, margin: "0 0 12px" }}>
        Occasional writing on deal process. Unsubscribe in one click.
      </p>

      {state === "success" ? (
        <p style={{ fontFamily: UI, fontSize: "13px", color: SATISFIED, margin: 0 }}>
          Subscribed. Check your inbox to confirm.
        </p>
      ) : (
        <div style={{ display: "flex", gap: "8px", maxWidth: "24rem" }}>
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
            placeholder="you@email.com"
            style={{
              flex: 1, height: "32px", padding: "0 10px", borderRadius: "2px",
              border: `1px solid ${RULE}`, background: PANEL, color: INK,
              fontFamily: UI, fontSize: "13px", outline: "none",
            }}
          />
          <button
            onClick={handleSubscribe}
            disabled={state === "loading"}
            style={{
              flexShrink: 0, height: "32px", padding: "0 14px", borderRadius: "2px",
              background: ACCENT, color: "#FFFFFF", border: `1px solid ${ACCENT}`,
              fontFamily: UI, fontSize: "13px", fontWeight: 500,
              opacity: state === "loading" ? 0.6 : 1,
            }}
          >
            {state === "loading" ? "Subscribing" : "Subscribe"}
          </button>
        </div>
      )}

      {state === "error" && (
        <p style={{ fontFamily: UI, fontSize: "12.5px", color: ADVERSE, margin: "6px 0 0" }}>
          Subscription could not be recorded. Try again.
        </p>
      )}
    </div>
  );
}

export function SiteFooter() {
  // Mirrors the header's two-dropdown grouping (18 Aug 2026, IA proposal §1):
  // Product / Resources / Company / Legal. Every href checked against the
  // route tree before being added — nothing here points at an unbuilt page.
  const COLUMNS: { heading: string; links: { to: string; label: string }[] }[] = [
    {
      heading: "Product",
      links: [
        { to: "/sign-up", label: "Get started" },
        { to: "/sign-in", label: "Sign in" },
        { to: "/how-it-works", label: "How it works" },
        { to: "/for-founders", label: "For founders" },
        { to: "/for-investors", label: "For investors" },
        { to: "/pricing", label: "Pricing" },
      ],
    },
    {
      heading: "Solutions",
      links: [
        { to: "/solutions/angels", label: "Angels" },
        { to: "/solutions/syndicates", label: "Syndicates" },
        { to: "/solutions/spvs", label: "SPVs" },
        { to: "/solutions/advisors", label: "Advisors and introducers" },
        { to: "/solutions/family-offices", label: "Family offices" },
        { to: "/solutions/venture-capital", label: "Venture capital" },
        { to: "/solutions/private-equity", label: "Private equity" },
        { to: "/solutions/limited-partners", label: "Limited partners" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { to: "/resources/schedule", label: "The disclosure schedule" },
        { to: "/sectors", label: "Sector schedules" },
        { to: "/docs", label: "Docs" },
        { to: "/docs/security", label: "Security" },
        { to: "/docs/changelog", label: "Changelog" },
        { to: "/resources", label: "Resources hub" },
        { to: "/registry", label: "Company registry" },
      ],
    },
    {
      heading: "Tools",
      links: [
        { to: "/tools/valuation", label: "Valuation" },
        { to: "/tools/burn-rate", label: "Burn rate" },
        { to: "/tools/cogs", label: "COGS" },
        { to: "/tools/runway", label: "Runway" },
        { to: "/tools/cap-table", label: "Cap table" },
        { to: "/tools/safe-note", label: "SAFE note" },
        { to: "/tools/dilution", label: "Dilution" },
      ],
    },
    {
      heading: "Company",
      links: [
        { to: "/about", label: "About" },
        { to: "/contact", label: "Contact" },
        { to: "/blog", label: "Blog" },
        { to: "/feedback", label: "Feedback" },
        { to: "/status", label: "Status" },
        { to: "/careers", label: "Careers" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { to: "/legal", label: "Legal" },
        { to: "/terms", label: "Terms" },
        { to: "/privacy", label: "Privacy" },
        { to: "/dpa", label: "Data processing addendum" },
        { to: "/sub-processors", label: "Sub-processors" },
        { to: "/acceptable-use", label: "Acceptable use" },
      ],
    },
  ];

  return (
    <footer style={{ borderTop: `1px solid ${RULE}`, background: SURFACE }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "56px 24px 40px" }}>
        <div
          style={{
            display: "grid", gap: "40px",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            marginBottom: "40px",
          }}
        >
          <div style={{ minWidth: "180px" }}>
            <Logo />
            <p
              style={{
                fontFamily: UI, fontSize: "13px", lineHeight: 1.6, color: INK_3,
                margin: "16px 0 0", maxWidth: "20rem",
              }}
            >
              From first meeting to signed agreement. One platform.
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              {[
                {
                  href: "https://www.linkedin.com/company/lengdon/",
                  title: "Lengdon on LinkedIn",
                  path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
                },
                {
                  href: "https://x.com/lengdondotcom",
                  title: "@lengdondotcom on X",
                  path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.735-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z",
                },
              ].map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.title}
                  style={{
                    display: "grid", placeItems: "center", height: "32px", width: "32px",
                    borderRadius: "2px", border: `1px solid ${RULE}`,
                    background: PANEL, color: INK_2,
                  }}
                >
                  <svg style={{ height: "14px", width: "14px" }} fill="currentColor" viewBox="0 0 24 24">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((c) => (
            <div key={c.heading}>
              <div style={colHeading}>{c.heading}</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {c.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link
                      to={l.to as any}
                      search={l.to === "/sign-up" ? ({ role: "founder" } as any) : undefined}
                      style={linkStyle}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <NewsletterSignup />

        <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: "24px" }}>
          <div style={{ fontFamily: UI, fontSize: "12.5px", color: INK_3 }}>
            © {new Date().getFullYear()} Lengdon. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
