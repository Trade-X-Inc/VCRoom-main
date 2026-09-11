import { useState } from "react";
import { LcsButton, LcsStatusPill, LcsTextField } from "@/components/lcs";
import type { LcsExtractedField, LcsSectorId, LcsCompanyStage, LcsSectionVisibility } from "@/lib/lcs-sandbox";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/lcs-sandbox";

// Shared per-field extraction review — extracted 2 Sep 2026 from
// deals-preview.vault.tsx's UploadExtractionModal once the Profile
// Builder needed the identical per-field confirm/correct mechanism for
// pitch-deck extraction. One implementation, two callers (Document
// Vault's document upload, Profile Builder's deck upload), not
// duplicated — same "one implementation, not two" discipline as
// checkpoint 3's RoleSwitcher extraction.
//
// THE GUARANTEE, unchanged from the original: handleConfirmField/
// handleSaveCorrection each take a single field id and update only that
// field's entry in `fields` state. No handler here iterates over every
// field and confirms them all — matches CLAUDE.md §10 verbatim
// ("Proposes a value with citation to page and location. Human
// confirms; the confirmation is the warranty").

export function ExtractionReview({
  fields,
  setFields,
  onFieldResolved,
  documentName,
}: {
  fields: LcsExtractedField[];
  setFields: (updater: (prev: LcsExtractedField[]) => LcsExtractedField[]) => void;
  /** Called once a field's value is confirmed/corrected, so the caller can
   * apply it to its own form state (Profile Builder) — optional, since
   * Document Vault's caller doesn't need per-field application, only the
   * final resolved set. */
  onFieldResolved?: (label: string, value: string) => void;
  documentName: string;
}) {
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState("");

  const handleConfirmField = (field: LcsExtractedField) => {
    setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, status: "confirmed", confirmedValue: f.proposedValue } : f)));
    onFieldResolved?.(field.label, field.proposedValue);
  };

  const handleStartCorrect = (fieldId: string, currentValue: string) => {
    setCorrectingId(fieldId);
    setCorrectionDraft(currentValue);
  };

  const handleSaveCorrection = (field: LcsExtractedField) => {
    setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, status: "corrected", confirmedValue: correctionDraft } : f)));
    onFieldResolved?.(field.label, correctionDraft);
    setCorrectingId(null);
    setCorrectionDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>
        {documentName} — review each proposed value below. Only confirmed values are applied.
      </p>
      {fields.map((field) => (
        <div key={field.id} className="border p-3 flex flex-col gap-2" style={{ borderColor: "var(--lcs-line)" }}>
          <div className="flex items-center justify-between gap-3">
            <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, fontWeight: 500, color: "var(--lcs-ink)" }}>
              {field.label}
            </span>
            <LcsStatusPill
              status={field.status === "proposed" ? "pending" : "satisfied"}
              label={field.status === "proposed" ? "Proposed" : field.status === "confirmed" ? "Confirmed" : "Corrected"}
            />
          </div>
          {correctingId === field.id ? (
            <div className="flex flex-col gap-2">
              <LcsTextField label="Corrected value" value={correctionDraft} onChange={(e) => setCorrectionDraft(e.target.value)} />
              <div className="flex items-center gap-2">
                <LcsButton variant="secondary" onClick={() => handleSaveCorrection(field)}>
                  Save correction
                </LcsButton>
                <LcsButton variant="text-link" onClick={() => setCorrectingId(null)}>
                  Cancel
                </LcsButton>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: "var(--font-lcs-data)", fontSize: 13, color: "var(--lcs-ink)" }}>
                {field.confirmedValue ?? field.proposedValue}
              </p>
              <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, color: "var(--lcs-ink-muted)" }}>
                {field.citation.documentName}, page {field.citation.page} — {field.citation.location}
              </p>
              {field.status === "proposed" && (
                <div className="flex items-center gap-2">
                  <LcsButton variant="secondary" onClick={() => handleConfirmField(field)}>
                    Confirm
                  </LcsButton>
                  <LcsButton variant="text-link" onClick={() => handleStartCorrect(field.id, field.proposedValue)}>
                    Correct
                  </LcsButton>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/** Shared founder-profile form state shape, real fields per app.profile.tsx
 * (see lcs-sandbox.ts's LcsSandboxCompany header comment for the full
 * source citation). Split out here so every profile-builder step route
 * (quick setup, full profile) shares one form-state type rather than
 * each declaring its own subset. */
export type ProfileFormState = {
  founderName: string;
  name: string;
  legalEntityName: string;
  registrationNumber: string;
  tagline: string;
  website: string;
  foundedYear: string;
  country: string;
  teamSize: string;
  sector: LcsSectorId;
  stage: LcsCompanyStage;
  description: string;
  fundingTarget: string;
  valuation: string;
  previousFunding: string;
  currentInvestors: string;
  useOfFunds: string;
  revenue: string;
  growthRate: string;
  customerCount: string;
  keyMetric: string;
  traction: string;
  problem: string;
  solution: string;
  businessModel: string;
  marketSize: string;
  whyUs: string;
  whyNow: string;
  tam: string;
  sam: string;
  targetCustomer: string;
  revenueModel: string;
  pricing: string;
  unitEconomics: string;
  burnRate: string;
  runwayMonths: string;
  moat: string;
  competitors: string;
  milestones: string;
  advisors: string;
  introVideoUrl: string;
  productVideoUrl: string;
  socialLinks: { platform: string; url: string }[];
  founderEmail: string;
  founderLinkedin: string;
  cofounderName: string;
  cofounderLinkedin: string;
  sectionVisibility: Record<string, LcsSectionVisibility>;
};

export const PROFILE_EMPTY_FORM: ProfileFormState = {
  founderName: "R. Mehta",
  name: "",
  legalEntityName: "",
  registrationNumber: "",
  tagline: "",
  website: "",
  foundedYear: "",
  country: "",
  teamSize: "",
  sector: "technology",
  stage: "Pre-seed",
  description: "",
  fundingTarget: "",
  valuation: "",
  previousFunding: "",
  currentInvestors: "",
  useOfFunds: "",
  revenue: "",
  growthRate: "",
  customerCount: "",
  keyMetric: "",
  traction: "",
  problem: "",
  solution: "",
  businessModel: "",
  marketSize: "",
  whyUs: "",
  whyNow: "",
  tam: "",
  sam: "",
  targetCustomer: "",
  revenueModel: "",
  pricing: "",
  unitEconomics: "",
  burnRate: "",
  runwayMonths: "",
  moat: "",
  competitors: "",
  milestones: "",
  advisors: "",
  introVideoUrl: "",
  productVideoUrl: "",
  socialLinks: [],
  founderEmail: "",
  founderLinkedin: "",
  cofounderName: "",
  cofounderLinkedin: "",
  sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
};
