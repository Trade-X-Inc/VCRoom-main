/**
 * BadgeDisplay — professional credential display, not gamification.
 *
 * Each badge is a small pill: [icon] [label] [date]. Hover shows the honest
 * one-sentence definition from badge_definitions. Click expands the earned
 * date and the criteria snapshot that qualified this profile (from
 * profile_badges.verification_evidence). No popups, no confetti.
 */

import { useState } from "react";
import {
  ShieldCheck, BadgeCheck, CircleDollarSign, Users, Shield, Award,
  Briefcase, FolderCheck, Zap, ClipboardCheck, TrendingUp, Trophy, Star,
  Flame, Crown, GraduationCap, Activity, Target, Handshake, CheckCheck,
  MessageSquare, Landmark, ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BadgeRow {
  badge_type: string;
  issued_at: string | null;
  verification_evidence: { criteria_met?: Record<string, unknown> } | null;
  // joined from badge_definitions:
  label: string;
  description: string;
  icon: string;
  color: string;
  category: "trust" | "readiness" | "community" | "investor";
  sort_order: number;
}

interface BadgeDisplayProps {
  badges: BadgeRow[];
  size?: "sm" | "md" | "lg";
  maxVisible?: number;
  showCategory?: boolean;
  context: "profile" | "directory" | "deal-room" | "public";
}

// ── Icon + color registries (badge_definitions stores names, not components) ──

const ICONS: Record<string, LucideIcon> = {
  "shield-check": ShieldCheck,
  "badge-check": BadgeCheck,
  "circle-dollar-sign": CircleDollarSign,
  "users": Users,
  "shield": Shield,
  "award": Award,
  "briefcase": Briefcase,
  "folder-check": FolderCheck,
  "zap": Zap,
  "clipboard-check": ClipboardCheck,
  "trending-up": TrendingUp,
  "trophy": Trophy,
  "star": Star,
  "flame": Flame,
  "crown": Crown,
  "graduation-cap": GraduationCap,
  "activity": Activity,
  "target": Target,
  "handshake": Handshake,
  "check-check": CheckCheck,
  "message-square": MessageSquare,
  "landmark": Landmark,
};

const COLORS: Record<string, { text: string; bg: string; border: string }> = {
  blue:    { text: "#3B82F6", bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.25)" },
  indigo:  { text: "#6366F1", bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.25)" },
  purple:  { text: "#A855F7", bg: "rgba(124,58,237,0.10)",  border: "rgba(124,58,237,0.25)" },
  emerald: { text: "#10B981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)" },
  amber:   { text: "#F59E0B", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.25)" },
  gold:    { text: "#EAB308", bg: "rgba(234,179,8,0.10)",   border: "rgba(234,179,8,0.30)" },
  orange:  { text: "#F97316", bg: "rgba(249,115,22,0.10)",  border: "rgba(249,115,22,0.30)" },
};

const CATEGORY_ORDER: Record<BadgeRow["category"], number> = {
  trust: 0, readiness: 1, community: 2, investor: 3,
};
const CATEGORY_LABELS: Record<BadgeRow["category"], string> = {
  trust: "Trust", readiness: "Readiness", community: "Community", investor: "Investor",
};

function fmtDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

/** Turn the criteria snapshot into short readable lines. */
function evidenceLines(evidence: BadgeRow["verification_evidence"]): string[] {
  const met = evidence?.criteria_met;
  if (!met || typeof met !== "object") return [];
  return Object.entries(met)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`);
}

// ── Single badge pill ─────────────────────────────────────────────────────────

function BadgePill({ badge, size, expandable }: { badge: BadgeRow; size: "sm" | "md" | "lg"; expandable: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[badge.icon] ?? Shield;
  const c = COLORS[badge.color] ?? COLORS.blue;
  const isTrust = badge.category === "trust";
  const isRoast = badge.badge_type.startsWith("roast_");

  const sizing = size === "lg"
    ? { pad: "6px 14px", font: 13, icon: 15 }
    : size === "md"
    ? { pad: "5px 11px", font: 12, icon: 13 }
    : { pad: "3px 9px", font: 11, icon: 12 };

  const lines = evidenceLines(badge.verification_evidence);

  return (
    <div className="inline-flex flex-col" style={{ maxWidth: "100%" }}>
      <button
        type="button"
        onClick={expandable ? () => setOpen((o) => !o) : undefined}
        title={badge.description}
        data-testid={`badge-${badge.badge_type}`}
        className="inline-flex items-center gap-1.5 rounded-full font-medium transition-opacity hover:opacity-85"
        style={{
          padding: sizing.pad,
          fontSize: sizing.font,
          color: c.text,
          background: c.bg,
          // Trust badges get a solid border; others a softer one. Roast is dashed — its own thing.
          border: isRoast
            ? `1px dashed ${c.border}`
            : `1px solid ${isTrust ? c.border : "rgba(255,255,255,0.10)"}`,
          cursor: expandable ? "pointer" : "help",
        }}
      >
        <Icon style={{ width: sizing.icon, height: sizing.icon }} className="shrink-0" />
        <span className="truncate">{badge.label}</span>
        {badge.issued_at && size !== "sm" && (
          <span style={{ opacity: 0.55, fontWeight: 400 }}>· {fmtDate(badge.issued_at)}</span>
        )}
        {expandable && <ChevronDown style={{ width: 11, height: 11, opacity: 0.4, transform: open ? "rotate(180deg)" : undefined }} />}
      </button>
      {open && (
        <div
          className="mt-1.5 rounded-lg px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", maxWidth: 340 }}
        >
          <div className="text-foreground/80 dark:text-white/70">{badge.description}</div>
          {badge.issued_at && (
            <div className="mt-1 text-muted-foreground dark:text-white/40">
              Earned {new Date(badge.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
          {lines.length > 0 && (
            <div className="mt-1 text-muted-foreground dark:text-white/35">
              {lines.map((l) => <div key={l}>{l}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main display ──────────────────────────────────────────────────────────────

export function BadgeDisplay({
  badges,
  size = "sm",
  maxVisible,
  showCategory = false,
  context,
}: BadgeDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  if (!badges.length) return null;

  const sorted = [...badges].sort((a, b) =>
    CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.sort_order - b.sort_order);

  // Clicking to expand evidence is for owner/deal contexts; public + directory stay tooltip-only
  const expandable = context === "profile" || context === "deal-room";

  if (showCategory) {
    const groups = new Map<BadgeRow["category"], BadgeRow[]>();
    for (const b of sorted) {
      if (!groups.has(b.category)) groups.set(b.category, []);
      groups.get(b.category)!.push(b);
    }
    return (
      <div className="space-y-3">
        {[...groups.entries()].map(([cat, rows]) => (
          <div key={cat}>
            <div className="mb-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground dark:text-white/35">
              {CATEGORY_LABELS[cat]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rows.map((b) => <BadgePill key={b.badge_type} badge={b} size={size} expandable={expandable} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const visible = maxVisible && !showAll ? sorted.slice(0, maxVisible) : sorted;
  const hidden = sorted.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((b) => <BadgePill key={b.badge_type} badge={b} size={size} expandable={expandable} />)}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="rounded-full px-2 py-0.5 text-[11px] text-muted-foreground dark:text-white/40 hover:text-foreground"
          style={{ border: "1px solid rgba(255,255,255,0.10)" }}
        >
          +{hidden} more
        </button>
      )}
    </div>
  );
}

// ── Data hook helper: profile_badges ⋈ badge_definitions ────────────────────

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useBadges(target: { startupId?: string; investorProfileId?: string }) {
  return useQuery<BadgeRow[]>({
    queryKey: ["profile-badges", target.startupId ?? target.investorProfileId],
    enabled: !!(target.startupId || target.investorProfileId),
    staleTime: 60_000,
    queryFn: async () => {
      const col = target.startupId ? "startup_id" : "investor_profile_id";
      const id = target.startupId ?? target.investorProfileId!;
      const [{ data: rows }, { data: defs }] = await Promise.all([
        supabase.from("profile_badges")
          .select("badge_type, issued_at, verification_evidence")
          .eq(col, id),
        supabase.from("badge_definitions")
          .select("id, label, description, icon, color, category, sort_order, visible_on_public_profile"),
      ]);
      const defById = new Map((defs ?? []).map((d: any) => [d.id, d]));
      return (rows ?? [])
        .map((r: any) => {
          const d = defById.get(r.badge_type);
          if (!d) return null;
          return {
            badge_type: r.badge_type,
            issued_at: r.issued_at,
            verification_evidence: r.verification_evidence,
            label: d.label,
            description: d.description,
            icon: d.icon,
            color: d.color,
            category: d.category,
            sort_order: d.sort_order,
          } as BadgeRow;
        })
        .filter(Boolean) as BadgeRow[];
    },
  });
}
