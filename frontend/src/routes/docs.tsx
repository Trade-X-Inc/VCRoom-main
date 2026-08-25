import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DOCS_NAV, findSection, prevNext } from "@/lib/docs/nav";
import { getDocPage } from "@/lib/docs/registry";

// ─────────────────────────────────────────────────────────────────────────────
// /docs layout — brought onto PUBLIC-REGISTER.md v2.0 (25 Aug 2026, founder-
// reported fix, CLAUDE.md §20.5's tracked pending item). VISUAL PASS ONLY,
// same discipline as every other v2.0 conversion in this codebase: every
// piece of functional logic (search filter, active-route detection, mobile
// drawer, sticky sidebar/TOC, prev/next ordering from DOCS_FLAT) is
// unchanged — only the token/font/class layer changed, from v1 (Syne,
// hs-gradient, purple-*, Tailwind gray-*) to v2.0 (--v2-*/--pub-n-* tokens,
// Archivo/Source Serif 4/JetBrains Mono via var(--font-v2-*)).
//
// SIDEBAR HIERARCHY — founder reported the old sidebar as "flat, no
// hierarchy." Fixed with: bold uppercase mono section headers (matching the
// Eyebrow pattern used everywhere else on the public site), a left-rule
// active-state indicator instead of a flat background fill (matching the
// TOC's own active-rule convention below it), and increased weight/size
// contrast between section header and item label.
// ─────────────────────────────────────────────────────────────────────────────

const UI = "var(--font-v2-ui)";
const DATA = "var(--font-v2-data)";

const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const RULE = "var(--v2-rule)";
const RULE_LIGHT = "var(--v2-rule-light)";
const ACCENT = "var(--v2-accent)";
const ACCENT_WASH = "var(--v2-accent-wash)";
const PANEL = "var(--pub-n-00)";
const SURFACE = "var(--pub-n-06)";

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
});

function slugFromPath(pathname: string): string {
  return pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
}

function DocsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const slug = slugFromPath(pathname);
  const page = getDocPage(slug);
  const section = findSection(slug);
  const { prev, next } = prevNext(slug);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Docs are always light, same pattern as the landing page — don't write to localStorage
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    return () => {
      if (hadDark) {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);

  // Close the mobile drawer on navigation
  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOCS_NAV;
    return DOCS_NAV.map((s) => ({
      ...s,
      items: s.items.filter((i) => i.title.toLowerCase().includes(q)),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  const sidebar = (
    <nav aria-label="Documentation" style={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column" }}>
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <Search
          style={{
            position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
            width: "14px", height: "14px", color: INK_3, pointerEvents: "none",
          }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs"
          style={{
            width: "100%", border: `1px solid ${RULE}`, background: PANEL,
            borderRadius: "2px", padding: "8px 10px 8px 30px",
            fontFamily: UI, fontSize: "13.5px", color: INK,
          }}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: "32px", display: "flex", flexDirection: "column", gap: "22px" }}>
        {filteredNav.map((s) => (
          <div key={s.slug || "start"}>
            <div
              style={{
                fontFamily: DATA, fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.09em",
                textTransform: "uppercase", color: INK_3, marginBottom: "8px", paddingInlineStart: "2px",
              }}
            >
              {s.title}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
              {s.items.map((item) => {
                const active = item.slug === slug;
                return (
                  <li key={item.slug || "index"}>
                    <Link
                      to={(item.slug ? `/docs/${item.slug}` : "/docs") as any}
                      aria-current={active ? "page" : undefined}
                      style={{
                        display: "block", minHeight: "34px", padding: "7px 10px 7px 12px",
                        fontFamily: UI, fontSize: "13.5px", textDecoration: "none",
                        borderInlineStart: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                        background: active ? ACCENT_WASH : "transparent",
                        color: active ? ACCENT : INK_2,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {filteredNav.length === 0 && (
          <p style={{ fontFamily: UI, fontSize: "13.5px", color: INK_3, padding: "0 2px" }}>
            No pages match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </nav>
  );

  return (
    <div style={{ minHeight: "100vh", background: SURFACE, color: INK }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        style={{ background: ACCENT, color: "#FFFFFF", borderRadius: "2px", padding: "8px 16px", fontFamily: UI, fontSize: "13.5px", fontWeight: 600 }}
      >
        Skip to content
      </a>

      <header style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: `1px solid ${RULE}`, background: SURFACE }}>
        <div style={{ margin: "0 auto", maxWidth: "80rem", display: "flex", alignItems: "center", gap: "12px", height: "56px", padding: "0 24px" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open docs navigation"
            className="lg:hidden"
            style={{
              display: "grid", placeItems: "center", height: "36px", width: "36px",
              borderRadius: "2px", border: `1px solid ${RULE}`, background: PANEL, color: INK_2,
            }}
          >
            <Menu style={{ width: "16px", height: "16px" }} />
          </button>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <Logo withWordmark />
          </Link>
          <span style={{ color: RULE }}>/</span>
          <Link
            to={"/docs" as any}
            style={{ fontFamily: UI, fontSize: "13.5px", fontWeight: 500, color: INK_2, textDecoration: "none" }}
          >
            Docs
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              to={"/sign-in" as any}
              className="hidden sm:inline-flex"
              style={{ fontFamily: UI, fontSize: "13.5px", color: INK_2, textDecoration: "none" }}
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              search={{ role: "founder" } as any}
              style={{
                display: "inline-flex", alignItems: "center", height: "32px", padding: "0 14px",
                borderRadius: "2px", background: ACCENT, color: "#FFFFFF",
                fontFamily: UI, fontSize: "13px", fontWeight: 500, textDecoration: "none",
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <div className="lg:hidden" style={{ position: "fixed", inset: 0, zIndex: 50 }}>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(22, 24, 28, 0.4)" }}
          />
          <div
            style={{
              position: "absolute", insetBlock: 0, left: 0, width: "288px", overflowY: "auto",
              background: PANEL, padding: "20px", boxShadow: "0 0 24px rgba(22, 24, 28, 0.16)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <span style={{ fontFamily: UI, fontSize: "14px", fontWeight: 600, color: INK }}>Documentation</span>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close docs navigation"
                style={{ display: "grid", placeItems: "center", height: "32px", width: "32px", borderRadius: "2px", color: INK_2, background: "transparent", border: "none" }}
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      <div style={{ margin: "0 auto", maxWidth: "80rem", display: "flex", padding: "0 24px" }}>
        <aside
          className="hidden lg:block"
          style={{
            position: "sticky", top: "56px", height: "calc(100vh - 56px)", width: "256px",
            flexShrink: 0, borderInlineEnd: `1px solid ${RULE}`, padding: "28px 20px 28px 0",
          }}
        >
          {sidebar}
        </aside>

        <main id="main-content" className="lg:px-10" style={{ minWidth: 0, flex: 1, padding: "32px 0" }}>
          <nav
            aria-label="Breadcrumb"
            style={{ marginBottom: "24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontFamily: UI, fontSize: "13px", color: INK_3 }}
          >
            <Link to={"/docs" as any} style={{ color: INK_3, textDecoration: "none" }}>
              Docs
            </Link>
            {section && slug && (
              <>
                <ChevronRight style={{ width: "13px", height: "13px" }} />
                <span>{section.title}</span>
              </>
            )}
            {page && page.meta.slug !== "" && (
              <>
                <ChevronRight style={{ width: "13px", height: "13px" }} />
                <span style={{ color: INK }}>{page.meta.title}</span>
              </>
            )}
          </nav>

          <Outlet />

          {(prev || next) && (
            <div
              className="sm:grid-cols-2"
              style={{ marginTop: "48px", display: "grid", gap: "12px", borderTop: `1px solid ${RULE}`, paddingTop: "24px" }}
            >
              {prev ? (
                <Link
                  to={(prev.slug ? `/docs/${prev.slug}` : "/docs") as any}
                  style={{ border: `1px solid ${RULE}`, borderRadius: "2px", padding: "16px", textDecoration: "none" }}
                >
                  <div style={{ fontFamily: DATA, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.08em", color: INK_3 }}>Previous</div>
                  <div style={{ fontFamily: UI, fontSize: "13.5px", fontWeight: 500, color: INK, marginTop: "3px" }}>{prev.title}</div>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  to={(next.slug ? `/docs/${next.slug}` : "/docs") as any}
                  className="sm:col-start-2"
                  style={{ border: `1px solid ${RULE}`, borderRadius: "2px", padding: "16px", textAlign: "right", textDecoration: "none" }}
                >
                  <div style={{ fontFamily: DATA, fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.08em", color: INK_3 }}>Next</div>
                  <div style={{ fontFamily: UI, fontSize: "13.5px", fontWeight: 500, color: INK, marginTop: "3px" }}>{next.title}</div>
                </Link>
              )}
            </div>
          )}

          <footer style={{ marginTop: "40px", borderTop: `1px solid ${RULE}`, paddingTop: "24px", paddingBottom: "48px", fontFamily: UI, fontSize: "13.5px", color: INK_3 }}>
            Something wrong on this page? Email{" "}
            <a href="mailto:docs@lengdon.com" style={{ color: ACCENT, textDecoration: "underline" }}>
              docs@lengdon.com
            </a>
            .
          </footer>
        </main>

        {page && page.meta.toc.length > 0 && (
          <aside
            className="hidden xl:block"
            style={{ position: "sticky", top: "56px", height: "calc(100vh - 56px)", width: "224px", flexShrink: 0, padding: "32px 0 32px 24px" }}
          >
            <div style={{ fontFamily: DATA, fontSize: "10.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.09em", color: INK_3, marginBottom: "10px" }}>
              On this page
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, borderInlineStart: `1px solid ${RULE_LIGHT}`, display: "flex", flexDirection: "column", gap: "6px" }}>
              {page.meta.toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    style={{
                      display: "block", marginInlineStart: "-1px", borderInlineStart: "1px solid transparent",
                      paddingInlineStart: "12px", fontFamily: UI, fontSize: "12.5px", lineHeight: 1.6,
                      color: INK_2, textDecoration: "none",
                    }}
                  >
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
