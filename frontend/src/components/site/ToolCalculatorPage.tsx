import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — shared shape for the 7 /tools/*
// calculator pages, confirmed structurally identical (hero + slider/input
// field column + result panel + CTA) across all 7 LENGDONPUBLIC-NEW
// source files before building this. Each tool's own calculation logic
// stays in its own route file — this component only holds the real,
// repeated layout scaffolding, not any tool-specific math.

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
}

export function ToolCalculatorPage({
  toolLabel, titleLine1, titleLine2Outline, subtitle, fields, results, ctaText, ctaLabel,
}: ToolCalculatorPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="inline-flex items-center gap-2 text-white/40 text-[13px] hover:text-white/70 transition-colors mb-8">← All tools</Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Tool · {toolLabel}</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              {titleLine1}<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>{titleLine2Outline}</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[440px]">{subtitle}</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div className="flex flex-col gap-8">
              {fields.map((field) => (
                <div key={field.label} className="flex flex-col gap-3">
                  <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">{field.label}</label>
                  <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-r border-[#e6e9ef]">{field.prefix ?? "$"}</span>
                    <input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.set(Number(e.target.value))}
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="flex-1 px-4 py-3.5 text-[14px] text-[#0a2540] focus:outline-none"
                    />
                  </div>
                  <input type="range" min={field.min} max={field.max} step={field.step} value={field.value} onChange={(e) => field.set(Number(e.target.value))} className="w-full accent-[#0a2540]" />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-0 border border-[#e6e9ef] divide-y divide-[#e6e9ef] h-fit">
              {results.map((r) => (
                <div key={r.label} className={`flex items-center justify-between px-6 py-5 ${r.accent ? "bg-[#0a2540]" : ""}`}>
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[14px] ${r.accent ? "text-white/60" : "text-[#425466]"}`}>{r.label}</span>
                  <span
                    style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                    className={`font-semibold text-[18px] tracking-[-0.5px] ${r.accent ? "text-white" : r.warn ? "text-red-600" : "text-[#0a2540]"}`}
                  >
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[#e6e9ef] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px] max-w-[480px]">{ctaText}</p>
            <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">{ctaLabel}</Link>
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
