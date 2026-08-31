import { Link } from "@tanstack/react-router";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/components/PageHero.tsx. Real shared component
// in the source (used by 30 of its ~44 pages), ported as a real shared
// component here rather than inlined per-page, matching the source's own
// architecture. Values (colors, type, spacing, clamp ranges) are the
// source's, unchanged.

export interface PageHeroProps {
  eyebrow: string;
  title: string;
  titleOutline?: string;
  subtitle?: string;
  cta?: { label: string; to: string; search?: Record<string, unknown> };
  dark?: boolean;
}

export function PageHero({ eyebrow, title, titleOutline, subtitle, cta, dark = false }: PageHeroProps) {
  return (
    <section
      className={`pt-32 pb-20 border-b border-[#e6e9ef] relative overflow-hidden ${dark ? "bg-[#0a2540]" : "bg-white"}`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(transparent calc(100% - 1px), ${dark ? "rgba(255,255,255,0.04)" : "#f0f2f5"} calc(100% - 1px))`,
          backgroundSize: "100% 80px",
          opacity: 0.5,
        }}
      />
      <div className="relative z-10 max-w-[1280px] mx-auto px-10">
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-4 h-px ${dark ? "bg-white/40" : "bg-[#0a2540]/40"}`} />
          <span
            style={{ fontFamily: "'Inter:Medium', sans-serif" }}
            className={`text-[11px] tracking-[2px] uppercase ${dark ? "text-white/50" : "text-[#94a3b8]"}`}
          >
            {eyebrow}
          </span>
        </div>
        <h1
          style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(56px, 7vw, 96px)" }}
          className="font-semibold leading-[0.9] tracking-[-3px] mb-6"
        >
          <span className={`block ${dark ? "text-white" : "text-[#0a2540]"}`}>{title}</span>
          {titleOutline && (
            <span
              className="block"
              style={{
                WebkitTextStroke: `2px ${dark ? "rgba(255,255,255,0.6)" : "#0a2540"}`,
                color: "transparent",
              }}
            >
              {titleOutline}
            </span>
          )}
        </h1>
        {subtitle && (
          <p
            style={{ fontFamily: "'Inter:Regular', sans-serif" }}
            className={`text-[17px] leading-[1.7] max-w-[560px] ${dark ? "text-white/60" : "text-[#425466]"}`}
          >
            {subtitle}
          </p>
        )}
        {cta && (
          <div className="mt-10">
            <Link
              to={cta.to as any}
              search={cta.search as any}
              style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
              className={`inline-block font-semibold text-[14px] px-10 py-4 transition-colors duration-200 ${
                dark
                  ? "bg-white text-[#0a2540] hover:bg-[#f0ece0]"
                  : "bg-[#0a2540] text-white hover:bg-[#13233a]"
              }`}
            >
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
