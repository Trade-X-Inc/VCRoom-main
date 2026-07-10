import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const NAV_LINK = "text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors px-1";

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const close = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-0 -z-10 backdrop-blur-xl bg-background/80 border-b border-border/60" />

      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left — Logo */}
        <Link to="/" onClick={close}><Logo size="lg" /></Link>

        {/* Center — Nav links (desktop only) */}
        <nav className="hidden md:flex items-center gap-5 flex-1 justify-center">
          <a href="/#how-it-works" className={NAV_LINK}>Product</a>
          <Link to="/pricing" className={NAV_LINK}>Pricing</Link>
          <Link to={"/docs" as any} className={NAV_LINK}>Docs</Link>
          <Link to="/blog" className={NAV_LINK}>Blog</Link>
          <Link to="/tools" className={NAV_LINK}>Tools</Link>
        </nav>

        {/* Right — Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/sign-in" search={{ redirect: "/app" }}
            className="hidden sm:inline-flex text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors px-3 py-1.5">
            Sign in
          </Link>
          <Link to="/sign-up" search={{ role: "founder" } as any}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-[#7C3AED] text-white px-4 py-2 text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden grid h-9 w-9 place-items-center rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl px-4 py-4 space-y-1">
          <a href="/#how-it-works" onClick={close}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Product
          </a>
          <Link to="/pricing" onClick={close}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Pricing
          </Link>
          <Link to={"/docs" as any} onClick={close}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Docs
          </Link>
          <Link to="/blog" onClick={close}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Blog
          </Link>
          <Link to="/tools" onClick={close}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Tools
          </Link>
          <div className="pt-3 border-t border-border/60 flex flex-col gap-2">
            <Link to="/sign-in" search={{ redirect: "/app" }} onClick={close}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-center border border-border/60 hover:bg-accent transition-colors">
              Sign in
            </Link>
            <Link to="/sign-up" search={{ role: "founder" } as any} onClick={close}
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-center bg-[#7C3AED] text-white hover:bg-[#6d28d9] transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
