import { Link } from "@tanstack/react-router";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

// SEO-009 Phase 1 — migrated to PUBLIC-REGISTER.md v2.0 tokens.
// Structure/spacing/layout unchanged from the 31 Aug pixel-exact port;
// only font-family and color values are swapped to already-defined
// --v2-*/--pub-*/--font-v2-* tokens (no new tokens introduced). This is
// the universal nav chrome rendered on every public route, including the
// already-migrated /for/* (SEO-006) and /templates (SEO-008) pages — see
// the SEO-009 Step-0 finding that those pages still had v1 chrome around
// v2.0 body content until this pass.

const FONT_UI = "var(--font-v2-ui)";

const INK = "var(--v2-ink)";
const INK_SECONDARY = "var(--v2-ink-secondary)";
const INK_MUTED = "var(--v2-ink-muted)";
const ACCENT = "var(--v2-accent)";
const RULE = "var(--v2-rule)";
const RULE_LIGHT = "var(--v2-rule-light)";
const PANEL = "var(--pub-n-00)";

type NavLink = { label: string; to: string; desc: string };

const PRODUCT_LINKS: NavLink[] = [
  { label: "How Lengdon Works", to: "/product/how-it-works", desc: "The structured closing sequence" },
  { label: "Pricing", to: "/product/pricing", desc: "Simple, transparent plans" },
  { label: "Security & Trust", to: "/product/security", desc: "Encryption, NDAs, audit records" },
  { label: "Compare", to: "/product/compare", desc: "Lengdon vs traditional data rooms" },
];

const FOR_LINKS: NavLink[] = [
  { label: "Founders", to: "/for/founders", desc: "Raise capital with structure" },
  { label: "Investors", to: "/for/investors", desc: "Close with a permanent record" },
  { label: "Venture Capital", to: "/for/venture-capital", desc: "A lifecycle view, not a CRM" },
  { label: "Private Equity", to: "/for/private-equity", desc: "Complex deals, clean record" },
  { label: "Angels", to: "/for/angels", desc: "Formal process for informal deals" },
  { label: "Syndicates", to: "/for/syndicates", desc: "Lead a group into a close" },
  { label: "SPVs", to: "/for/spvs", desc: "Structured vehicle closing" },
  { label: "Family Offices", to: "/for/family-offices", desc: "Real diligence, no procurement" },
  { label: "Limited Partners", to: "/for/limited-partners", desc: "Your capital, your record" },
  { label: "Advisors", to: "/for/advisors", desc: "Mediate the raise, stay on the record" },
];

const RESOURCES_LINKS: NavLink[] = [
  { label: "All Resources", to: "/resources", desc: "Hub for all resources" },
  { label: "Documentation", to: "/docs", desc: "Platform documentation" },
  { label: "Blog", to: "/resources/blog", desc: "Insights on private capital" },
  { label: "Changelog", to: "/resources/changelog", desc: "What's new in Lengdon" },
  { label: "Glossary", to: "/glossary", desc: "Private capital terminology" },
  { label: "Tools", to: "/tools", desc: "Free calculators for founders" },
  { label: "Templates", to: "/templates", desc: "Annotated documents for founders and investors" },
];

const COMPANY_LINKS: NavLink[] = [
  { label: "About", to: "/company/about", desc: "Why we built this" },
  { label: "Careers", to: "/company/careers", desc: "Join the team" },
  { label: "Contact", to: "/company/contact", desc: "Get in touch" },
  { label: "Sectors", to: "/sectors", desc: "Industries we serve" },
];

function Dropdown({ items, onNavigate }: { items: NavLink[]; onNavigate?: () => void }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50">
      <div style={{ background: PANEL, border: `1px solid ${RULE}`, boxShadow: "0 16px 40px rgba(27,58,99,0.10)", minWidth: "240px" }}>
        {items.map((item, i) => (
          <Link
            key={item.to}
            to={item.to as any}
            onClick={onNavigate}
            className="flex flex-col gap-0.5 px-5 py-3.5 transition-colors duration-150"
            style={{ borderBottom: i < items.length - 1 ? `1px solid ${RULE_LIGHT}` : "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pub-n-04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontFamily: FONT_UI, color: INK, fontSize: "14px", letterSpacing: "-0.2px" }}>{item.label}</span>
            <span style={{ fontFamily: FONT_UI, color: INK_MUTED, fontSize: "12px" }}>{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NavItem({ label, items }: { label: string; items: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className="flex items-center gap-1 whitespace-nowrap transition-colors duration-200"
        style={{ fontFamily: FONT_UI, fontSize: "13px", letterSpacing: "0.1px", color: open ? INK : INK_SECONDARY }}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <Dropdown items={items} onNavigate={() => setOpen(false)} />}
    </div>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const dashboardUrl = user?.role === "investor" ? "/app/investor" : "/app";

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        style={{ background: INK, color: "#FFFFFF" }}
      >
        Skip to content
      </a>

      <nav
        aria-label="Primary"
        className={`sticky top-0 z-50 transition-all duration-400 ${scrolled ? "backdrop-blur-sm" : ""}`}
        style={{ background: scrolled ? "rgba(255,255,255,0.98)" : PANEL, borderBottom: `1px solid ${RULE}` }}
      >
        <div className="max-w-[1280px] mx-auto px-10 h-16 flex items-center justify-between">
          <Link to="/" className="shrink-0" style={{ textDecoration: "none" }}>
            <img
              src="/lengdon-logo-full.webp"
              alt="Lengdon"
              width={159}
              height={36}
              style={{ height: "36px", width: "auto", display: "block" }}
            />
          </Link>

          <div className="hidden md:flex items-center gap-5 lg:gap-8">
            <NavItem label="Product" items={PRODUCT_LINKS} />
            <NavItem label="Who it's for" items={FOR_LINKS} />
            <NavItem label="Resources" items={RESOURCES_LINKS} />
            <NavItem label="Company" items={COMPANY_LINKS} />
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            {user ? (
              <Link
                to={dashboardUrl as any}
                className="hidden sm:inline-flex"
                style={{ fontFamily: FONT_UI, fontWeight: 500, background: ACCENT, color: "#fff", fontSize: "13px", padding: "10px 28px", textDecoration: "none" }}
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="hidden sm:inline-flex whitespace-nowrap transition-colors duration-200"
                  style={{ fontFamily: FONT_UI, color: INK_SECONDARY, fontSize: "13px", textDecoration: "none" }}
                >
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  search={{ role: "founder" } as any}
                  className="hidden sm:inline-flex whitespace-nowrap transition-colors duration-200"
                  style={{ fontFamily: FONT_UI, fontWeight: 500, background: ACCENT, color: "#fff", fontSize: "13px", padding: "10px 16px", textDecoration: "none" }}
                >
                  Join the waitlist
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden"
              aria-label="Toggle menu"
              style={{ display: "grid", placeItems: "center", minHeight: "44px", minWidth: "44px", border: `1px solid ${RULE}`, background: PANEL, color: INK_SECONDARY }}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden" style={{ borderTop: `1px solid ${RULE}`, background: PANEL, padding: "12px 24px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {[PRODUCT_LINKS, FOR_LINKS, RESOURCES_LINKS, COMPANY_LINKS].flat().map((l) => (
              <Link
                key={l.to}
                to={l.to as any}
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontFamily: FONT_UI, fontSize: "13.5px", color: INK_SECONDARY, minHeight: "44px", display: "flex", alignItems: "center", textDecoration: "none" }}
              >
                {l.label}
              </Link>
            ))}
            <div style={{ paddingTop: "12px", marginTop: "8px", borderTop: `1px solid ${RULE}`, display: "flex", flexDirection: "column", gap: "8px" }}>
              {user ? (
                <Link
                  to={dashboardUrl as any}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ fontFamily: FONT_UI, fontWeight: 500, textAlign: "center", background: ACCENT, color: "#fff", padding: "10px 0", textDecoration: "none" }}
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ fontFamily: FONT_UI, textAlign: "center", border: `1px solid ${RULE}`, color: INK, padding: "10px 0", textDecoration: "none" }}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/sign-up"
                    search={{ role: "founder" } as any}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ fontFamily: FONT_UI, fontWeight: 500, textAlign: "center", background: ACCENT, color: "#fff", padding: "10px 0", textDecoration: "none" }}
                  >
                    Join the waitlist
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
