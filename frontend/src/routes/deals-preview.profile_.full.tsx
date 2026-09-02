import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LcsPageShell, LcsNavItem, LcsPageHeader, LcsCard, LcsButton, LcsTextField, LcsSelectField, LcsTextareaField, LcsTable, LcsTableHead, LcsTh, LcsTableBody, LcsTr, LcsTd, LcsEmptyState } from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { ProfileStepNav, useFounderRole, NonFounderNotice } from "@/routes/deals-preview.profile";
import { PROFILE_EMPTY_FORM, type ProfileFormState } from "@/components/deals-preview/ProfileForm";
import {
  getSandboxCompany,
  saveSandboxCompany,
  companyCompleteness,
  COMPANY_PUBLISH_THRESHOLD,
  getSandboxCapTable,
  saveSandboxCapTableRow,
  removeSandboxCapTableRow,
  CAP_TABLE_ROLES,
  COMPANY_STAGES,
  SECTOR_LABEL,
  type LcsSandboxCompany,
  type LcsCompanyStage,
  type LcsCapTableRow,
} from "@/lib/lcs-sandbox";

// Full Profile — real screen extraction (2 Sep 2026). Source:
// app.profile.tsx's ProfileView, `tab === "full"` branch — the 10
// FormSection groups in their real order (Company identity, Fundraising,
// Traction & metrics, [Cap table], Vision & strategy, Market &
// opportunity, Business model details, Cap & relationships, Media,
// Social links, Contact), plus the embedded CapTableSection. Every field
// label/placeholder below is copied verbatim from the real file, not
// reworded. Real fields not carried into this sandbox: legal_entity_name/
// registration_number ARE carried (they're in LcsSandboxCompany); avatar
// upload is NOT (no file storage in this sandbox — flagged, not silently
// dropped).
//
// Real publish gate: companyCompleteness() ports lib/profileCompleteness
// .ts's getFounderProfileCompleteness formula (required-field count,
// percent, >=80% threshold) — restated without "directory" framing per
// the confirmed exclusion (app.profile.tsx:1061's "not yet visible in
// the directory" warning is discovery-layer copy; the 80% gate itself is
// real product logic and is kept).
//
// Cap table: real CAP_TABLE_ROLES list, real validation (name required,
// 0 < ownership <= 100), real over-100%-total warning — ported from
// CapTableSection verbatim, reskinned onto LcsTable/LcsButton.

const VIEWER_ROLE_KEY = "lcs-viewer-role";

export const Route = createFileRoute("/deals-preview/profile_/full")({
  component: FullProfile,
});

function FullProfile() {
  const role = useFounderRole();
  const [company, setCompany] = useState<LcsSandboxCompany | null | undefined>(undefined);
  const [form, setForm] = useState<ProfileFormState>(PROFILE_EMPTY_FORM);
  const [capRows, setCapRows] = useState<LcsCapTableRow[]>([]);

  useEffect(() => {
    const existing = getSandboxCompany();
    setCompany(existing);
    if (existing) setForm({ ...PROFILE_EMPTY_FORM, ...existing });
    setCapRows(getSandboxCapTable());
  }, []);

  const handleSave = () => {
    const saved = saveSandboxCompany(form);
    setCompany(saved);
  };

  const set = <K extends keyof ProfileFormState>(key: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value } as ProfileFormState));

  const isFounder = role === "founder";
  const completeness = companyCompleteness(company ?? null);

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
      <LcsPageHeader
        title="Company profile"
        description="Your public profile — how investors find and evaluate your company."
        action={
          !isFounder ? undefined : (
            <LcsButton variant={completeness.percent >= COMPANY_PUBLISH_THRESHOLD ? "primary" : "secondary"} onClick={handleSave}>
              Save
            </LcsButton>
          )
        }
      />
      {role === undefined || company === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <NonFounderNotice />
      ) : (
        <>
          <ProfileStepNav active="/deals-preview/profile/full" />
          <div className="flex flex-col gap-4">
            <LcsCard title="Company identity">
              <div className="p-4 flex flex-col gap-3">
                <LcsTextField label="Company name" value={form.name} onChange={set("name")} placeholder="Atlas Robotics" />
                <LcsTextField label="Legal entity name" value={form.legalEntityName} onChange={set("legalEntityName")} placeholder="Full registered legal name (if different from trading name)" />
                <LcsTextField label="Company registration number" value={form.registrationNumber} onChange={set("registrationNumber")} placeholder="e.g. 0001234 (Companies House), CL1234 (DIFC)" helper="Optional but improves registry verification accuracy" />
                <LcsTextField label="Tagline" value={form.tagline} onChange={set("tagline")} placeholder="One line that explains your company" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <LcsTextField label="Website" value={form.website} onChange={set("website")} placeholder="https://example.com" />
                  <LcsTextField label="Founded year" value={form.foundedYear} onChange={set("foundedYear")} placeholder="2022" />
                  <LcsTextField label="Country / HQ" value={form.country} onChange={set("country")} placeholder="San Francisco, USA" />
                  <LcsTextField label="Team size" value={form.teamSize} onChange={set("teamSize")} placeholder="e.g. 12" />
                  <LcsTextField label="Sector" value={SECTOR_LABEL[form.sector]} disabled helper="Change on Quick setup" onChange={() => {}} />
                  <LcsSelectField label="Stage" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as LcsCompanyStage }))}>
                    {COMPANY_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </LcsSelectField>
                </div>
                <LcsTextareaField label="Description" value={form.description} onChange={set("description")} placeholder="What does your company do?" rows={3} />
              </div>
            </LcsCard>

            <LcsCard title="Fundraising">
              <div className="p-4 flex flex-col gap-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <LcsTextField label="Funding target" value={form.fundingTarget} onChange={set("fundingTarget")} placeholder="e.g. 2,000,000" />
                  <LcsTextField label="Pre-money valuation" value={form.valuation} onChange={set("valuation")} placeholder="e.g. 20,000,000" />
                  <LcsTextField label="Previous funding raised" value={form.previousFunding} onChange={set("previousFunding")} placeholder="$500K pre-seed" />
                  <LcsTextField label="Current investors" value={form.currentInvestors} onChange={set("currentInvestors")} placeholder="Y Combinator, Sequoia" />
                </div>
                <LcsTextareaField label="Use of funds" value={form.useOfFunds} onChange={set("useOfFunds")} placeholder="40% engineering, 30% sales, 30% ops" rows={2} />
              </div>
            </LcsCard>

            <LcsCard title="Traction & metrics">
              <div className="p-4 flex flex-col gap-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <LcsTextField label="Revenue / ARR" value={form.revenue} onChange={set("revenue")} placeholder="e.g. 500,000" />
                  <LcsTextField label="Growth rate" value={form.growthRate} onChange={set("growthRate")} placeholder="+15% MoM" />
                  <LcsTextField label="Customer count" value={form.customerCount} onChange={set("customerCount")} placeholder="500 paying customers" />
                  <LcsTextField label="Key metric" value={form.keyMetric} onChange={set("keyMetric")} placeholder="Your most important metric" />
                </div>
                <LcsTextareaField label="Traction highlights" value={form.traction} onChange={set("traction")} placeholder="Key traction highlights..." rows={3} />
              </div>
            </LcsCard>

            <CapTableCard rows={capRows} onChange={setCapRows} />

            <LcsCard title="Vision & strategy">
              <div className="p-4 flex flex-col gap-3">
                <LcsTextareaField label="Problem" value={form.problem} onChange={set("problem")} placeholder="What problem are you solving?" rows={4} />
                <LcsTextareaField label="Solution" value={form.solution} onChange={set("solution")} placeholder="How does your product solve it?" rows={4} />
                <LcsTextareaField label="Business model" value={form.businessModel} onChange={set("businessModel")} placeholder="How do you make money?" rows={3} />
                <LcsTextField label="Market size" value={form.marketSize} onChange={set("marketSize")} placeholder="$50B TAM, $5B SAM…" />
                <LcsTextareaField label="Why us" value={form.whyUs} onChange={set("whyUs")} placeholder="Why is your team uniquely positioned?" rows={3} />
                <LcsTextareaField label="Why now?" value={form.whyNow} onChange={set("whyNow")} placeholder="What tailwind or market shift makes this the right time?" rows={2} />
              </div>
            </LcsCard>

            <LcsCard title="Market & opportunity">
              <div className="p-4 grid sm:grid-cols-2 gap-3">
                <LcsTextField label="TAM" value={form.tam} onChange={set("tam")} placeholder="Total addressable market" />
                <LcsTextField label="SAM" value={form.sam} onChange={set("sam")} placeholder="Serviceable addressable market" />
                <LcsTextField label="Target customer" value={form.targetCustomer} onChange={set("targetCustomer")} placeholder="Who will buy from you?" />
              </div>
            </LcsCard>

            <LcsCard title="Business model details">
              <div className="p-4 flex flex-col gap-3">
                <LcsTextareaField label="Revenue model" value={form.revenueModel} onChange={set("revenueModel")} placeholder="How do you generate revenue?" rows={3} />
                <LcsTextField label="Pricing" value={form.pricing} onChange={set("pricing")} placeholder="Pricing model or range" />
                <LcsTextareaField label="Unit economics" value={form.unitEconomics} onChange={set("unitEconomics")} placeholder="CAC, LTV or contribution margin" rows={3} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <LcsTextField label="Burn rate" value={form.burnRate} onChange={set("burnRate")} placeholder="$ / month" />
                  <LcsTextField label="Runway (months)" value={form.runwayMonths} onChange={set("runwayMonths")} placeholder="e.g. 12" />
                </div>
              </div>
            </LcsCard>

            <LcsCard title="Cap & relationships">
              <div className="p-4 flex flex-col gap-3">
                <LcsTextareaField label="Moat" value={form.moat} onChange={set("moat")} placeholder="What protects your business?" rows={3} />
                <LcsTextareaField label="Competitors" value={form.competitors} onChange={set("competitors")} placeholder="Key competitors and alternatives" rows={3} />
                <LcsTextareaField label="Milestones" value={form.milestones} onChange={set("milestones")} placeholder="Key traction, launches, and milestones" rows={3} />
                <LcsTextareaField label="Advisors" value={form.advisors} onChange={set("advisors")} placeholder="Notable advisors" rows={2} />
              </div>
            </LcsCard>

            <LcsCard title="Media">
              <div className="p-4 flex flex-col gap-3">
                <LcsTextField label="Intro video URL" value={form.introVideoUrl} onChange={set("introVideoUrl")} placeholder="YouTube or Loom link" />
                <LcsTextField label="Product video URL" value={form.productVideoUrl} onChange={set("productVideoUrl")} placeholder="Optional product walkthrough link" />
              </div>
            </LcsCard>

            <SocialLinksCard form={form} setForm={setForm} />

            <LcsCard title="Contact">
              <div className="p-4 flex flex-col gap-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <LcsTextField label="Founder name" value={form.founderName} onChange={set("founderName")} placeholder="Jane Smith" />
                  <LcsTextField label="Founder email" value={form.founderEmail} onChange={set("founderEmail")} placeholder="jane@startup.com" />
                  <LcsTextField label="Founder LinkedIn" value={form.founderLinkedin} onChange={set("founderLinkedin")} placeholder="linkedin.com/in/janesmith" />
                  <LcsTextField label="Co-founder name" value={form.cofounderName} onChange={set("cofounderName")} placeholder="Alex Lee" />
                  <LcsTextField label="Co-founder LinkedIn" value={form.cofounderLinkedin} onChange={set("cofounderLinkedin")} placeholder="linkedin.com/in/alexlee" />
                </div>
              </div>
            </LcsCard>

            <div>
              <LcsButton variant="primary" onClick={handleSave}>
                Save
              </LcsButton>
            </div>
          </div>
        </>
      )}
    </LcsPageShell>
  );
}

function SocialLinksCard({ form, setForm }: { form: ProfileFormState; setForm: (updater: (f: ProfileFormState) => ProfileFormState) => void }) {
  return (
    <LcsCard title="Social links">
      <div className="p-4 flex flex-col gap-2">
        {form.socialLinks.map((link, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={link.platform}
              onChange={(e) => setForm((f) => ({ ...f, socialLinks: f.socialLinks.map((l, j) => (j === i ? { ...l, platform: e.target.value } : l)) }))}
              placeholder="Platform name"
              className="w-32 shrink-0 h-8 px-3 text-[13px] outline-none"
              style={{ border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
            />
            <input
              value={link.url}
              onChange={(e) => setForm((f) => ({ ...f, socialLinks: f.socialLinks.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)) }))}
              placeholder="https://..."
              className="flex-1 h-8 px-3 text-[13px] outline-none"
              style={{ border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
            />
            <LcsButton variant="text-link" onClick={() => setForm((f) => ({ ...f, socialLinks: f.socialLinks.filter((_, j) => j !== i) }))}>
              Remove
            </LcsButton>
          </div>
        ))}
        <div>
          <LcsButton variant="secondary" onClick={() => setForm((f) => ({ ...f, socialLinks: [...f.socialLinks, { platform: "", url: "" }] }))}>
            Add link
          </LcsButton>
        </div>
      </div>
    </LcsCard>
  );
}

/** Real cap-table sub-section, ported from app.profile.tsx's
 * CapTableSection: shareholder_name, shareholder_role (CAP_TABLE_ROLES),
 * ownership_percent, linkedin_url. Real validation: name required,
 * 0 < ownership <= 100; a total over 100% across all rows is flagged,
 * not blocked (matches the real file's `overLimit` warning, which is
 * advisory, not a hard stop). */
function CapTableCard({ rows, onChange }: { rows: LcsCapTableRow[]; onChange: (rows: LcsCapTableRow[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ shareholderName: "", shareholderRole: "Founder", ownershipPercent: "", linkedinUrl: "" });

  const totalOwnership = rows.reduce((s, r) => s + r.ownershipPercent, 0);
  const overLimit = totalOwnership > 100;

  const startAdd = () => {
    setDraft({ shareholderName: "", shareholderRole: "Founder", ownershipPercent: "", linkedinUrl: "" });
    setEditId(null);
    setShowForm(true);
  };

  const startEdit = (row: LcsCapTableRow) => {
    setDraft({ shareholderName: row.shareholderName, shareholderRole: row.shareholderRole, ownershipPercent: String(row.ownershipPercent), linkedinUrl: row.linkedinUrl });
    setEditId(row.id);
    setShowForm(true);
  };

  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!draft.shareholderName.trim()) {
      setError("Shareholder name is required.");
      return;
    }
    const pct = parseFloat(draft.ownershipPercent);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setError("Enter a valid ownership percentage (0-100).");
      return;
    }
    setError(null);
    const next = saveSandboxCapTableRow(
      { shareholderName: draft.shareholderName.trim(), shareholderRole: draft.shareholderRole, ownershipPercent: pct, linkedinUrl: draft.linkedinUrl.trim() },
      editId ?? undefined
    );
    onChange(next);
    setShowForm(false);
    setEditId(null);
  };

  const handleRemove = (id: string) => {
    onChange(removeSandboxCapTableRow(id));
  };

  return (
    <LcsCard title="Cap table" count={rows.length}>
      {rows.length === 0 && !showForm ? (
        <LcsEmptyState text="No shareholders added yet." />
      ) : rows.length > 0 ? (
        <LcsTable>
          <LcsTableHead>
            <LcsTh sticky>Shareholder</LcsTh>
            <LcsTh>Role</LcsTh>
            <LcsTh numeric>Ownership</LcsTh>
            <LcsTh>Actions</LcsTh>
          </LcsTableHead>
          <LcsTableBody>
            {rows.map((r) => (
              <LcsTr key={r.id}>
                <LcsTd sticky>{r.shareholderName}</LcsTd>
                <LcsTd>{r.shareholderRole}</LcsTd>
                <LcsTd numeric>{r.ownershipPercent}%</LcsTd>
                <LcsTd>
                  <div className="flex items-center gap-2">
                    <LcsButton variant="text-link" onClick={() => startEdit(r)}>
                      Edit
                    </LcsButton>
                    <LcsButton variant="text-link" onClick={() => handleRemove(r.id)}>
                      Remove
                    </LcsButton>
                  </div>
                </LcsTd>
              </LcsTr>
            ))}
          </LcsTableBody>
        </LcsTable>
      ) : null}
      {overLimit && (
        <div className="px-3 py-2" style={{ borderTop: "1px solid var(--lcs-line)" }}>
          <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-attention)" }}>
            Total ownership across all shareholders exceeds 100% ({totalOwnership}%).
          </p>
        </div>
      )}
      {showForm ? (
        <div className="px-3 py-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--lcs-line)" }}>
          <div className="grid sm:grid-cols-2 gap-2">
            <LcsTextField label="Shareholder name" value={draft.shareholderName} onChange={(e) => setDraft((d) => ({ ...d, shareholderName: e.target.value }))} />
            <LcsSelectField label="Role" value={draft.shareholderRole} onChange={(e) => setDraft((d) => ({ ...d, shareholderRole: e.target.value }))}>
              {CAP_TABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </LcsSelectField>
            <LcsTextField label="Ownership %" value={draft.ownershipPercent} onChange={(e) => setDraft((d) => ({ ...d, ownershipPercent: e.target.value }))} />
            <LcsTextField label="LinkedIn URL" value={draft.linkedinUrl} onChange={(e) => setDraft((d) => ({ ...d, linkedinUrl: e.target.value }))} />
          </div>
          {error && (
            <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-attention)" }}>{error}</p>
          )}
          <div className="flex items-center gap-2">
            <LcsButton variant="primary" onClick={handleSave}>
              Save shareholder
            </LcsButton>
            <LcsButton variant="text-link" onClick={() => { setShowForm(false); setEditId(null); setError(null); }}>
              Cancel
            </LcsButton>
          </div>
        </div>
      ) : (
        <div className="px-3 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
          <LcsButton variant="secondary" onClick={startAdd}>
            Add shareholder
          </LcsButton>
        </div>
      )}
    </LcsCard>
  );
}
