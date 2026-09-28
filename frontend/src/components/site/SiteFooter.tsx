import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { syncContactToHubSpot } from "@/lib/hubspot";
import { submitWaitlistEntry } from "@/lib/notion-waitlist";

// SEO-009 Phase 1 — migrated to PUBLIC-REGISTER.md v2.0 tokens.
// Structure/spacing/layout/logic unchanged; only font-family and color
// values swapped to already-defined --v2-*/--pub-*/--font-v2-* tokens.
// See SiteHeader.tsx's equivalent header comment for the same rationale
// — this is the universal footer chrome rendered on every public page.

const FONT_UI = "var(--font-v2-ui)";
const FONT_DATA = "var(--font-v2-data)";

const INK = "var(--v2-ink)";
const INK_SECONDARY = "var(--v2-ink-secondary)";
const INK_MUTED = "var(--v2-ink-muted)";
const ACCENT = "var(--v2-accent)";
const RULE = "var(--v2-rule)";
const PANEL = "var(--pub-n-00)";
const SATISFIED = "var(--v2-satisfied)";
const ADVERSE = "var(--v2-adverse)";

type FooterLink = { label: string; to: string };

const COLS: { heading: string; items: FooterLink[] }[] = [
  {
    heading: "PRODUCT",
    items: [
      { label: "How it works", to: "/product/how-it-works" },
      { label: "Pricing", to: "/product/pricing" },
      { label: "Security", to: "/product/security" },
      { label: "Compare", to: "/product/compare" },
    ],
  },
  {
    heading: "WHO IT'S FOR",
    items: [
      { label: "Founders", to: "/for/founders" },
      { label: "Investors", to: "/for/investors" },
      { label: "Venture Capital", to: "/for/venture-capital" },
      { label: "Private Equity", to: "/for/private-equity" },
      { label: "Angels", to: "/for/angels" },
      { label: "Syndicates", to: "/for/syndicates" },
      { label: "SPVs", to: "/for/spvs" },
      { label: "Family Offices", to: "/for/family-offices" },
      { label: "Limited Partners", to: "/for/limited-partners" },
      { label: "Advisors", to: "/for/advisors" },
    ],
  },
  {
    heading: "RESOURCES",
    items: [
      { label: "All Resources", to: "/resources" },
      { label: "Documentation", to: "/docs" },
      { label: "Blog", to: "/resources/blog" },
      { label: "Changelog", to: "/resources/changelog" },
      { label: "Glossary", to: "/glossary" },
      { label: "Tools", to: "/tools" },
      { label: "Templates", to: "/templates" },
      { label: "Sectors", to: "/sectors" },
      { label: "Registry", to: "/registry" },
      { label: "Status", to: "/status" },
    ],
  },
  {
    heading: "COMPANY",
    items: [
      { label: "About", to: "/company/about" },
      { label: "Careers", to: "/company/careers" },
      { label: "Contact", to: "/company/contact" },
      { label: "Feedback", to: "/feedback" },
    ],
  },
  {
    heading: "LEGAL",
    items: [
      { label: "Legal overview", to: "/legal" },
      { label: "Privacy Policy", to: "/legal/privacy" },
      { label: "Terms of Service", to: "/legal/terms" },
      { label: "Cookie Policy", to: "/legal/cookies" },
      { label: "Refund Terms", to: "/legal/refunds" },
      { label: "DPA", to: "/legal/dpa" },
      { label: "Sub-processors", to: "/legal/sub-processors" },
      { label: "Acceptable Use", to: "/legal/acceptable-use" },
    ],
  },
];

function NewsletterBar() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubscribe = async () => {
    if (!email.trim() || state === "loading") return;
    setState("loading");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { error } = await supabase
        .from("waitlist_entries")
        .insert({ email: normalizedEmail, full_name: "", type: "footer newsletter" });
      if (error) throw error;
      setState("success");

      syncContactToHubSpot({
        data: {
          email: normalizedEmail,
          properties: { lifecyclestage: "lead", hs_lead_status: "NEW" },
        },
      }).catch((e) => console.error("[footer waitlist] HubSpot sync failed:", e));

      submitWaitlistEntry({
        data: { name: normalizedEmail, email: normalizedEmail, source: "footer newsletter" },
      }).catch((e) => console.error("[footer waitlist] Notion submit failed:", e));
    } catch {
      setState("error");
    }
  };

  return (
    <div className="mt-6">
      <p style={{ fontFamily: FONT_UI, color: INK, fontSize: "13px", fontWeight: 500, margin: "0 0 6px" }}>
        Join the waitlist
      </p>
      {state === "success" ? (
        <p style={{ fontFamily: FONT_UI, color: SATISFIED, fontSize: "12.5px", margin: 0 }}>
          You're on the waitlist.
        </p>
      ) : (
        <div className="flex gap-2 max-w-[240px]">
          <label htmlFor="footer-newsletter-email" className="sr-only">Email address</label>
          <input
            id="footer-newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
            placeholder="you@email.com"
            className="flex-1 min-w-0"
            style={{
              minHeight: "44px", padding: "0 10px", border: `1px solid ${RULE}`,
              background: PANEL, color: INK, fontFamily: FONT_UI, fontSize: "12.5px", outline: "none",
            }}
          />
          <button
            onClick={handleSubscribe}
            disabled={state === "loading"}
            style={{
              flexShrink: 0, minHeight: "44px", padding: "0 16px",
              background: ACCENT, color: "#fff", border: `1px solid ${ACCENT}`,
              fontFamily: FONT_UI, fontWeight: 500, fontSize: "12.5px",
              opacity: state === "loading" ? 0.6 : 1,
            }}
          >
            {state === "loading" ? "…" : "Join"}
          </button>
        </div>
      )}
      {state === "error" && (
        <p style={{ fontFamily: FONT_UI, color: ADVERSE, fontSize: "12px", margin: "6px 0 0" }}>
          Could not join. Try again.
        </p>
      )}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ background: PANEL }} className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-10 mb-12 pb-12 border-b" style={{ borderColor: RULE }}>
        <div className="col-span-2 lg:col-span-1">
          <img
            src="/lengdon-logo-full.webp"
            alt="Lengdon"
            width={132}
            height={30}
            style={{ height: "30px", width: "auto", display: "block", marginBottom: "12px" }}
          />
          <p style={{ fontFamily: FONT_UI, color: INK_SECONDARY, fontSize: "13px", lineHeight: 1.6, maxWidth: "240px" }}>
            Closing infrastructure for private capital. Built for the next generation of institutional finance.
          </p>
          <NewsletterBar />
        </div>
        {COLS.map((col) => (
          <div key={col.heading}>
            <div style={{ color: INK_MUTED, fontSize: "10px", letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: FONT_DATA, marginBottom: "20px" }}>
              {col.heading}
            </div>
            <div className="flex flex-col gap-3">
              {col.items.map((item) => (
                <Link
                  key={item.to + item.label}
                  to={item.to as any}
                  className="transition-colors"
                  style={{ fontFamily: FONT_UI, color: INK_SECONDARY, fontSize: "13px", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <span style={{ fontSize: "10px", letterSpacing: "0.09em", textTransform: "uppercase", color: INK_MUTED, fontFamily: FONT_DATA }}>
          © {new Date().getFullYear()} Lengdon. All rights reserved.
        </span>
        <div className="flex items-center gap-4">
          <Link
            to="/sign-in"
            className="transition-colors"
            style={{ fontFamily: FONT_UI, color: INK_MUTED, fontSize: "12px", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            to="/sign-up"
            search={{ role: "founder" } as any}
            className="transition-colors duration-200"
            style={{ fontFamily: FONT_UI, fontWeight: 500, background: ACCENT, color: "#fff", fontSize: "12px", padding: "8px 20px", textDecoration: "none" }}
          >
            Join the waitlist
          </Link>
        </div>
      </div>
    </footer>
  );
}
