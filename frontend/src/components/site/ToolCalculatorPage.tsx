import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — shared shape for the 7 /tools/*
// calculator pages, confirmed structurally identical (hero + slider/input
// field column + result panel + CTA) across all 7 LENGDONPUBLIC-NEW
// source files before building this. Each tool's own calculation logic
// stays in its own route file — this component only holds the real,
// repeated layout scaffolding, not any tool-specific math.
//
// SEO-009 Phase 2 — migrated to PUBLIC-REGISTER.md v2.0 tokens (real
// Tailwind utilities from styles.css's @theme block). Only 2 of the 7
// tool pages (burn-rate, runway) use this component; the other 5
// (cap-table, cogs, dilution, safe-note, valuation-calculator) are fully
// custom. Corrected 4 Oct 2026 (SEO-011 step 0) — this comment previously
// listed valuation-calculator as a consumer; its own header comment says
// otherwise ("Standalone (not built from ToolCalculatorPage)"), and its
// source confirms that's the true one — it renders SiteHeader/SiteFooter
// and its own JSX directly, never imports this component.

export interface ToolField {
  label: string;
  value: number;
  set: (n: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
}

export interface ToolResult {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}

export interface ToolCalculatorPageProps {
  toolLabel: string;
  titleLine1: string;
  titleLine2Outline: string;
  subtitle: string;
  fields: ToolField[];
  results: ToolResult[];
  ctaText: string;
  ctaLabel: string;
  // SEO-002 — optional per-tool body-copy section (H2s + prose), rendered
  // between the calculator grid and the footer CTA. Only burn-rate.tsx and
  // runway.tsx pass this; dilution.tsx (the third consumer of this
  // component) intentionally does not, and its render is unchanged.
  belowCalculator?: ReactNode;
  // SEO-011 — the single most important output, rendered large and
  // prominent above the results list, with a one-line plain-English
  // "what this means" explanation beneath it. Optional: not every result
  // set has one obvious primary number.
  primaryResult?: { label: string; value: string; explanation: string };
  // SEO-011 — a clear inline message shown above the results panel when
  // an input is invalid (negative, or would divide by zero). Results
  // still render below it using safety-clamped values, never NaN.
  errorMessage?: string;
}

export function ToolCalculatorPage({
  toolLabel, titleLine1, titleLine2Outline, subtitle, fields, results, ctaText, ctaLabel, belowCalculator, primaryResult, errorMessage,
}: ToolCalculatorPageProps) {
  return (
    <div className="min-h-screen bg-v2-surface">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-v2-accent relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" className="font-v2-ui inline-flex items-center gap-2 text-white/50 text-[13px] hover:text-white/70 transition-colors mb-8">← All tools</Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span className="font-v2-data text-white/50 text-[10px] tracking-[0.09em] uppercase">Tool · {toolLabel}</span>
            </div>
            <h1 className="font-v2-ui font-medium text-white text-[clamp(36px,7vw,56px)] leading-[0.9] tracking-[-2.5px] mb-4">
              {titleLine1}<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>{titleLine2Outline}</span>
            </h1>
            <p className="font-v2-ui text-white/55 text-[15px] max-w-[440px]">{subtitle}</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div className="flex flex-col gap-8">
              {fields.map((field) => (
                <div key={field.label} className="flex flex-col gap-3">
                  <label className="font-v2-ui text-v2-ink text-[13px] tracking-[0.02em]">{field.label}</label>
                  <div className="flex items-center border border-v2-rule focus-within:border-v2-accent transition-colors bg-v2-panel">
                    <span className="font-v2-data px-4 text-v2-ink-muted text-[14px] border-r border-v2-rule">{field.prefix ?? "$"}</span>
                    <input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.set(Number(e.target.value))}
                      className="font-v2-data flex-1 px-4 py-3.5 text-[14px] text-v2-ink focus:outline-none bg-v2-panel"
                    />
                  </div>
                  <input type="range" min={field.min} max={field.max} step={field.step} value={field.value} onChange={(e) => field.set(Number(e.target.value))} className="w-full accent-v2-accent" />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 h-fit">
              {errorMessage && (
                <div className="font-v2-ui border border-v2-adverse/30 bg-v2-adverse-wash px-4 py-3 text-v2-adverse text-[13px] leading-[1.5]">
                  {errorMessage}
                </div>
              )}
              {primaryResult && (
                <div className="flex flex-col gap-2 p-6 bg-v2-panel border border-v2-rule">
                  <span className="font-v2-ui text-v2-ink-muted text-[13px] tracking-[0.02em]">{primaryResult.label}</span>
                  <div className="pub-title font-v2-data text-v2-accent">{primaryResult.value}</div>
                  <p className="font-v2-doc text-v2-ink-secondary text-[15px] leading-[1.6] mt-1">{primaryResult.explanation}</p>
                </div>
              )}
              <div className="flex flex-col gap-0 border border-v2-rule divide-y divide-v2-rule">
                {results.map((r) => (
                  <div key={r.label} className={`flex items-center justify-between px-6 py-5 ${r.accent ? "bg-v2-accent" : "bg-v2-panel"}`}>
                    <span className={`font-v2-ui text-[14px] ${r.accent ? "text-white/60" : "text-v2-ink-secondary"}`}>{r.label}</span>
                    <span
                      className={`font-v2-data font-medium text-[18px] tracking-[-0.5px] ${r.accent ? "text-white" : r.warn ? "text-v2-adverse" : "text-v2-ink"}`}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {belowCalculator}

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-v2-rule pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="font-v2-ui text-v2-ink-muted text-[14px] max-w-[480px]">{ctaText}</p>
            <Link to="/sign-up" className="font-v2-ui shrink-0 bg-v2-accent hover:bg-v2-accent/90 text-white font-medium text-[13px] px-8 py-3.5 transition-colors duration-200">{ctaLabel}</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
