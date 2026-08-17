import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

// Public chrome, rebuilt to PUBLIC-REGISTER.md (17 Aug 2026).
//
// This is shared by every public page, so it converts the whole public frame at
// once. That is deliberate: the register's central claim is that the marketing
// site and the application are ONE system, and a purple-gradient header defeats
// that on arrival regardless of how the page beneath it is built.
//
// Removed here: hs-gradient buttons, rounded-lg (radius ceiling is 2px),
// backdrop-blur, and the ArrowRight decorative chevrons (§13 — decorative
// iconography). The logo mark itself is untouched — brand identity remains
// explicitly out of scope (PUBLIC-REGISTER.md §10.1).
//
// Two-dropdown restructure (18 Aug 2026, IA proposal §1): "Resources" is a
// real dropdown today (Security, Docs, Tools all exist). "Product" stays a
// flat Pricing link, deliberately not a dropdown — /how-it-works,
// /for-founders and /for-investors don't exist yet, and a one-item dropdown
// looks broken. Convert Product to a dropdown once at least two of those
// land (Step 4/5 of the IA build). Never ship a dropdown entry pointing at
// a route that doesn't exist — every href below was checked against the
// route tree before being added.

const UI = "var(--font-v2-ui)";
const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const RULE = "var(--v2-rule)";
const SURFACE = "var(--v2-surface)";
const PANEL = "var(--v2-panel)";
const ACCENT = "var(--v2-accent)";

const navLink: React.CSSProperties = {
  fontFamily: UI, fontSize: "13.5px", fontWeight: 400, color: INK_2,
  textDecoration: "none", padding: "8px 4px",
};

const actionBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", height: "32px",
  padding: "0 14px", borderRadius: "2px",
  fontFamily: UI, fontSize: "13px", fontWeight: 500, textDecoration: "none",
};

type ResourceLink = { to: string; label: string; description: string };

const RESOURCE_LINKS: ResourceLink[] = [
  { to: "/resources/schedule", label: "The disclosure schedule", description: "Every field a seed round discloses, and its required evidence" },
  { to: "/docs/security", label: "Security", description: "Access control, NDA handling, disclosure mechanics" },
  { to: "/docs", label: "Docs", description: "Reference documentation" },
  { to: "/tools", label: "Tools", description: "Calculators — valuation, runway, dilution, and more" },
];

function ResourcesDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          ...navLink, display: "inline-flex", alignItems: "center", gap: "4px",
          background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        Resources
        <ChevronDown className="h-3.5 w-3.5" style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0,
            width: "280px", background: PANEL, border: `1px solid ${RULE}`,
            borderRadius: "2px", padding: "6px", zIndex: 50,
          }}
        >
          {RESOURCE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to as any}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: "block", padding: "8px 10px", borderRadius: "2px",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--v2-accent-wash)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontFamily: UI, fontSize: "13.5px", fontWeight: 500, color: INK }}>{l.label}</div>
              <div style={{ fontFamily: UI, fontSize: "12px", color: INK_3, marginTop: "1px" }}>{l.description}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const { user } = useAuth();
  const dashboardUrl = user?.role === "investor" ? "/app/investor" : "/app";

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const close = () => { setMobileMenuOpen(false); setMobileResourcesOpen(false); };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        style={{ background: ACCENT, color: "#FFFFFF", borderRadius: "2px" }}
      >
        Skip to content
      </a>

      <header
        style={{
          position: "sticky", top: 0, zIndex: 40, width: "100%",
          background: SURFACE, borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div
          style={{
            maxWidth: "80rem", margin: "0 auto", height: "56px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingInline: "24px",
          }}
        >
          <Link to="/" onClick={close} style={{ textDecoration: "none", color: INK }}>
            <Logo size="lg" />
          </Link>

          <nav className="hidden md:flex" style={{ alignItems: "center", gap: "24px", flex: 1, justifyContent: "center" }}>
            <Link to="/pricing" style={navLink}>Pricing</Link>
            <ResourcesDropdown />
            <Link to="/blog" style={navLink}>Blog</Link>
            <Link to="/about" style={navLink}>Company</Link>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {user ? (
              <Link
                to={dashboardUrl as any}
                className="hidden sm:inline-flex"
                style={{ ...actionBase, background: ACCENT, color: "#FFFFFF", border: `1px solid ${ACCENT}` }}
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  search={{ redirect: "/app" }}
                  className="hidden sm:inline-flex"
                  style={{ ...actionBase, color: INK_2, background: "transparent", border: "1px solid transparent" }}
                >
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  search={{ role: "founder" } as any}
                  className="hidden sm:inline-flex"
                  style={{ ...actionBase, background: ACCENT, color: "#FFFFFF", border: `1px solid ${ACCENT}` }}
                >
                  Get started
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden"
              aria-label="Toggle menu"
              style={{
                display: "grid", placeItems: "center", height: "32px", width: "32px",
                borderRadius: "2px", border: `1px solid ${RULE}`, background: PANEL, color: INK_2,
              }}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className="md:hidden"
            style={{
              borderTop: `1px solid ${RULE}`, background: PANEL,
              padding: "12px 24px 16px", display: "flex", flexDirection: "column", gap: "2px",
            }}
          >
            <Link
              to="/pricing"
              onClick={close}
              style={{ ...navLink, display: "block", padding: "10px 0", color: INK }}
            >
              Pricing
            </Link>

            <button
              onClick={() => setMobileResourcesOpen((v) => !v)}
              aria-expanded={mobileResourcesOpen}
              style={{
                ...navLink, display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 0", color: INK, background: "transparent", border: "none",
              }}
            >
              Resources
              <ChevronDown className="h-3.5 w-3.5" style={{ transform: mobileResourcesOpen ? "rotate(180deg)" : undefined }} />
            </button>
            {mobileResourcesOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "12px" }}>
                {RESOURCE_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to as any}
                    onClick={close}
                    style={{ ...navLink, display: "block", padding: "8px 0", color: INK_2 }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}

            <Link
              to="/blog"
              onClick={close}
              style={{ ...navLink, display: "block", padding: "10px 0", color: INK }}
            >
              Blog
            </Link>
            <Link
              to="/about"
              onClick={close}
              style={{ ...navLink, display: "block", padding: "10px 0", color: INK }}
            >
              Company
            </Link>

            <div style={{ paddingTop: "12px", marginTop: "8px", borderTop: `1px solid ${RULE}`, display: "flex", flexDirection: "column", gap: "8px" }}>
              {user ? (
                <Link
                  to={dashboardUrl as any}
                  onClick={close}
                  style={{ ...actionBase, justifyContent: "center", background: ACCENT, color: "#FFFFFF", border: `1px solid ${ACCENT}` }}
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/sign-in"
                    search={{ redirect: "/app" }}
                    onClick={close}
                    style={{ ...actionBase, justifyContent: "center", background: PANEL, color: INK, border: `1px solid ${RULE}` }}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/sign-up"
                    search={{ role: "founder" } as any}
                    onClick={close}
                    style={{ ...actionBase, justifyContent: "center", background: ACCENT, color: "#FFFFFF", border: `1px solid ${ACCENT}` }}
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
