import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LcsPageShell, LcsNavItem, LcsPageHeader, LcsCard, LcsButton, LcsTextField, LcsTextareaField, LcsStatusPill } from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { ProfileStepNav, useFounderRole, NonFounderNotice } from "@/routes/deals-preview.profile";
import {
  getFounderThesisSandbox,
  saveFounderThesisSandbox,
  INVESTOR_TYPE_OPTIONS,
  BOARD_PREFERENCE_OPTIONS,
  getSandboxCompany,
  type LcsFounderThesis,
} from "@/lib/lcs-sandbox";

// Fundraising Thesis — real screen extraction (2 Sep 2026). Source:
// app.profile.tsx's investor-criteria section (FounderThesis, backed by
// lib/founder-thesis-fn.ts). Real 7 fields + status, ported verbatim:
// check size range, investor type (3 pill choices), involvement
// preference (3 pill choices), sector expertise wanted, geography
// preference, exclusions, what a great-fit investor looks like.
//
// EXCLUDED, confirmed discovery-layer residue: the real section header
// copy "This helps us match you with investors who are actually right
// for you, not just anyone who's interested" (app.profile.tsx:1798) —
// explicit matching-layer framing. This sandbox instead frames the
// section around what these fields actually are: a stated preference the
// founder records for their own reference and to show approved
// investors — not a matching input, since no matching/scoring system
// reads it here. The real "AI propose defaults" feature (a single
// "Suggest defaults" button that bulk-fills every field) is NOT ported
// as a bulk action — this build's own established discipline (Document
// Vault, Profile Builder Quick Setup) is per-field propose/confirm, not
// a single AI button that fills a whole form; omitted rather than built
// against a pattern this session has already moved away from.

export const Route = createFileRoute("/deals-preview/profile_/thesis")({
  component: FundraisingThesis,
});

function FundraisingThesis() {
  const role = useFounderRole();
  const [hasCompany, setHasCompany] = useState<boolean | undefined>(undefined);
  const [thesis, setThesis] = useState<LcsFounderThesis | null>(null);

  useEffect(() => {
    setHasCompany(!!getSandboxCompany());
    setThesis(getFounderThesisSandbox());
  }, []);

  const set = <K extends keyof LcsFounderThesis>(key: K, value: LcsFounderThesis[K]) => {
    setThesis((t) => (t ? { ...t, [key]: value } : t));
  };

  const handleSave = (status: "draft" | "complete") => {
    if (!thesis) return;
    const saved = { ...thesis, status };
    saveFounderThesisSandbox(saved);
    setThesis(saved);
  };

  const isFounder = role === "founder";

  return (
    <LcsPageShell
      searchPlaceholder="Search transactions, LPs, requests"
      userInitials="RM"
      userLabel="R. Mehta"
      headerExtra={<RoleSwitcher />}
      sidebar={(collapsed) => (
        <nav className="flex flex-col gap-0.5 p-2">
          {!collapsed && (
            <div className="px-2 py-2 text-[15px] font-semibold" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
              Lengdon
            </div>
          )}
          <LcsNavItem to="/deals-preview" label="Home" collapsed={collapsed} icon="H" />
          <LcsNavItem to="/deals-preview" label="Transactions" collapsed={collapsed} icon="T" />
          <LcsNavItem to="/deals-preview" label="Requests" collapsed={collapsed} icon="R" />
          {role === "founder" && (
            <LcsNavItem to="/deals-preview/profile" label="Profile" active collapsed={collapsed} icon="C" />
          )}
          <LcsNavItem to="/deals-preview" label="Investors" collapsed={collapsed} icon="I" />
          <LcsNavItem to="/deals-preview/vault" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          {role === "advisor" && (
            <LcsNavItem to="/deals-preview/team" label="Team" collapsed={collapsed} icon="P" />
          )}
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader title="Company profile" description="Your public profile — how investors find and evaluate your company." />
      {role === undefined || hasCompany === undefined || thesis === null ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <NonFounderNotice />
      ) : (
        <>
          <ProfileStepNav active="/deals-preview/profile/thesis" />
          {!hasCompany ? (
            <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--lcs-line)" }}>
              <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>Build your profile first.</p>
            </div>
          ) : (
            <LcsCard
              title={
                <span className="flex items-center gap-2">
                  <span>What kind of investor are you looking for</span>
                  {thesis.status === "complete" && <LcsStatusPill status="satisfied" label="Complete" />}
                </span>
              }
            >
              <div className="p-4 flex flex-col gap-4">
                <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>
                  A stated preference for your own reference and to show approved investors — not used to filter or rank anyone.
                </p>

                <div>
                  <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, fontWeight: 500, color: "var(--lcs-ink-muted)" }}>Check size range</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      value={thesis.preferredCheckSizeMin}
                      onChange={(e) => set("preferredCheckSizeMin", e.target.value)}
                      placeholder="Min e.g. $250k"
                      className="flex-1 h-8 px-3 text-[13px] outline-none"
                      style={{ border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
                    />
                    <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>to</span>
                    <input
                      value={thesis.preferredCheckSizeMax}
                      onChange={(e) => set("preferredCheckSizeMax", e.target.value)}
                      placeholder="Max e.g. $3M"
                      className="flex-1 h-8 px-3 text-[13px] outline-none"
                      style={{ border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
                    />
                  </div>
                </div>

                <PillChoice label="Investor type" options={INVESTOR_TYPE_OPTIONS} value={thesis.preferredInvestorType} onChange={(v) => set("preferredInvestorType", v)} />

                <PillChoice
                  label="Involvement preference"
                  options={BOARD_PREFERENCE_OPTIONS.map((o) => o.value)}
                  shortLabels={BOARD_PREFERENCE_OPTIONS.map((o) => o.short)}
                  value={thesis.boardPreference}
                  onChange={(v) => set("boardPreference", v)}
                />

                <LcsTextField label="Sector expertise wanted" value={thesis.sectorExpertiseWanted} onChange={(e) => set("sectorExpertiseWanted", e.target.value)} placeholder="e.g. Defence, robotics, GCC enterprise sales" />
                <LcsTextField label="Geography preference" value={thesis.geographyPreference} onChange={(e) => set("geographyPreference", e.target.value)} placeholder="e.g. GCC-based or UK/Europe, or 'No preference'" />
                <LcsTextareaField label="Exclusions / red lines" value={thesis.exclusions} onChange={(e) => set("exclusions", e.target.value)} rows={2} placeholder="e.g. No investors with portfolio conflicts in defence or surveillance tech" />
                <LcsTextareaField label="What a great-fit investor looks like" value={thesis.whatGoodFitLooksLike} onChange={(e) => set("whatGoodFitLooksLike", e.target.value)} rows={3} placeholder="In your own words — what would make you say yes immediately?" />

                <div className="flex items-center gap-2 pt-1">
                  <LcsButton variant="primary" onClick={() => handleSave("complete")}>
                    Save investor criteria
                  </LcsButton>
                  <LcsButton variant="secondary" onClick={() => handleSave("draft")}>
                    Save as draft
                  </LcsButton>
                </div>
              </div>
            </LcsCard>
          )}
        </>
      )}
    </LcsPageShell>
  );
}

function PillChoice({
  label,
  options,
  shortLabels,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  shortLabels?: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, fontWeight: 500, color: "var(--lcs-ink-muted)" }}>{label}</span>
      <div className="grid sm:grid-cols-3 gap-2 mt-1.5">
        {options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="text-left px-3 py-2.5 text-[13px]"
            style={{
              fontFamily: "var(--font-lcs-ui)",
              border: `1px solid ${value === opt ? "var(--lcs-accent)" : "var(--lcs-line)"}`,
              background: value === opt ? "var(--lcs-progress-wash)" : "var(--lcs-white)",
              color: value === opt ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
            }}
          >
            {shortLabels ? shortLabels[i] : opt}
          </button>
        ))}
      </div>
    </div>
  );
}
