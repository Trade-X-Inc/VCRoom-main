import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Public site rebuild, 31 Aug 2026 — pixel-exact reproduction of
// LENGDONPUBLIC-NEW's src/components/Footer.tsx. Same instruction as
// SiteHeader.tsx: copy exact spacing/color/type/structure, no invented
// pattern. Column headings, link labels and paths below are the source
// file's values, translated 1:1 to this app's route paths and TanStack
// <Link>.
//
// ONE deliberate addition, on explicit instruction: a compact newsletter
// bar under the logo/tagline column (bottom-left of that column). The
// source design has no newsletter block at all — this keeps the real,
// already-working Supabase + HubSpot capture wiring alive rather than
// deleting a functioning feature, built in the new footer's own visual
// language (fonts, colors, spacing scale), not the old footer's styling.
// No other component beyond this one addition, per instruction.

const FONT_SEMIBOLD = "'Geist:SemiBold', sans-serif";
const FONT_REGULAR = "'Geist:Regular', sans-serif";
const FONT_INTER = "'Inter:Medium', sans-serif";
const FONT_INTER_REG = "'Inter:Regular', sans-serif";

const INK = "#0a2540";
const INK_MUTED = "#425466";
const INK_FAINT = "#94a3b8";
const RULE = "#e6e9ef";
const SATISFIED = "#16794f";
const ADVERSE = "#b3261e";

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
    <div className="mt-6">
      <p style={{ fontFamily: FONT_REGULAR, color: INK, fontSize: "13px", fontWeight: 500, margin: "0 0 6px" }}>
        Notes on fundraising practice
      </p>
      {state === "success" ? (
        <p style={{ fontFamily: FONT_REGULAR, color: SATISFIED, fontSize: "12.5px", margin: 0 }}>
          Subscribed. Check your inbox to confirm.
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
              height: "32px", padding: "0 10px", border: `1px solid ${RULE}`,
              background: "#fff", color: INK, fontFamily: FONT_INTER_REG, fontSize: "12.5px", outline: "none",
            }}
          />
          <button
            onClick={handleSubscribe}
            disabled={state === "loading"}
            style={{
              flexShrink: 0, height: "32px", padding: "0 12px",
              background: INK, color: "#fff", border: `1px solid ${INK}`,
              fontFamily: FONT_SEMIBOLD, fontWeight: 600, fontSize: "12.5px",
              opacity: state === "loading" ? 0.6 : 1,
            }}
          >
            {state === "loading" ? "…" : "Subscribe"}
          </button>
        </div>
      )}
      {state === "error" && (
        <p style={{ fontFamily: FONT_REGULAR, color: ADVERSE, fontSize: "12px", margin: "6px 0 0" }}>
          Could not subscribe. Try again.
        </p>
      )}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-white max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-10 mb-12 pb-12 border-b" style={{ borderColor: RULE }}>
        <div className="col-span-2 lg:col-span-1">
          <div style={{ fontFamily: FONT_SEMIBOLD, fontWeight: 600, color: INK, fontSize: "16px", letterSpacing: "-0.3px", marginBottom: "12px" }}>
            Lengdon
          </div>
          <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: "13px", lineHeight: 1.6, maxWidth: "240px" }}>
            Closing infrastructure for private capital. Built for the next generation of institutional finance.
          </p>
          <NewsletterBar />
        </div>
        {COLS.map((col) => (
          <div key={col.heading}>
            <div style={{ color: INK_FAINT, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT_INTER, marginBottom: "20px" }}>
              {col.heading}
            </div>
            <div className="flex flex-col gap-3">
              {col.items.map((item) => (
                <Link
                  key={item.to + item.label}
                  to={item.to as any}
                  className="transition-colors"
                  style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: "13px", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <span style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: INK_FAINT, fontFamily: FONT_INTER_REG }}>
          © {new Date().getFullYear()} Lengdon. All rights reserved.
        </span>
        <div className="flex items-center gap-4">
          <Link
            to="/sign-in"
            search={{ redirect: "/app" }}
            className="transition-colors"
            style={{ fontFamily: FONT_INTER_REG, color: INK_FAINT, fontSize: "12px", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            to="/sign-up"
            search={{ role: "founder" } as any}
            className="transition-colors duration-200"
            style={{ fontFamily: FONT_SEMIBOLD, fontWeight: 600, background: INK, color: "#fff", fontSize: "12px", padding: "8px 20px", textDecoration: "none" }}
          >
            Create account
          </Link>
        </div>
      </div>
    </footer>
  );
}
