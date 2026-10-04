import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import { socialMeta } from "@/lib/social-meta";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/CapTable.tsx. Standalone: unique
// add/remove shareholder table editor shape.

export const Route = createFileRoute("/tools/cap-table")({
  head: () => ({
    meta: [
      { title: "Cap table builder — model your ownership structure — Lengdon" },
      { name: "description", content: "Build a startup cap table with founders, investors and options pool. See percentage ownership before and after each funding round." },
      ...socialMeta({ title: "Cap table builder — model your ownership structure — Lengdon", description: "Build a startup cap table with founders, investors and options pool. See percentage ownership before and after each funding round.", path: "/tools/cap-table" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/tools/cap-table" }],
  }),
  component: CapTable,
});

// SEO-004: reuses this route's own real title/description above.
const CAP_TABLE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Cap Table Builder",
  "url": "https://lengdon.com/tools/cap-table",
  "description": "Build a startup cap table with founders, investors and options pool. See percentage ownership before and after each funding round.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@id": "https://lengdon.com/#organization" },
});

interface Holder { name: string; shares: number; }
const DEFAULT: Holder[] = [
  { name: "Founder A", shares: 4_000_000 },
  { name: "Founder B", shares: 3_000_000 },
  { name: "Employee Pool", shares: 1_000_000 },
  { name: "Seed Investor", shares: 2_000_000 },
];

function pct(n: number, total: number) {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—";
}
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 3-level — /tools
// (tools.index.tsx) is the real hub page.
const CAP_TABLE_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Tools", url: "https://lengdon.com/tools" },
  { name: "Cap table builder" },
]);

function CapTable() {
  const [holders, setHolders] = useState<Holder[]>(DEFAULT);
  const [newName, setNewName] = useState("");
  const [newShares, setNewShares] = useState("");
  const [addError, setAddError] = useState("");

  const total = holders.reduce((s, h) => s + h.shares, 0);

  // SEO-011: newShares previously had no validation at all — a negative
  // or non-numeric value would have been added straight to the table,
  // corrupting every ownership percentage. Now checked before adding,
  // with a clear inline message rather than a silent bad row.
  const addHolder = () => {
    if (!newName.trim()) {
      setAddError("Enter a shareholder name.");
      return;
    }
    const sharesNum = Number(newShares);
    if (!newShares || Number.isNaN(sharesNum) || sharesNum <= 0) {
      setAddError("Enter a positive number of shares.");
      return;
    }
    setAddError("");
    setHolders((p) => [...p, { name: newName.trim(), shares: sharesNum }]);
    setNewName("");
    setNewShares("");
  };

  const remove = (i: number) => setHolders((p) => p.filter((_, idx) => idx !== i));

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: CAP_TABLE_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: CAP_TABLE_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" style={{ fontFamily: "var(--font-v2-ui)" }} className="inline-flex items-center gap-2 text-white/50 text-[13px] hover:text-white/70 transition-colors mb-8">← All tools</Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Tool · Cap Table</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-white text-[clamp(36px,7vw,56px)] leading-[0.9] tracking-[-2.5px] mb-4">
              CAP TABLE<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>BUILDER</span>
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/55 text-[15px] max-w-[440px]">Model equity ownership and calculate percentages across your shareholder table.</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="border border-[var(--v2-rule)] overflow-hidden mb-6">
            <div className="grid grid-cols-[1fr_140px_140px_40px] bg-[var(--v2-surface)] border-b border-[var(--v2-rule)]">
              <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 text-[var(--v2-ink-muted)] text-[11px] tracking-[1px] uppercase">Shareholder</div>
              <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 text-[var(--v2-ink-muted)] text-[11px] tracking-[1px] uppercase text-right border-l border-[var(--v2-rule)]">Shares</div>
              <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 text-[var(--v2-ink-muted)] text-[11px] tracking-[1px] uppercase text-right border-l border-[var(--v2-rule)]">Ownership</div>
              <div className="border-l border-[var(--v2-rule)]" />
            </div>
            {holders.map((h, i) => (
              <div key={i} className={`grid grid-cols-[1fr_140px_140px_40px] ${i < holders.length - 1 ? "border-b border-[var(--v2-rule)]" : ""}`}>
                <div style={{ fontFamily: "var(--font-v2-ui)" }} className="px-6 py-4 text-[var(--v2-accent)] text-[14px]">{h.name}</div>
                <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 text-[var(--v2-ink-secondary)] text-[14px] text-right border-l border-[var(--v2-rule)]">{fmt(h.shares)}</div>
                <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 font-semibold text-[var(--v2-accent)] text-[14px] text-right border-l border-[var(--v2-rule)]">{pct(h.shares, total)}</div>
                <div className="flex items-center justify-center border-l border-[var(--v2-rule)]">
                  <button onClick={() => remove(i)} className="w-full h-full flex items-center justify-center text-[var(--v2-ink-muted)] hover:text-v2-adverse transition-colors text-[16px]">×</button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_140px_140px_40px] bg-[var(--v2-accent)] border-t border-[var(--v2-rule)]">
              <div style={{ fontFamily: "var(--font-v2-ui)" }} className="px-6 py-4 font-semibold text-white text-[14px]">Total</div>
              <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 font-semibold text-white text-[14px] text-right border-l border-white/10">{fmt(total)}</div>
              <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 font-semibold text-white text-[14px] text-right border-l border-white/10">100%</div>
              <div className="border-l border-white/10" />
            </div>
          </div>

          {addError && (
            <div style={{ fontFamily: "var(--font-v2-ui)" }} className="mb-4 border border-v2-adverse/30 bg-v2-adverse-wash px-4 py-3 text-v2-adverse text-[13px] leading-[1.5]">
              {addError}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="cap-table-new-name" style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[12px] tracking-[0.3px]">Name</label>
              <input id="cap-table-new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. New Series A investor" style={{ fontFamily: "var(--font-v2-ui)" }} className="border border-[var(--v2-rule)] px-4 py-3 text-[14px] text-[var(--v2-accent)] placeholder-[var(--v2-ink-muted)] focus:outline-none focus:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]" />
            </div>
            <div className="w-40 flex flex-col gap-1.5">
              <label htmlFor="cap-table-new-shares" style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[12px] tracking-[0.3px]">Shares</label>
              <input id="cap-table-new-shares" type="number" value={newShares} onChange={(e) => setNewShares(e.target.value)} placeholder="e.g. 1,000,000" style={{ fontFamily: "var(--font-v2-data)" }} className="border border-[var(--v2-rule)] px-4 py-3 text-[14px] text-[var(--v2-accent)] placeholder-[var(--v2-ink-muted)] focus:outline-none focus:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]" />
            </div>
            <button onClick={addHolder} style={{ fontFamily: "var(--font-v2-ui)" }} className="bg-[var(--v2-accent)] hover:bg-[var(--v2-accent)]/90 text-white font-semibold text-[13px] px-6 py-3 transition-colors duration-200">
              Add
            </button>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16 border-t border-[var(--v2-rule)]">
          <div className="max-w-[720px] flex flex-col gap-10">
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What this calculator does</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">A cap table (capitalisation table) records who owns what percentage of a company, at what cost basis, and on what terms. This calculator models a simple cap table through multiple funding rounds, showing dilution at each stage and the ownership percentage of each shareholder class after each round closes.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Who uses it</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Founders understanding their own dilution before signing a term sheet. Lead investors verifying ownership math before wiring. Lawyers confirming share counts match the closing documents.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What to do with the output</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">The post-money ownership percentages from this model should match — exactly — the figures in your closing documents. Discrepancies between a cap table model and the actual closing docs are one of the most common causes of deal disputes. On Lengdon, the cap table state is recorded at close and sealed into the deal record — creating an immutable reference point for future rounds.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Key terms</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Common shares: typically held by founders and employees. Preferred shares: held by investors, with liquidation preference and other protective provisions. Fully diluted: ownership calculated assuming all options, warrants, and convertible instruments have converted. Option pool: shares reserved for future employee grants, usually created before a priced round (pre-money), which dilutes founders not new investors.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">How to use this in a deal room</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">In a Lengdon deal room, the post-money cap table is attached at close and sealed into the deal record. Future investors and legal counsel can access the closing cap table as part of the permanent record — no reconstruction required.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Related tools</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Link to="/tools/safe-note" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">SAFE Note Calculator</Link>
                <Link to="/tools/dilution" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">Dilution Modeller</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[var(--v2-rule)] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[14px] max-w-[480px]">Cap table modeled. Now close the round that creates it — with a permanent record both parties keep.</p>
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "var(--font-v2-ui)" }} className="shrink-0 bg-[var(--v2-accent)] hover:bg-[var(--v2-accent)]/90 text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">Join the waitlist</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
