import { createFileRoute } from "@tanstack/react-router";
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
  LcsTextareaField,
} from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import {
  getSandboxCompany,
  saveSandboxCompany,
  publishSandboxCompany,
  isSectorActive,
  SECTORS,
  SECTOR_LABEL,
  COMPANY_STAGES,
  WAITING_LIST_COPY,
  type LcsSandboxCompany,
  type LcsSectorId,
  type LcsCompanyStage,
  type LcsViewerRole,
} from "@/lib/lcs-sandbox";

// Profile Builder (2 Sep 2026) — founder-only, next piece of the four-part
// Pack Builder scope after Document Vault (previous checkpoint). Fields
// extracted from the REAL product's app.profile-builder.tsx FIELD_LABELS
// constant, read directly rather than guessed at: company_name, tagline,
// sector, stage, problem, solution, team, funding_target are all real
// field names from the real founder-facing form. Not every real field is
// carried in — only the ones load-bearing for this sandbox's other
// screens — but every field that IS here is real, not invented. 2-step
// flow, matching the real product's own "Step 1 of 2"/"Step 2 of 2"
// structure.
//
// Sector is a SELECT constrained to LcsSectorId (checkpoint 5's closed
// set), not free text like the real product's current field — a
// deliberate divergence to stay consistent with this sandbox's own
// sector-config work, not an oversight. A founder may pick ANY of the 5
// sectors including the 3 still coming-soon ones, confirmed directly:
// this is a legitimate pre-registration/waiting-list state ("this is
// more a marketing technique than an infrastructure"), not a blocked or
// broken one — see WAITING_LIST_COPY's honest framing below, distinct in
// tone from a generic "not active" error.
//
// One company per sandbox session (single hardcoded founder identity,
// per checkpoint 3) — getSandboxCompany()/saveSandboxCompany() manage one
// record, not a list. "Publish" is a distinct, explicit action from
// "save" — a founder can build/edit a draft without it being live, same
// distinction the real product's own `published`/`publishedAt` fields
// already carry.
//
// Deferred, not built in this checkpoint (reported before building,
// approved): connections/matching page (creates a deal room on
// approval — its own real logic, own verification pass), profile
// analytics, and the founder Document Pack Builder becoming its own
// stage-gated screen (the extraction mechanism it needs already exists,
// built into Document Vault's "Add document" flow).

const VIEWER_ROLE_KEY = "lcs-viewer-role";

export const Route = createFileRoute("/deals-preview/profile")({
  component: ProfileBuilder,
});

type FormState = {
  founderName: string;
  name: string;
  tagline: string;
  sector: LcsSectorId;
  stage: LcsCompanyStage;
  problem: string;
  solution: string;
  team: string;
  fundingTarget: string;
};

const EMPTY_FORM: FormState = {
  founderName: "R. Mehta",
  name: "",
  tagline: "",
  sector: "technology",
  stage: "Pre-seed",
  problem: "",
  solution: "",
  team: "",
  fundingTarget: "",
};

function ProfileBuilder() {
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);
  const [company, setCompany] = useState<LcsSandboxCompany | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

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

  useEffect(() => {
    setCompany(getSandboxCompany());
  }, []);

  const startEditing = (existing: LcsSandboxCompany | null) => {
    setForm(
      existing
        ? {
            founderName: existing.founderName,
            name: existing.name,
            tagline: existing.tagline,
            sector: existing.sector,
            stage: existing.stage,
            problem: existing.problem,
            solution: existing.solution,
            team: existing.team,
            fundingTarget: existing.fundingTarget,
          }
        : EMPTY_FORM
    );
    setStep(1);
    setEditing(true);
  };

  const handleSaveDraft = () => {
    const saved = saveSandboxCompany(form);
    setCompany(saved);
    setEditing(false);
  };

  const handlePublish = () => {
    saveSandboxCompany(form);
    const published = publishSandboxCompany();
    setCompany(published);
    setEditing(false);
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
          {isFounder && (
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

      {role === undefined || company === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          Profile building is only available in Founder view. Switch roles above to view it.
        </p>
      ) : editing ? (
        <ProfileForm
          form={form}
          setForm={setForm}
          step={step}
          setStep={setStep}
          onCancel={() => setEditing(false)}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
        />
      ) : company === null ? (
        <LcsCard title="No profile yet">
          <div className="p-4 flex flex-col gap-3">
            <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>
              Build your company profile to start receiving investor connection requests.
            </p>
            <div>
              <LcsButton variant="primary" onClick={() => startEditing(null)}>
                Build profile
              </LcsButton>
            </div>
          </div>
        </LcsCard>
      ) : (
        <ProfileView company={company} onEdit={() => startEditing(company)} onPublish={handlePublish} />
      )}
    </LcsPageShell>
  );
}

function ProfileForm({
  form,
  setForm,
  step,
  setStep,
  onCancel,
  onSaveDraft,
  onPublish,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  step: 1 | 2;
  setStep: (s: 1 | 2) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const sectorActive = isSectorActive(form.sector);

  return (
    <LcsCard title={`Build profile — Step ${step} of 2`}>
      <div className="p-4 flex flex-col gap-3">
        {step === 1 ? (
          <>
            <LcsTextField
              label="Company name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <LcsTextField
              label="Tagline"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
            <LcsSelectField
              label="Sector"
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value as LcsSectorId })}
              helper={!sectorActive ? WAITING_LIST_COPY : undefined}
            >
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.status === "coming-soon" ? " (coming soon)" : ""}
                </option>
              ))}
            </LcsSelectField>
            <LcsSelectField
              label="Stage"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as LcsCompanyStage })}
            >
              {COMPANY_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </LcsSelectField>
            <LcsTextField
              label="Funding target"
              placeholder="$1,000,000"
              value={form.fundingTarget}
              onChange={(e) => setForm({ ...form, fundingTarget: e.target.value })}
            />
          </>
        ) : (
          <>
            <LcsTextareaField
              label="Problem"
              value={form.problem}
              onChange={(e) => setForm({ ...form, problem: e.target.value })}
            />
            <LcsTextareaField
              label="Solution"
              value={form.solution}
              onChange={(e) => setForm({ ...form, solution: e.target.value })}
            />
            <LcsTextareaField
              label="Team"
              value={form.team}
              onChange={(e) => setForm({ ...form, team: e.target.value })}
            />
          </>
        )}
        <div className="flex items-center gap-2 pt-2">
          {step === 2 && (
            <LcsButton variant="secondary" onClick={() => setStep(1)}>
              Back
            </LcsButton>
          )}
          <LcsButton variant="text-link" onClick={onCancel}>
            Cancel
          </LcsButton>
          <div className="flex-1" />
          <LcsButton variant="secondary" onClick={onSaveDraft}>
            Save draft
          </LcsButton>
          {step === 1 ? (
            <LcsButton variant="primary" onClick={() => setStep(2)}>
              Next
            </LcsButton>
          ) : (
            <LcsButton variant="primary" onClick={onPublish}>
              Publish
            </LcsButton>
          )}
        </div>
      </div>
    </LcsCard>
  );
}

function ProfileView({
  company,
  onEdit,
  onPublish,
}: {
  company: LcsSandboxCompany;
  onEdit: () => void;
  onPublish: () => void;
}) {
  const sectorActive = isSectorActive(company.sector);
  return (
    <div className="flex flex-col gap-4">
      <LcsCard
        title={company.name || "Untitled company"}
        viewAllHref={undefined}
      >
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <LcsStatusPill status={company.published ? "satisfied" : "pending"} label={company.published ? "Published" : "Draft"} />
            <LcsStatusPill status={sectorActive ? "satisfied" : "attention"} label={sectorActive ? SECTOR_LABEL[company.sector] : `${SECTOR_LABEL[company.sector]} — waiting list`} />
            <span style={{ fontFamily: "var(--font-lcs-data)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>
              {company.stage}
            </span>
          </div>
          {!sectorActive && (
            <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>
              {WAITING_LIST_COPY}
            </p>
          )}
          <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink)" }}>{company.tagline}</p>
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)" }}>PROBLEM</span>
            <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink)" }}>{company.problem || "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)" }}>SOLUTION</span>
            <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink)" }}>{company.solution || "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)" }}>TEAM</span>
            <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink)" }}>{company.team || "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)" }}>FUNDING TARGET</span>
            <p style={{ fontFamily: "var(--font-lcs-data)", fontSize: 13, color: "var(--lcs-ink)" }}>{company.fundingTarget || "—"}</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <LcsButton variant="secondary" onClick={onEdit}>
              Edit
            </LcsButton>
            {!company.published && (
              <LcsButton variant="primary" onClick={onPublish}>
                Publish
              </LcsButton>
            )}
          </div>
        </div>
      </LcsCard>
    </div>
  );
}
