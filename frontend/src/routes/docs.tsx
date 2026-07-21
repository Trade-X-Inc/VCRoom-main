import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DOCS_NAV, findSection, prevNext } from "@/lib/docs/nav";
import { getDocPage } from "@/lib/docs/registry";
import { cn } from "@/lib/utils";

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
    <nav aria-label="Documentation" className="flex h-full flex-col">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs"
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
        />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto pb-8">
        {filteredNav.map((s) => (
          <div key={s.slug || "start"}>
            <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {s.title}
            </div>
            <ul className="space-y-0.5">
              {s.items.map((item) => {
                const active = item.slug === slug;
                return (
                  <li key={item.slug || "index"}>
                    <Link
                      to={(item.slug ? `/docs/${item.slug}` : "/docs") as any}
                      className={cn(
                        "flex items-center min-h-9 rounded-md px-2 py-1.5 text-sm",
                        active
                          ? "bg-purple-50 font-medium text-purple-800"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      )}
                      aria-current={active ? "page" : undefined}
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
          <p className="px-2 text-sm text-gray-500">No pages match “{query}”.</p>
        )}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-accent backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            aria-label="Open docs navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Logo withWordmark={false} />
            <span className="text-sm font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>
              Hockystick
            </span>
          </Link>
          <span className="text-gray-300">/</span>
          <Link to={"/docs" as any} className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Docs
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <a href="https://hockystick.app" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block">
              hockystick.app
            </a>
            <Link
              to={"/sign-in" as any}
              className="inline-flex items-center min-h-9 rounded-lg hs-gradient px-3.5 py-1.5 text-sm font-medium text-white hover:hs-gradient"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>
                Documentation
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Close docs navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl px-4 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r border-gray-200 py-6 pr-4 lg:block">
          {sidebar}
        </aside>

        {/* Main column */}
        <main className="min-w-0 flex-1 py-8 lg:px-10">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <Link to={"/docs" as any} className="hover:text-gray-900">
              Docs
            </Link>
            {section && slug && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>{section.title}</span>
              </>
            )}
            {page && page.meta.slug !== "" && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-gray-900">{page.meta.title}</span>
              </>
            )}
          </nav>

          <Outlet />

          {/* Prev / next */}
          {(prev || next) && (
            <div className="mt-12 grid gap-3 border-t border-gray-200 pt-6 sm:grid-cols-2">
              {prev ? (
                <Link
                  to={(prev.slug ? `/docs/${prev.slug}` : "/docs") as any}
                  className="rounded-lg border border-gray-200 p-4 hover:border-purple-300"
                >
                  <div className="text-xs text-gray-500">Previous</div>
                  <div className="text-sm font-medium text-gray-900">{prev.title}</div>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  to={(next.slug ? `/docs/${next.slug}` : "/docs") as any}
                  className="rounded-lg border border-gray-200 p-4 text-right hover:border-purple-300 sm:col-start-2"
                >
                  <div className="text-xs text-gray-500">Next</div>
                  <div className="text-sm font-medium text-gray-900">{next.title}</div>
                </Link>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-10 border-t border-gray-200 pt-6 pb-12 text-sm text-gray-500">
            Something wrong on this page? Email{" "}
            <a href="mailto:docs@hockystick.app" className="text-purple-700 underline underline-offset-2">
              docs@hockystick.app
            </a>
            .
          </footer>
        </main>

        {/* "On this page" — desktop right column */}
        {page && page.meta.toc.length > 0 && (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 py-8 pl-6 xl:block">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              On this page
            </div>
            <ul className="space-y-1.5 border-l border-gray-200">
              {page.meta.toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="-ml-px block border-l border-transparent pl-3 text-[13px] leading-6 text-gray-600 hover:border-brand hover:text-gray-900"
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
