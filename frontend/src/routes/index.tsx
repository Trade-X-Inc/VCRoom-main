import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact reproduction of
// LENGDONPUBLIC-NEW's src/App.tsx (the founder's Figma Make export,
// cloned into lengdon-public-new/ this session). Binding rule: copy
// exact spacing/color/type/structure, no interpretation of design
// intent. Layout, copy, animation timings, and interaction behavior
// below are the source file's values, translated only where the target
// stack requires it (react-router Link -> @tanstack/react-router Link,
// Tailwind arbitrary-font classes -> inline font-family, per this app's
// existing convention throughout site/ components).
//
// TWO explicit, approved deviations from the source, neither a design
// judgment call — both confirmed directly rather than assumed:
//
//   1. IMAGES SELF-HOSTED. The source hotlinks 9 Unsplash stock photo
//      URLs directly. Per instruction, all 9 were downloaded to
//      public/images/homepage/ and are referenced locally below — no
//      external image-host dependency. Placeholder photography; will be
//      replaced with real photography later. public/_routes.json's
//      exclude list was updated to add "/images/*" (CLAUDE.md's own
//      recorded trap: a new public/ file 404s via the SSR worker unless
//      excluded there).
//
//   2. THE "BOOK A DEMO" FORM IS INTENTIONALLY FAKE, AS IN THE SOURCE.
//      Local React state only; no real submission. Per instruction, real
//      wiring (HubSpot/Notion) is deferred to a later session, not
//      touched here.
//
// Per instruction, copy/content claims ("Sealed export", the stat tiles
// presented as fact, etc.) are reproduced verbatim and were NOT checked
// against Foundation Document content rules for this task — that check
// is explicitly deferred, not skipped by oversight.
//
// Animation keyframes/classes live in src/styles.css under a `pub-`
// prefix (see that file's header comment) to avoid a real collision
// found with an existing `pulse-glow` keyframe.

export const Route = createFileRoute("/")({
  component: HomePage,
});

// ── Scroll Reveal ─────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`pub-reveal ${visible ? "pub-reveal-visible" : "pub-reveal-hidden"} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Hero: Product UI Mockup Card ──────────────────────────
const GATE_ROWS = [
  { num: 1, name: "Counsel",    party: "Both parties",         done: true  },
  { num: 2, name: "Agreement",  party: "Both parties",         done: true  },
  { num: 3, name: "Conditions", party: "All 6 satisfied",      done: true  },
  { num: 4, name: "Signing",    party: "Both parties",         done: true  },
  { num: 5, name: "Payment",    party: "Confirmed",            done: true  },
  { num: 6, name: "Close",      party: "Pending confirmation", done: false },
];

function ProductCard() {
  const [newEvent, setNewEvent] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setNewEvent(true), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pub-card-float relative w-[420px] shrink-0">
      <div className="absolute -inset-4 bg-gradient-to-br from-[#0a2540]/8 via-transparent to-[#0a2540]/4 blur-2xl rounded-2xl" />

      <div className="relative bg-white border border-[#e0e5ee] shadow-[0_24px_64px_rgba(10,37,64,0.12),0_4px_16px_rgba(10,37,64,0.06)] overflow-hidden">
        <div className="bg-[#f8f9fb] border-b border-[#e6e9ef] px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#e0e5ee]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#e0e5ee]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#e0e5ee]" />
          </div>
          <div className="flex-1 bg-white border border-[#e6e9ef] rounded-sm px-3 py-1 text-center">
            <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[10px] text-[#94a3b8] tracking-[0.3px]">
              app.lengdon.com/room/000042
            </span>
          </div>
        </div>

        <div className="bg-[#0a2540] px-5 py-4 flex items-center justify-between">
          <div>
            <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[14px] tracking-[-0.2px]">
              Transaction Room #000042
            </div>
            <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/50 text-[11px] mt-0.5 tracking-[0.3px]">
              ROM Capital · Technology Sector
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pub-pulse-glow" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-emerald-300 text-[10px] tracking-[0.8px]">ACTIVE</span>
          </div>
        </div>

        <div className="px-5 py-2">
          {GATE_ROWS.map((g, i) => (
            <div key={g.num}
              className={`flex items-center justify-between py-2.5 ${
                i < GATE_ROWS.length - 1 ? "border-b border-[#f0f2f5]" : ""
              }`}>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] text-[#c9d0db] w-4">{g.num}</span>
                <span style={{ fontFamily: "'Geist:Regular', sans-serif" }} className={`text-[13px] ${
                  g.done ? "text-[#0a2540]" : "text-[#0a2540] font-semibold"
                }`}>{g.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[11px] text-[#94a3b8]">{g.party}</span>
                {g.done ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-[#0a2540] shrink-0 pub-pulse-glow" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#e6e9ef] bg-[#f8f9fb] px-5 py-3">
          <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] text-[#94a3b8] tracking-[1px] uppercase mb-2">
            Latest Activity
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[10px] w-10 shrink-0">14:32</span>
              <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[11px]">Condition Met: Regulatory Approval</span>
            </div>
            {newEvent && (
              <div className="flex items-center gap-3" style={{ animation: "pub-data-in 0.5s ease-out" }}>
                <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[10px] w-10 shrink-0">15:45</span>
                <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[11px]">Term Accepted: Board Seat</span>
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="ml-auto text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-sm tracking-[0.5px]">NEW</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute -right-2 top-[30%] bg-[#0a2540] px-3 py-2 shadow-lg"
        style={{ animation: "pub-card-float 7s ease-in-out infinite 1.5s" }}>
        <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[9px] text-[#d4af37]/70 tracking-[1px] mb-1">AUDIT LOG</div>
        <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] text-white/60 font-mono">REF-0017</div>
        <div className="w-px h-3 bg-white/20 mx-auto my-0.5" />
        <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] text-white/40 font-mono">REF-0018</div>
      </div>
    </div>
  );
}

// ── Hero Section ──────────────────────────────────────────
function HeroSection() {
  return (
    <section className="bg-white min-h-screen flex flex-col relative overflow-hidden border-b border-[#e6e9ef]">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(transparent calc(100% - 1px), #f0f2f5 calc(100% - 1px))",
          backgroundSize: "100% 80px",
          opacity: 0.5
        }} />

      <div className="relative z-10 flex-1 flex items-center max-w-[1280px] mx-auto w-full px-10 pt-28 pb-12">
        <div className="flex items-center justify-between gap-8 w-full">
          <div className="flex flex-col gap-8 max-w-[600px]">
            <div className="flex items-center gap-3">
              <div className="w-4 h-px bg-[#0a2540]/40" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[2px] uppercase">
                Private Capital · Closing Infrastructure
              </span>
            </div>

            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold leading-[0.88] tracking-[-3.5px]">
              <span className="block text-[#0a2540] text-[clamp(64px,8vw,120px)]">INFRASTRUCTURE</span>
              <span className="block text-[#0a2540] text-[clamp(64px,8vw,120px)]">FOR PRIVATE</span>
              <span className="block text-[clamp(64px,8vw,120px)]"
                style={{ WebkitTextStroke: "2px #0a2540", color: "transparent" }}>
                CAPITAL.
              </span>
            </h1>

            <p style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#425466] text-[18px] leading-[1.6] max-w-[480px] tracking-[-0.2px]">
              Lengdon closes private capital transactions. From room setup to sealed close — a sequenced, encrypted record of every action taken by both parties.
            </p>

            <div className="flex items-center gap-4">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-9 py-4 transition-colors duration-200">
                Initialize Account
              </Link>
              <Link to="/product/how-it-works" style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] hover:text-[#0a2540] text-[14px] px-9 py-4 transition-all duration-200">
                See how it works →
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-end flex-1">
            <ProductCard />
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-[#0a2540] py-2.5 border-t border-[#13233a]">
        <div className="pub-ticker-wrap">
          <div className="pub-ticker-inner">
            {[
              "000042 · Condition Met: Regulatory Approval · a8f9...2b1c",
              "000018 · Term Accepted: Board Seat (Investor) · 3c7d...8e9f",
              "000019 · Document Released: Cap Table · f1e2...d3c4",
              "000020 · Signature Confirmed: Founder · 7a3b...1f2e",
              "000021 · Payment Proof Uploaded · 9d4c...6b7a",
              "000022 · Close Confirmed: Both Parties · 2e5f...0c9d",
            ].concat([
              "000042 · Condition Met: Regulatory Approval · a8f9...2b1c",
              "000018 · Term Accepted: Board Seat (Investor) · 3c7d...8e9f",
              "000019 · Document Released: Cap Table · f1e2...d3c4",
              "000020 · Signature Confirmed: Founder · 7a3b...1f2e",
              "000021 · Payment Proof Uploaded · 9d4c...6b7a",
              "000022 · Close Confirmed: Both Parties · 2e5f...0c9d",
            ]).map((ev, i) => (
              <span key={i} style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[11px] text-white/35 tracking-[0.5px] mx-8">
                <span className="text-white/20 mr-2">▸</span>{ev}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section Label ─────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-5 h-px bg-[#0a2540]/30" />
      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">
        {children}
      </span>
    </div>
  );
}

// ── THE APPEND-ONLY RECORD ──────────────────────────────────
const RECORD_ENTRIES = [
  {
    ts: "2026-08-26 14:32:11 UTC",
    action: "Condition Precedent Met: Regulatory Approval",
    ref: "ATLS01-ROM-2026-000017-91",
  },
  {
    ts: "2026-08-26 15:45:00 UTC",
    action: "Term Accepted: Board Seat (Investor)",
    ref: "ATLS01-ROM-2026-000018-88",
  },
  {
    ts: "2026-08-27 09:12:44 UTC",
    action: "Document Released: Cap Table (Pre-Money)",
    ref: "ATLS01-ROM-2026-000019-85",
  },
];

function AppendOnlyRecordSection() {
  return (
    <section className="bg-white border-b border-[#e6e9ef] py-24 max-w-[1440px] mx-auto w-full overflow-hidden">
      <div className="px-12 lg:px-16">
        <Reveal>
          <SectionLabel>Architecture</SectionLabel>
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-20 items-start">
            <div className="lg:w-[400px] shrink-0">
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold leading-[0.88] tracking-[-3px] mb-8">
                <span className="block text-[#0a2540] text-[80px]">THE</span>
                <span className="block text-[#0a2540] text-[80px]">APPEND-ONLY</span>
                <span className="block text-[80px]"
                  style={{ WebkitTextStroke: "2px #0a2540", color: "transparent" }}>
                  RECORD.
                </span>
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[16px] leading-[1.7] mb-8">
                Every action is written to a permanent, append-only log where each entry references the one before it. Altering an earlier entry breaks that reference — visibly, and permanently.
              </p>
              <div className="flex flex-col gap-4 border-t border-[#e6e9ef] pt-6">
                {[
                  { prop: "Append-only", desc: "No deletes. No edits. Additions only." },
                  { prop: "Tamper-evident", desc: "Each entry references its predecessor." },
                  { prop: "Sealed export", desc: "Both parties receive a signed copy at close." },
                ].map((item) => (
                  <div key={item.prop} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#0a2540] mt-1.5 shrink-0" />
                    <div>
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px]">{item.prop} — </span>
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px]">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="relative">
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                  <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#0a2540]/20 to-transparent"
                    style={{ animation: "pub-scan-verify 4s ease-in-out infinite" }} />
                </div>

                <div className="flex flex-col gap-0">
                  {RECORD_ENTRIES.map((entry, i) => (
                    <Reveal key={entry.ref} delay={i * 120}>
                      <div className="relative">
                        {i > 0 && (
                          <div className="flex items-center gap-4 px-6 py-2">
                            <div className="flex flex-col items-center gap-1 w-8 shrink-0">
                              <div className="w-px h-3 bg-[#e6e9ef]" />
                              <div className="w-4 h-4 rounded-full border-2 border-[#e6e9ef] flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#c9d0db]" />
                              </div>
                              <div className="w-px h-3 bg-[#e6e9ef]" />
                            </div>
                            <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] text-[#94a3b8] tracking-[0.5px]">
                              next entry in the record
                            </div>
                          </div>
                        )}

                        <div className="border border-[#e6e9ef] bg-white hover:border-[#0a2540]/20 transition-colors duration-300 relative group">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#0a2540]" />
                          <div className="pl-6 pr-6 py-5">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3">
                                <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[11px]">
                                  {entry.ts}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-emerald-700 text-[10px] tracking-[0.5px]">RECORDED</span>
                              </div>
                            </div>
                            <p style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[16px] mb-3">
                              {entry.action}
                            </p>
                            <div className="flex items-center gap-2">
                              <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[11px] text-[#94a3b8] tracking-[0.3px]">REFERENCE:</span>
                              <span className="font-mono text-[12px] text-[#425466] bg-[#f8f9fb] px-2 py-0.5 border border-[#e6e9ef]">
                                {entry.ref}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}

                  <Reveal delay={400}>
                    <div className="flex items-center gap-4 px-6 py-3">
                      <div className="flex flex-col items-center gap-1 w-8 shrink-0">
                        <div className="w-px h-4 bg-[#e6e9ef]" />
                      </div>
                      <div className="flex items-center gap-3 bg-[#0a2540] px-4 py-2">
                        <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                          <rect x="1" y="5" width="10" height="8" rx="1" stroke="white" strokeWidth="1.2"/>
                          <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="white" strokeWidth="1.2"/>
                          <circle cx="6" cy="9.5" r="1" fill="white"/>
                        </svg>
                        <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white text-[11px] tracking-[1px]">
                          RECORD CONTINUES → SEALED AT CLOSE
                        </span>
                      </div>
                    </div>
                  </Reveal>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── DEMO SECTION ──────────────────────────────────────────
function DemoSection() {
  const [formData, setFormData] = useState({ name: "", email: "", company: "", slot: "" });
  const [submitted, setSubmitted] = useState(false);
  const [playing, setPlaying] = useState(false);

  const slots = [
    "Tomorrow, 10:00 AM GMT",
    "Tomorrow, 3:00 PM GMT",
    "Thursday, 9:00 AM GMT",
    "Thursday, 2:00 PM GMT",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.slot) setSubmitted(true);
  };

  return (
    <section className="bg-white border-b border-[#e6e9ef] py-24 max-w-[1440px] mx-auto w-full">
      <div className="px-12 lg:px-16">
        <Reveal>
          <SectionLabel>Demo</SectionLabel>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[64px] lg:text-[80px] leading-[0.9] tracking-[-2.5px] mb-16">
            SEE LENGDON CLOSE
          </h2>
        </Reveal>

        <div className="flex flex-col lg:flex-row gap-8">
          <Reveal className="flex-1">
            <div
              className="relative bg-[#0a2540] overflow-hidden cursor-pointer group h-full min-h-[420px]"
              onClick={() => setPlaying(!playing)}
            >
              <img
                src="/images/homepage/demo-video-poster.jpg"
                alt="Lengdon product walkthrough"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                  playing ? "opacity-20 scale-105" : "opacity-50 group-hover:opacity-60"
                }`}
              />
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "40px 40px"
                }} />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-20 h-20 rounded-full border-2 border-white/60 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-white ${
                  playing ? "bg-white/20" : "bg-white/10"
                }`}>
                  {playing ? (
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-6 bg-white rounded-sm" />
                      <div className="w-1.5 h-6 bg-white rounded-sm" />
                    </div>
                  ) : (
                    <svg width="22" height="24" viewBox="0 0 22 24" fill="none" className="ml-1">
                      <path d="M2 2L20 12L2 22V2Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/50 text-[11px] tracking-[1px] mb-2">
                  3:24 MIN
                </div>
                <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[22px] tracking-[-0.5px]">
                  The full transaction lifecycle
                </div>
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/60 text-[14px] mt-1">
                  Room setup → Engage → Close. No narration, just the product.
                </div>
              </div>

              <div className="absolute top-5 right-5 flex flex-col gap-2">
                {["Room setup", "Diligence", "Conditions", "Signing", "Close"].map((ch, i) => (
                  <div key={ch} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${playing && i === 2 ? "bg-white" : "bg-white/30"}`} />
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/40 text-[10px] tracking-[0.5px]">{ch}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150} className="flex-1 max-w-[480px]">
            <div className="border border-[#e6e9ef] p-8 lg:p-10 h-full flex flex-col">
              {submitted ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-12">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                      <path d="M2 8L8 14L20 2" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] mb-2">Confirmed</div>
                    <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.6]">
                      Your demo is booked for <strong>{formData.slot}</strong>.<br />
                      Expect a calendar invite at {formData.email}.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[26px] tracking-[-0.5px] mb-2">
                      Book a private demo
                    </h3>
                    <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.6]">
                      30 minutes. We'll show you a live transaction from Room setup to Close. No sales pressure — just the product.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
                    <div className="flex flex-col gap-1.5">
                      <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Full name</label>
                      <input
                        type="text" placeholder="Jane Thornton"
                        value={formData.name}
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                        className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Work email</label>
                      <input
                        type="email" placeholder="jane@firm.com"
                        value={formData.email}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                        className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Company</label>
                      <input
                        type="text" placeholder="ROM Capital Partners"
                        value={formData.company}
                        onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                        style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                        className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Select a time</label>
                      <div className="grid grid-cols-2 gap-2">
                        {slots.map(slot => (
                          <button type="button" key={slot}
                            onClick={() => setFormData(p => ({ ...p, slot }))}
                            className={`border px-3 py-2.5 text-left transition-all duration-150 ${
                              formData.slot === slot
                                ? "border-[#0a2540] bg-[#0a2540] text-white"
                                : "border-[#e6e9ef] text-[#425466] hover:border-[#0a2540]/30"
                            }`}>
                            <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[12px] leading-[1.4]">{slot}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="submit"
                      style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                      className="mt-auto bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] py-4 transition-colors duration-200 disabled:opacity-40"
                      disabled={!formData.name || !formData.email || !formData.slot}>
                      Confirm booking
                    </button>
                  </form>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── PROCESS: PHASE ILLUSTRATIONS ─────────────────────────
// (Illustrations dropped from this build — see the report to the founder:
// the source's PROCESS_PHASES_V2 entries use real Unsplash photos, not
// these SVG illustration components, so IllustrationCounsel through
// IllustrationClose are dead code in the source itself, never rendered.
// Confirmed by reading App() and ProcessSection() — neither references
// them. Not ported, since porting dead code is not "pixel-exact
// reproduction of what renders," it's reproducing an unused artifact.)

const PROCESS_PHASES_V2 = [
  {
    num: "01", title: "COUNSEL",
    party: "Both parties",
    desc: "Both legal teams are brought in. Transaction parameters are formally established before any data is shared. No term sheet, no data room — only counsel.",
    img: "/images/homepage/process-counsel.jpg",
    imgAlt: "Formal boardroom with long conference table and chairs",
    bg: "#0a2540",
  },
  {
    num: "02", title: "AGREEMENT",
    party: "Both parties, independently",
    desc: "Each party independently confirms their intent to proceed. No single confirmation can trigger the next gate. Both must act; neither can force the other forward.",
    img: "/images/homepage/process-agreement.jpg",
    imgAlt: "Two people shaking hands over a signed document",
    bg: "#0d1b2e",
  },
  {
    num: "03", title: "CONDITIONS",
    party: "Owner of each condition",
    desc: "Each prerequisite is assigned to a named owner and tracked until satisfied. The system enforces completion order — conditions cannot be resequenced or skipped.",
    img: "/images/homepage/process-conditions.jpg",
    imgAlt: "Compliance checklist documentation",
    bg: "#0a2540",
  },
  {
    num: "04", title: "SIGNING",
    party: "Both parties, separately",
    desc: "Transaction documents are executed in sequence by each party. No joint session — each signs in their own time, in their own jurisdiction, with their own counsel present.",
    img: "/images/homepage/process-signing.jpg",
    imgAlt: "Person signing a formal document with pen",
    bg: "#0d1b2e",
  },
  {
    num: "05", title: "PAYMENT",
    party: "Investor + Founder confirm",
    desc: "Investor uploads verified proof of transfer. Founder confirms receipt. Both confirmations are required to proceed. The system records each action independently.",
    img: "/images/homepage/process-payment.jpg",
    imgAlt: "Person completing a financial transaction on laptop",
    bg: "#0a2540",
  },
  {
    num: "06", title: "CLOSE",
    party: "Both parties, independently",
    desc: "Mutual confirmation seals the record permanently. Both parties export a signed copy of the complete audit trail. The room is archived. Nothing changes after this point.",
    img: "/images/homepage/process-close.jpg",
    imgAlt: "Wooden wax seal stamp on a table",
    bg: "#0d1b2e",
  },
];

function ProcessSection() {
  const [openPhase, setOpenPhase] = useState<string | null>("01");

  const toggle = (num: string) => setOpenPhase(prev => prev === num ? null : num);

  return (
    <section className="bg-white border-b border-[#e6e9ef] max-w-[1440px] mx-auto w-full">
      <div className="flex" style={{ minHeight: "100vh" }}>
        <div className="hidden lg:flex w-[480px] xl:w-[540px] shrink-0 sticky top-0 h-screen flex-col border-r border-[#e6e9ef] px-12 xl:px-16 py-20">
          <div className="flex flex-col gap-6 flex-1">
            <SectionLabel>Process</SectionLabel>

            <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(64px, 6vw, 88px)" }} className="font-semibold text-[#0a2540] leading-[0.88] tracking-[-3.5px]">
              PROCESS
            </h2>

            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75] max-w-[320px]">
              Six sequential gates. Each requires the one before it. The order is enforced by the system — not by convention.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {PROCESS_PHASES_V2.map((p) => (
                <button
                  key={p.num}
                  onClick={() => toggle(p.num)}
                  className={`flex items-center gap-3 text-left transition-all duration-200 group ${
                    openPhase === p.num ? "opacity-100" : "opacity-40 hover:opacity-70"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-200 ${
                    openPhase === p.num ? "bg-[#0a2540]" : "bg-[#c9d0db] group-hover:bg-[#0a2540]/40"
                  }`} />
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.5px]">
                    {p.num} — {p.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#c9d0db] text-[11px] tracking-[1px]" style={{ fontFamily: "'Inter:Regular', sans-serif" }}>
            <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
              <path d="M1 4H15M15 4L12 1M15 4L12 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Click a gate to expand</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {PROCESS_PHASES_V2.map((phase, i) => {
            const isOpen = openPhase === phase.num;
            const isLast = i === PROCESS_PHASES_V2.length - 1;

            return (
              <div
                key={phase.num}
                className={`group overflow-hidden cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${!isLast ? "border-b border-[#e6e9ef]" : ""}`}
                style={{ height: isOpen ? 540 : 90 }}
                onClick={() => toggle(phase.num)}
              >
                <div className="h-[90px] flex items-center px-8 lg:px-12 gap-6 select-none relative overflow-hidden">
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#c9d0db] text-[10px] tracking-[2px] w-5 shrink-0">
                    {phase.num}
                  </span>

                  <span
                    style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(60px, 5.5vw, 80px)", whiteSpace: "nowrap" }}
                    className={`font-semibold leading-[90px] tracking-[-2.5px] overflow-hidden transition-colors duration-300 ${
                      isOpen
                        ? "text-[#0a2540]"
                        : "text-[#0a2540]/70 group-hover:text-[#0a2540]"
                    }`}
                  >
                    {phase.title}
                  </span>

                  <div className="ml-auto flex items-center gap-5 shrink-0">
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="hidden md:block text-[#94a3b8] text-[11px] tracking-[0.3px]">
                      {phase.party}
                    </span>
                    <svg
                      width="18" height="10" viewBox="0 0 18 10" fill="none"
                      className={`transition-transform duration-500 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M1 1L9 9L17 1" stroke={isOpen ? "#0a2540" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  <div className={`absolute bottom-0 left-0 h-px bg-[#0a2540]/8 transition-all duration-500 ${
                    isOpen ? "w-full" : "w-0 group-hover:w-full"
                  }`} />
                </div>

                <div
                  className={`flex transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  style={{ height: 450 }}
                >
                  <div className="w-[55%] lg:w-[58%] shrink-0 overflow-hidden relative bg-[#0a2540]">
                    <img
                      src={phase.img}
                      alt={phase.imgAlt}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      style={{ opacity: 0.88 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a2540]/30 pointer-events-none" />
                    <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="absolute bottom-6 left-8 font-semibold text-white/12 text-[120px] leading-none tracking-[-5px] select-none pointer-events-none">
                      {phase.num}
                    </div>
                  </div>

                  <div
                    className="flex-1 flex flex-col justify-between px-10 xl:px-14 py-10"
                    style={{ background: phase.bg }}
                  >
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-px bg-[#d4af37]/50" />
                        <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#d4af37]/70 text-[10px] tracking-[2px] uppercase">
                          Gate {phase.num} of 06
                        </span>
                      </div>

                      <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[32px] xl:text-[38px] leading-[1.05] tracking-[-1px]">
                        {phase.title}
                      </h3>

                      <div className="inline-flex items-center gap-2 border border-white/10 px-3.5 py-1.5 w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                        <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/50 text-[11px] tracking-[0.8px] uppercase">
                          {phase.party}
                        </span>
                      </div>

                      <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/65 text-[14px] xl:text-[15px] leading-[1.75]">
                        {phase.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      {PROCESS_PHASES_V2.map((p) => (
                        <div
                          key={p.num}
                          className={`transition-all duration-300 ${
                            p.num === phase.num
                              ? "w-6 h-1.5 bg-[#d4af37]/80"
                              : parseInt(p.num) < parseInt(phase.num)
                              ? "w-1.5 h-1.5 rounded-full bg-white/30"
                              : "w-1.5 h-1.5 rounded-full bg-white/10"
                          }`}
                        />
                      ))}
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="ml-auto text-white/20 text-[11px] tracking-[0.5px]">
                        {phase.num} / 06
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── INFRASTRUCTURE, NOT PARTICIPANT ──────────────────────
function InfrastructureBannerSection() {
  return (
    <Reveal>
      <section className="bg-[#0d1b2e] py-20 px-12 lg:px-16 max-w-[1440px] mx-auto w-full border-b border-[#e6e9ef]">
        <div className="flex flex-col lg:flex-row items-end justify-between gap-12">
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(48px,6vw,96px)" }} className="font-semibold text-[#f9fcff] leading-[0.88] tracking-[-3px] max-w-[700px]">
            INFRASTRUCTURE,<br />NOT PARTICIPANT
          </h2>
          <div className="lg:max-w-[400px]">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/65 text-[16px] leading-[1.7]">
              Lengdon is closing infrastructure for private capital. It begins when two parties have already decided to talk, and ends when the transaction closes or is declined — leaving a permanent, verifiable record either way.
            </p>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// ── SECURITY & TRUST ──────────────────────────────────────
function SecuritySection() {
  return (
    <section className="bg-white border-b border-[#e6e9ef] max-w-[1440px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row">
        <Reveal className="flex-1 px-12 lg:px-16 py-24 border-r border-[#e6e9ef]">
          <SectionLabel>Trust</SectionLabel>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[64px] leading-[0.9] tracking-[-2px] mb-8">
            SECURITY<br />&amp; TRUST
          </h2>
          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[16px] leading-[1.7] max-w-[400px] mb-10">
            Encryption at rest and in transit; mandatory multi-factor authentication; role-scoped access; per-person NDAs; the append-only record; data residency; no money movement, no custody, no escrow.
          </p>
          <Link to="/legal/privacy" style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="flex items-center gap-2 text-[#0a2540] text-[14px] hover:opacity-60 transition-opacity">
            Read the Privacy Policy <span>→</span>
          </Link>
        </Reveal>
        <Reveal delay={150} className="flex-1 overflow-hidden">
          <img
            src="/images/homepage/security-infrastructure.jpg"
            alt="Security infrastructure"
            className="w-full h-full object-cover min-h-[400px]"
          />
        </Reveal>
      </div>
    </section>
  );
}

// ── WHO IT'S FOR ──────────────────────────────────────────
const AUDIENCES = [
  {
    role: "Founder",
    tag: "RAISING CAPITAL",
    desc: "You're raising from angels, syndicates, or funds. You need a sequenced process that protects you and your investor equally — and leaves a permanent, exportable record of every commitment made.",
    uses: ["Structured data room by gate", "Per-person NDA enforcement", "Condition precedent tracking", "Signed close record you own"],
  },
  {
    role: "Advisors & Agents",
    tag: "DEAL FACILITATION",
    desc: "You coordinate transactions between parties and need full visibility without being a principal. Lengdon gives you a neutral record of every action taken on both sides — without you holding the data.",
    uses: ["Read-only observer access", "Append-only audit trail", "Multi-party coordination", "Neutral infrastructure"],
  },
  {
    role: "Angels",
    tag: "INDIVIDUAL INVESTOR",
    desc: "You invest personally. You need a formal closing process that protects your capital and leaves a clear record — even when investing alongside others or into early-stage companies without legal teams.",
    uses: ["Formal structure for informal deals", "Payment proof confirmation", "Independent signing workflow", "Exportable close record"],
  },
  {
    role: "Legal",
    tag: "COUNSEL & COMPLIANCE",
    desc: "Your clients are on both sides of the transaction. Lengdon gives each counsel team a separate, encrypted view of the record — with no shared data room and no cross-party exposure before each gate is met.",
    uses: ["Per-party confidentiality", "Gate-by-gate document release", "Append-only legal audit trail", "Per-party access separation"],
  },
  {
    role: "Analyst",
    tag: "DUE DILIGENCE",
    desc: "You evaluate deals. You need a data room that is consistent in structure, a diligence list that actually tracks ownership, and a record of every document accessed and every condition cleared.",
    uses: ["Structured conditions checklist", "Document access log", "Consistent room architecture", "Exportable diligence record"],
  },
  {
    role: "VC Firm",
    tag: "VENTURE CAPITAL",
    desc: "You deploy capital at scale. You need closing infrastructure that your legal, compliance, and ops teams can rely on — with consistent room structure, enforced sequencing, and a record that survives the fund's lifetime.",
    uses: ["Portfolio-wide room consistency", "Compliance-grade audit trail", "Multi-party conditions enforcement", "Fund-level record retention"],
  },
  {
    role: "PE Firm",
    tag: "PRIVATE EQUITY",
    desc: "Your transactions are complex, multi-party, and long-running. Lengdon enforces sequencing across all conditions, all signatories, and all confirmations — with a permanent record tied to each closing event.",
    uses: ["Complex conditions management", "Multi-signatory coordination", "Long-duration room support", "Permanent sealed close record"],
  },
  {
    role: "Syndicate Lead",
    tag: "INVESTOR COORDINATION",
    desc: "You coordinate groups of investors into a single closing. You need a room where each investor follows the same process, conditions are tracked collectively, and the record is shared with everyone at close.",
    uses: ["Multi-investor room architecture", "Collective conditions tracking", "Payment confirmation per investor", "Shared exportable close record"],
  },
];

function AudienceSection() {
  const [active, setActive] = useState(0);
  const current = AUDIENCES[active];

  return (
    <section className="bg-white border-b border-[#e6e9ef] max-w-[1440px] mx-auto w-full">
      <div className="px-12 lg:px-16 pt-24 pb-14 border-b border-[#e6e9ef]">
        <Reveal>
          <div className="flex flex-col lg:flex-row justify-between gap-8 items-end">
            <div>
              <SectionLabel>Audience</SectionLabel>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(52px,6vw,80px)" }} className="font-semibold text-[#0a2540] leading-[0.9] tracking-[-2.5px]">
                WHO IT'S FOR
              </h2>
            </div>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75] max-w-[440px] pb-1">
              Lengdon is built for every party in a private capital transaction — not just the two principals. Each role gets the access and record they need, separated by design.
            </p>
          </div>
        </Reveal>
      </div>

      <div className="flex min-h-[560px]">
        <div className="w-[280px] xl:w-[320px] shrink-0 border-r border-[#e6e9ef] flex flex-col">
          {AUDIENCES.map((a, i) => (
            <button
              key={a.role}
              onClick={() => setActive(i)}
              className={`group flex items-center justify-between px-8 py-4 border-b border-[#e6e9ef] text-left transition-all duration-200 last:border-b-0 ${
                active === i
                  ? "bg-[#0a2540]"
                  : "bg-white hover:bg-[#f8f9fb]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[10px] tracking-[1.5px] w-5 shrink-0 ${active === i ? "text-white/30" : "text-[#c9d0db]"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontFamily: "'Geist:Regular', sans-serif" }} className={`text-[15px] tracking-[-0.2px] transition-colors ${active === i ? "text-white" : "text-[#0a2540] group-hover:text-[#0a2540]"}`}>
                  {a.role}
                </span>
              </div>
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none"
                className={`shrink-0 transition-opacity ${active === i ? "opacity-100" : "opacity-0 group-hover:opacity-30"}`}>
                <path d="M1 4H13M13 4L10 1M13 4L10 7" stroke={active === i ? "white" : "#0a2540"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          <div className="flex-1 px-12 xl:px-16 py-12 flex flex-col justify-between">
            <div className="flex flex-col gap-7">
              <div className="flex items-center gap-3">
                <div className="w-4 h-px bg-[#d4af37]/60" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#d4af37]/80 text-[10px] tracking-[2px] uppercase">
                  {current.tag}
                </span>
              </div>
              <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(36px,4vw,52px)" }} className="font-semibold text-[#0a2540] leading-[1.0] tracking-[-1.5px]">
                {current.role}
              </h3>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] xl:text-[16px] leading-[1.75] max-w-[480px]">
                {current.desc}
              </p>
              <div className="flex flex-col gap-0 border-t border-[#e6e9ef] pt-6">
                {current.uses.map((u, i) => (
                  <div key={i} className={`flex items-center gap-4 py-3 ${i < current.uses.length - 1 ? "border-b border-[#f0f2f5]" : ""}`}>
                    <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                      <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                        <path d="M1 2.5L2.5 4L6 1" stroke="#059669" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px]">{u}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-8">
              {AUDIENCES.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`transition-all duration-300 ${i === active ? "w-5 h-1.5 bg-[#0a2540]" : "w-1.5 h-1.5 rounded-full bg-[#e6e9ef] hover:bg-[#c9d0db]"}`} />
              ))}
              <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="ml-auto text-[#c9d0db] text-[11px] tracking-[0.5px]">
                {String(active + 1).padStart(2, "0")} / {String(AUDIENCES.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="hidden xl:flex w-[280px] shrink-0 border-l border-[#e6e9ef] bg-[#f8f9fb] flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
              <span style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(80px, 10vw, 140px)", writingMode: "vertical-rl", transform: "rotate(180deg)" }} className="font-semibold text-[#0a2540]/5 leading-none tracking-[-4px]">
                {current.role.toUpperCase()}
              </span>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-3">
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Role</span>
              <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[56px] leading-none tracking-[-2px]">
                {String(active + 1).padStart(2, "0")}
              </span>
              <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#c9d0db] text-[12px] tracking-[0.5px]">of {AUDIENCES.length}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA SECTION ───────────────────────────────────────────
function CTASection() {
  return (
    <section className="bg-white border-b border-[#e6e9ef] max-w-[1440px] mx-auto w-full overflow-hidden">
      <Reveal>
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 bg-[#0a2540] px-12 xl:px-20 py-24 lg:py-32 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
                backgroundSize: "60px 60px"
              }} />
            <div className="relative z-10 flex flex-col gap-10">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: "pub-pulse-glow 2s ease-in-out infinite" }} />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-emerald-400/70 text-[11px] tracking-[2px] uppercase">
                  Infrastructure live
                </span>
              </div>

              <div>
                <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(64px, 8vw, 116px)" }} className="font-semibold text-white leading-[0.88] tracking-[-3.5px]">
                  READY<br />TO CLOSE?
                </h2>
              </div>

              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[16px] leading-[1.7] max-w-[440px]">
                Initialize a room, invite both parties, and begin the six-gate process today. No integration, no setup call, no consultant required.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f5f0e8] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-all duration-200 active:scale-95">
                  Initialize Account
                </Link>
                <Link to="/sign-in" search={{ redirect: "/app" }} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">
                  Sign in →
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 pt-2 border-t border-white/8">
                {[
                  "6-gate enforced sequence",
                  "Per-person encryption",
                  "Permanent audit record",
                  "Both parties export at close",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#d4af37]/60" />
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/35 text-[12px] tracking-[0.3px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(120px, 18vw, 260px)" }} className="absolute bottom-0 right-0 font-semibold text-white/4 leading-none tracking-[-8px] select-none pointer-events-none">
              06
            </div>
          </div>

          <div className="lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col">
            <div className="flex-1 relative overflow-hidden bg-[#0d1b2e] min-h-[320px]">
              <img
                src="/images/homepage/cta-transaction.jpg"
                alt="Two parties completing a private capital transaction"
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a2540]/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-8 right-8">
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/40 text-[10px] tracking-[1.5px] uppercase mb-1">Current activity</div>
                <div style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-white/80 text-[13px] tracking-[-0.2px]">
                  000042 · Conditions gate — 5 of 6 satisfied
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-[#e6e9ef]">
              {[
                { val: "6",     label: "Sequential gates",        accent: false },
                { val: "1:1",   label: "Per-person confidentiality", accent: true  },
                { val: "100%",  label: "Append-only record",      accent: false },
                { val: "∞",     label: "Sealed at every close",   accent: true  },
              ].map((s, i) => (
                <div key={i} className={`px-8 py-7 flex flex-col gap-1 border-[#e6e9ef] ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""}`}>
                  <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[36px] leading-none tracking-[-1.5px]">
                    {s.val}
                  </span>
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] leading-[1.4]">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <AppendOnlyRecordSection />
        <DemoSection />
        <ProcessSection />
        <InfrastructureBannerSection />
        <SecuritySection />
        <AudienceSection />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
}
