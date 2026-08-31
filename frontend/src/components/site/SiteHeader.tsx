import { Link } from "@tanstack/react-router";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

// Public site rebuild, 31 Aug 2026 — pixel-exact reproduction of
// LENGDONPUBLIC-NEW's src/components/Navigation.tsx (the founder's Figma
// Make export, cloned into lengdon-public-new/ this session). Per the
// binding rule: copy exact spacing/color/type/structure, no interpretation
// of design intent, no invented pattern. Values below (colors, font
// families, sizes, tracking, dropdown structure, link set) are the source
// file's values, unchanged.
//
// Two things NOT from the source, both functional necessities the source
// has no equivalent for (it is a logged-out marketing site only):
//   1. The signed-in "Open dashboard" branch — real app auth state.
//   2. The mobile menu and skip-to-content link — the source's own
//      responsive behavior (if any) wasn't inspectable at this fidelity
//      from static JSX alone; kept from the prior implementation rather
//      than guessed, since inventing a mobile pattern "in the spirit of"
//      the design is exactly what the binding rule prohibits.
// Sign-in/sign-up preserved as real functional links, per instruction
// (login mechanics stay).

const FONT_SEMIBOLD = "'Geist:SemiBold', sans-serif";
const FONT_REGULAR = "'Geist:Regular', sans-serif";
const FONT_INTER = "'Inter:Regular', sans-serif";

const INK = "#0a2540";
const INK_MUTED = "#425466";
const INK_FAINT = "#94a3b8";
const RULE = "#e6e9ef";

type NavLink = { label: string; to: string; desc: string };

const PRODUCT_LINKS: NavLink[] = [
  { label: "How Lengdon Works", to: "/product/how-it-works", desc: "The six-gate closing sequence" },
  { label: "Pricing", to: "/product/pricing", desc: "Simple, transparent plans" },
  { label: "Security & Trust", to: "/product/security", desc: "Encryption, NDAs, audit records" },
  { label: "Compare", to: "/product/compare", desc: "Lengdon vs traditional data rooms" },
];

const FOR_LINKS: NavLink[] = [
  { label: "Founders", to: "/for/founders", desc: "Raise capital with structure" },
  { label: "Investors", to: "/for/investors", desc: "Close with a permanent record" },
  { label: "Venture Capital", to: "/for/venture-capital", desc: "Firm-grade closing infrastructure" },
  { label: "Private Equity", to: "/for/private-equity", desc: "Complex deals, clean record" },
  { label: "Angels", to: "/for/angels", desc: "Formal process for informal deals" },
  { label: "Syndicates", to: "/for/syndicates", desc: "Lead a group into a close" },
  { label: "SPVs", to: "/for/spvs", desc: "Structured vehicle closing" },
  { label: "Family Offices", to: "/for/family-offices", desc: "Institutional-grade infrastructure" },
  { label: "Limited Partners", to: "/for/limited-partners", desc: "Your capital, your record" },
];

const RESOURCES_LINKS: NavLink[] = [
  { label: "All Resources", to: "/resources", desc: "Hub for all resources" },
  { label: "Documentation", to: "/docs", desc: "Platform documentation" },
  { label: "Blog", to: "/resources/blog", desc: "Insights on private capital" },
  { label: "Changelog", to: "/resources/changelog", desc: "What's new in Lengdon" },
  { label: "Glossary", to: "/glossary", desc: "Private capital terminology" },
  { label: "Tools", to: "/tools", desc: "Free calculators for founders" },
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
      <div className="bg-white border border-[#e6e9ef] shadow-[0_16px_40px_rgba(10,37,64,0.10)] min-w-[240px]">
        {items.map((item, i) => (
          <Link
            key={item.to}
            to={item.to as any}
            onClick={onNavigate}
            className={`flex flex-col gap-0.5 px-5 py-3.5 hover:bg-[#f8f9fb] transition-colors duration-150 ${i < items.length - 1 ? "border-b border-[#f0f2f5]" : ""}`}
          >
            <span style={{ fontFamily: FONT_REGULAR, color: INK, fontSize: "14px", letterSpacing: "-0.2px" }}>{item.label}</span>
            <span style={{ fontFamily: FONT_INTER, color: INK_FAINT, fontSize: "12px" }}>{item.desc}</span>
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
        className="flex items-center gap-1 transition-colors duration-200"
        style={{ fontFamily: FONT_REGULAR, fontSize: "13px", letterSpacing: "0.1px", color: open ? INK : INK_MUTED }}
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
        className={`sticky top-0 z-50 transition-all duration-400 ${scrolled ? "bg-white/98 backdrop-blur-sm" : "bg-white"}`}
        style={{ borderBottom: `1px solid ${RULE}` }}
      >
        <div className="max-w-[1280px] mx-auto px-10 h-16 flex items-center justify-between">
          <Link to="/" style={{ fontFamily: FONT_SEMIBOLD, fontWeight: 600, color: INK, fontSize: "20px", letterSpacing: "-0.5px", textDecoration: "none" }}>
            Lengdon
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <NavItem label="Product" items={PRODUCT_LINKS} />
            <NavItem label="Who it's for" items={FOR_LINKS} />
            <NavItem label="Resources" items={RESOURCES_LINKS} />
            <NavItem label="Company" items={COMPANY_LINKS} />
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to={dashboardUrl as any}
                className="hidden sm:inline-flex"
                style={{ fontFamily: FONT_SEMIBOLD, fontWeight: 600, background: INK, color: "#fff", fontSize: "13px", padding: "10px 28px", textDecoration: "none" }}
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  search={{ redirect: "/app" }}
                  className="hidden sm:inline-flex transition-colors duration-200"
                  style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: "13px", textDecoration: "none" }}
                >
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  search={{ role: "founder" } as any}
                  className="hidden sm:inline-flex transition-colors duration-200"
                  style={{ fontFamily: FONT_SEMIBOLD, fontWeight: 600, background: INK, color: "#fff", fontSize: "13px", padding: "10px 28px", textDecoration: "none" }}
                >
                  Create account
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden"
              aria-label="Toggle menu"
              style={{ display: "grid", placeItems: "center", height: "32px", width: "32px", border: `1px solid ${RULE}`, background: "#fff", color: INK_MUTED }}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden" style={{ borderTop: `1px solid ${RULE}`, background: "#fff", padding: "12px 24px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {[PRODUCT_LINKS, FOR_LINKS, RESOURCES_LINKS, COMPANY_LINKS].flat().map((l) => (
              <Link
                key={l.to}
                to={l.to as any}
                onClick={() => setMobileMenuOpen(false)}
                style={{ fontFamily: FONT_REGULAR, fontSize: "13.5px", color: INK_MUTED, padding: "10px 0", textDecoration: "none", display: "block" }}
              >
                {l.label}
              </Link>
            ))}
            <div style={{ paddingTop: "12px", marginTop: "8px", borderTop: `1px solid ${RULE}`, display: "flex", flexDirection: "column", gap: "8px" }}>
              {user ? (
                <Link
                  to={dashboardUrl as any}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ fontFamily: FONT_SEMIBOLD, fontWeight: 600, textAlign: "center", background: INK, color: "#fff", padding: "10px 0", textDecoration: "none" }}
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/sign-in"
                    search={{ redirect: "/app" }}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ fontFamily: FONT_REGULAR, textAlign: "center", border: `1px solid ${RULE}`, color: INK, padding: "10px 0", textDecoration: "none" }}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/sign-up"
                    search={{ role: "founder" } as any}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ fontFamily: FONT_SEMIBOLD, fontWeight: 600, textAlign: "center", background: INK, color: "#fff", padding: "10px 0", textDecoration: "none" }}
                  >
                    Create account
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
