import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
  LcsCard,
  LcsButton,
  LcsStatusPill,
  LcsTextField,
  LcsSelectField,
  LcsDropzone,
} from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import {
  getSandboxCompany,
  saveSandboxCompany,
  companyCompleteness,
  COMPANY_PUBLISH_THRESHOLD,
  mockExtractCompanyFields,
  isSectorActive,
  SECTORS,
  COMPANY_STAGES,
  WAITING_LIST_COPY,
  type LcsSandboxCompany,
  type LcsSectorId,
  type LcsCompanyStage,
  type LcsExtractedField,
  type LcsViewerRole,
} from "@/lib/lcs-sandbox";
import { ExtractionReview, PROFILE_EMPTY_FORM, type ProfileFormState } from "@/components/deals-preview/ProfileForm";

// Founder Profile Builder — real-screen extraction pass (2 Sep 2026).
// STOP building mock screens from a spec description — per direct
// instruction, this replaces the earlier workflow-spec-derived version
// of this route with a reskin of the REAL founder profile builder.
//
// Source: app.profile.tsx's ProfileView component, `tab === "quick"`
// branch (the "QUICK SETUP: 5 fields" comment marks it verbatim in the
// source) plus its shared RightCol (pitch-deck upload → AI extract →
// pre-fill, a real CLAUDE.md §10 extraction use, reusing this build's
// existing mockExtractFields per-field confirm/correct pattern from
// Document Vault — not the AIFeedback score/signal/recommendations
// residue flagged for exclusion in the Document Vault screen).
//
// Real fields, in the real order: company_name, tagline, website,
// country, sector. Sector is a SELECT constrained to this sandbox's
// LcsSectorId (checkpoint 5's closed set) rather than the real product's
// free text — a deliberate, already-established divergence, not new to
// this pass. Stage is NOT part of Quick Setup in the real product (it's
// a Full Profile field) — moved there in this reskin too, correcting the
// earlier workflow-spec version which had wrongly included it here.
//
// Real product has 5 independently-reachable steps (Quick Setup, Full
// Profile, Team Cards, Achievements, Fundraising Thesis), coordinated by
// the sidebar nav, NOT a linear wizard — nav-structure.ts is the source
// of the step order; there is no parent layout route. This file is
// Quick Setup, matching the real product's own /app/prepare/profile-
// builder/quick-setup URL and its role as the entry point (real
// app.investor.thesis.index.tsx-equivalent redirect pattern: this
// sandbox's bare /deals-preview/profile now means quick-setup).
//
// Excluded, confirmed discovery-layer residue: `publicly_discoverable`
// flag and "live in the directory" framing (app.profile.tsx:445-460),
// "not yet visible in the directory" warning copy (app.profile.tsx:1061
// — the real 80% publish gate is kept, restated without directory
// language, matching this sandbox's own COMPANY_PUBLISH_THRESHOLD).

const VIEWER_ROLE_KEY = "lcs-viewer-role";

export const Route = createFileRoute("/deals-preview/profile")({
  component: QuickSetup,
});

const STEP_NAV = [
  { to: "/deals-preview/profile" as const, label: "Quick setup" },
  { to: "/deals-preview/profile/full" as const, label: "Full profile" },
  { to: "/deals-preview/profile/team" as const, label: "Team cards" },
  { to: "/deals-preview/profile/achievements" as const, label: "Achievements" },
  { to: "/deals-preview/profile/thesis" as const, label: "Fundraising thesis" },
];

export function ProfileStepNav({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-1 mb-4 flex-wrap" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
      {STEP_NAV.map((s) => (
        <Link
          key={s.to}
          to={s.to}
          className="h-9 px-3 text-[13px] flex items-center -mb-px"
          style={{
            fontFamily: "var(--font-lcs-ui)",
            fontWeight: active === s.to ? 500 : 400,
            color: active === s.to ? "var(--lcs-accent)" : "var(--lcs-ink)",
            borderBottom: active === s.to ? "2px solid var(--lcs-accent)" : "2px solid transparent",
          }}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}

export function ProfileShell({
  role,
  children,
}: {
  role: LcsViewerRole | undefined;
  children: React.ReactNode;
}) {
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
          <LcsNavItem to="/deals-preview/requests" label="Requests" collapsed={collapsed} icon="R" />
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
      {children}
    </LcsPageShell>
  );
}

export function useFounderRole() {
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);
  useEffect(() => {
    const readRole = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(VIEWER_ROLE_KEY);
      } catch {
        /* private window / storage blocked — default to founder */
      }
      setRole(stored === "founder" || stored === "investor" || stored === "advisor" ? stored : "founder");
    };
    readRole();
    window.addEventListener(VIEWER_ROLE_CHANGE_EVENT, readRole);
    return () => window.removeEventListener(VIEWER_ROLE_CHANGE_EVENT, readRole);
  }, []);
  return role;
}

export function NonFounderNotice() {
  return (
    <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
      Profile building is only available in Founder view. Switch roles above to view it.
    </p>
  );
}

function QuickSetup() {
  const role = useFounderRole();
  const [company, setCompany] = useState<LcsSandboxCompany | null | undefined>(undefined);
  const [form, setForm] = useState<ProfileFormState>(PROFILE_EMPTY_FORM);
  const [deckName, setDeckName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [fields, setFields] = useState<LcsExtractedField[] | null>(null);

  useEffect(() => {
    const existing = getSandboxCompany();
    setCompany(existing);
    if (existing) setForm({ ...PROFILE_EMPTY_FORM, ...existing });
  }, []);

  const handleSave = () => {
    const saved = saveSandboxCompany(form);
    setCompany(saved);
  };

  const handleDeckUpload = (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setDeckName(file.name);
    setExtracting(true);
    // Mock 10-20s extraction, matching the real product's own copy —
    // shortened for a usable sandbox demo, same discipline as every
    // other "real interaction, mocked latency" choice in this build.
    setTimeout(() => {
      setFields(mockExtractCompanyFields(file.name));
      setExtracting(false);
    }, 600);
  };

  const applyConfirmedField = (label: string, value: string) => {
    const key = label === "Company name" ? "name" : label === "Tagline" ? "tagline" : label === "Funding target" ? "fundingTarget" : null;
    if (!key) return;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const isFounder = role === "founder";
  const completeness = companyCompleteness(company ?? null);

  return (
    <ProfileShell role={role}>
      <LcsPageHeader title="Company profile" description="Your public profile — how investors find and evaluate your company." />
      {role === undefined || company === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <NonFounderNotice />
      ) : (
        <>
          <ProfileStepNav active="/deals-preview/profile" />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <LcsCard title="Quick setup">
                <div className="p-4 flex flex-col gap-3">
                  <LcsTextField label="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Atlas Robotics" />
                  <LcsTextField label="Tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="One line that explains your company" />
                  <LcsTextField label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
                  <LcsTextField label="Country / HQ" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="San Francisco, USA" />
                  <LcsSelectField
                    label="Sector"
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value as LcsSectorId })}
                    helper={!isSectorActive(form.sector) ? WAITING_LIST_COPY : undefined}
                  >
                    {SECTORS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.status === "coming-soon" ? " (coming soon)" : ""}
                      </option>
                    ))}
                  </LcsSelectField>
                  <div className="pt-2">
                    <LcsButton variant="primary" onClick={handleSave}>
                      Save
                    </LcsButton>
                  </div>
                </div>
              </LcsCard>
            </div>
            <div className="flex flex-col gap-4">
              <LcsCard title="Pitch deck">
                {extracting ? (
                  <div className="p-5 text-center">
                    <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink)" }}>Analysing pitch deck…</p>
                    <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>This takes a few seconds</p>
                  </div>
                ) : fields ? (
                  <div className="p-4">
                    <ExtractionReview
                      fields={fields}
                      setFields={(updater) => setFields((prev) => (prev ? updater(prev) : prev))}
                      onFieldResolved={applyConfirmedField}
                      documentName={deckName ?? ""}
                    />
                  </div>
                ) : (
                  <div className="p-4">
                    <LcsDropzone label="" hint="Drop a deck or click to upload — PDF or PPTX" onFilesSelected={handleDeckUpload} />
                    <p className="mt-2" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, color: "var(--lcs-ink-muted)" }}>
                      Extracted values are proposed, not applied — you confirm or correct each one.
                    </p>
                  </div>
                )}
              </LcsCard>
              <LcsCard title="Profile completeness">
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <LcsStatusPill status={completeness.percent >= COMPANY_PUBLISH_THRESHOLD ? "satisfied" : "pending"} label={`${completeness.percent}%`} />
                    <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>
                      {completeness.percent >= COMPANY_PUBLISH_THRESHOLD ? "Ready to publish" : `Need ${COMPANY_PUBLISH_THRESHOLD}% to publish`}
                    </span>
                  </div>
                </div>
              </LcsCard>
            </div>
          </div>
        </>
      )}
    </ProfileShell>
  );
}
