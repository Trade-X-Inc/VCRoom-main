import { Link } from "@tanstack/react-router";

// SEO-009 Phase 2 — migrated to PUBLIC-REGISTER.md v2.0 tokens.
// Structure/spacing/layout/props contract unchanged (21 consumers,
// verified zero v2.0 consumers before this change — see the SEO-009
// Step-0 audit). Title now uses the real `.pub-display` class (§3.1)
// instead of the old fixed 96px/weight-600 scale — this is the
// documented, intentional v2.0 display treatment, not an approximation.
// The hollow/outline second-line device is kept (not prohibited by
// PUBLIC-REGISTER.md §9 — a design decision, not a compliance question)
// with its stroke color swapped to the v2 ink/accent tokens.

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
      className="pt-32 pb-20 relative overflow-hidden"
      style={{
        borderBottom: `1px solid var(--v2-rule)`,
        background: dark ? "var(--pub-n-0d)" : "var(--pub-n-06)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(transparent calc(100% - 1px), ${dark ? "rgba(255,255,255,0.04)" : "var(--v2-rule-light)"} calc(100% - 1px))`,
          backgroundSize: "100% 80px",
          opacity: 0.5,
        }}
      />
      <div className="relative z-10 max-w-[1280px] mx-auto px-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-4 h-px" style={{ background: dark ? "rgba(255,255,255,0.4)" : "var(--v2-accent)", opacity: dark ? 1 : 0.4 }} />
          <span
            style={{ fontFamily: "var(--font-v2-data)", color: dark ? "rgba(255,255,255,0.5)" : "var(--v2-ink-muted)" }}
            className="text-[11px] tracking-[0.09em] uppercase"
          >
            {eyebrow}
          </span>
        </div>
        <h1
          className="pub-display mb-6"
          style={{ fontFamily: "var(--font-v2-ui)", color: dark ? "#FFFFFF" : "var(--v2-ink)" }}
        >
          <span className="block">{title}</span>
          {titleOutline && (
            <span
              className="block"
              style={{
                WebkitTextStroke: `2px ${dark ? "rgba(255,255,255,0.6)" : "var(--v2-accent)"}`,
                color: "transparent",
              }}
            >
              {titleOutline}
            </span>
          )}
        </h1>
        {subtitle && (
          <p
            style={{ fontFamily: "var(--font-v2-ui)", color: dark ? "rgba(255,255,255,0.6)" : "var(--v2-ink-secondary)" }}
            className="text-[17px] leading-[1.7] max-w-[560px]"
          >
            {subtitle}
          </p>
        )}
        {cta && (
          <div className="mt-10">
            <Link
              to={cta.to as any}
              search={cta.search as any}
              style={{
                fontFamily: "var(--font-v2-ui)", fontWeight: 500,
                background: dark ? "#FFFFFF" : "var(--v2-accent)",
                color: dark ? "var(--v2-accent)" : "#FFFFFF",
              }}
              className="inline-block text-[14px] px-10 py-4 transition-colors duration-200"
            >
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
