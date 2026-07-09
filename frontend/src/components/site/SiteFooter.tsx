import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

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
    <div className="mb-10 pb-10 border-b border-border/60">
      <p className="text-sm font-semibold text-foreground mb-1">Stay in the loop.</p>
      <p className="text-xs text-muted-foreground mb-3">Weekly insights on VC deal flow and fundraising.</p>
      {state === "success" ? (
        <p className="text-sm text-success font-medium">You're in. See you Tuesday. ✓</p>
      ) : (
        <div className="flex gap-2 max-w-sm">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
            placeholder="you@email.com"
            className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-2 focus:ring-[#7C3AED]/10"
          />
          <button
            onClick={handleSubscribe}
            disabled={state === "loading"}
            className="shrink-0 rounded-md bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60 transition-colors"
          >
            {state === "loading" ? "..." : "Subscribe"}
          </button>
        </div>
      )}
      {state === "error" && (
        <p className="mt-1.5 text-xs text-destructive">Something went wrong. Try again.</p>
      )}
    </div>
  );
}

export function SiteFooter() {
  const col = "text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-3";
  const lnk = "text-sm text-muted-foreground hover:text-foreground transition-colors";

  return (
    <footer className="border-t border-border/60 bg-gradient-soft">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          {/* Col 1 — Brand */}
          <div className="sm:col-span-2 md:col-span-1 md:pr-8">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Where deals get done.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://linkedin.com/company/hockystick" target="_blank" rel="noopener noreferrer" title="Hockystick on LinkedIn"
                className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 text-gray-600 hover:bg-[#7C3AED] hover:text-white transition-all">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://x.com/hockystickapp" target="_blank" rel="noopener noreferrer" title="@hockystickapp on X"
                className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 text-gray-600 hover:bg-[#7C3AED] hover:text-white transition-all">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.735-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Cols 2-6 — Links (2×2 on sm, 5-col on md) */}
          <div className="sm:col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Product */}
            <div>
              <div className={col}>Product</div>
              <ul className="space-y-2.5">
                <li><Link to="/sign-up" search={{ role: "founder" } as any} className={lnk}>Get started</Link></li>
                <li><Link to="/sign-in" className={lnk}>Sign in</Link></li>
                <li><Link to="/pricing" className={lnk}>Pricing</Link></li>
                <li><Link to={"/docs" as any} className={lnk}>Docs</Link></li>
                <li><Link to={"/docs/security" as any} className={lnk}>Security</Link></li>
                <li><Link to={"/docs/changelog" as any} className={lnk}>Changelog</Link></li>
                <li><Link to="/trust" className={lnk}>Trust & Verification</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <div className={col}>Company</div>
              <ul className="space-y-2.5">
                <li><Link to="/about" className={lnk}>About</Link></li>
                <li><Link to="/contact" className={lnk}>Contact</Link></li>
                <li><Link to="/blog" className={lnk}>Blog</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <div className={col}>Resources</div>
              <ul className="space-y-2.5">
                <li><Link to="/resources" className={lnk}>Resources Hub</Link></li>
                <li><Link to="/registry" className={lnk}>Company Registry</Link></li>
                <li><Link to="/waitlist" className={lnk}>Waitlist</Link></li>
                <li><Link to="/feedback" className={lnk}>Feedback</Link></li>
              </ul>
            </div>

            {/* Tools */}
            <div>
              <div className={col}>Tools</div>
              <ul className="space-y-2.5">
                <li><Link to="/tools/valuation" className={lnk}>Valuation Calculator</Link></li>
                <li><Link to="/tools/burn-rate" className={lnk}>Burn Rate Calculator</Link></li>
                <li><Link to="/tools/cogs" className={lnk}>COGS Calculator</Link></li>
                <li><Link to="/tools/runway" className={lnk}>Runway Calculator</Link></li>
                <li><Link to="/tools/cap-table" className={lnk}>Cap Table Calculator</Link></li>
                <li><Link to="/tools/safe-note" className={lnk}>SAFE Note Calculator</Link></li>
                <li><Link to="/tools/dilution" className={lnk}>Dilution Calculator</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className={col}>Legal</div>
              <ul className="space-y-2.5">
                <li><Link to="/terms" className={lnk}>Terms</Link></li>
                <li><Link to="/privacy" className={lnk}>Privacy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <NewsletterSignup />

        <div className="mt-2 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 md:flex-row md:items-center">
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
