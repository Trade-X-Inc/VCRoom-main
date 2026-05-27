import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-gradient-soft">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              Where deals get done.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-3">Platform</div>
              <ul className="space-y-2.5">
                <li>
                  <Link to="/sign-up" search={{ role: "founder" } as any} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Get started
                  </Link>
                </li>
                <li>
                  <Link to="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-3">Legal</div>
              <ul className="space-y-2.5">
                <li>
                  <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 md:flex-row md:items-center">
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Hockystick. All rights reserved.</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
