import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
  LcsButton,
  LcsEmptyState,
  LcsModal,
  LcsTextField,
  LcsTextareaField,
} from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import {
  DOC_TEMPLATES,
  DOC_TEMPLATE_FIELDS,
  DOC_CATEGORY_LABELS,
  DOC_CATEGORY_SORT_ORDER,
  getFounderDocuments,
  saveFounderDocument,
  toggleDocDealRoomVisibility,
  computeDocCompleteness,
  getSandboxCompany,
  type LcsDocTemplate,
  type LcsDocCategory,
  type LcsFounderDocument,
  type LcsViewerRole,
} from "@/lib/lcs-sandbox";

// Document Vault — real screen extraction (3 Sep 2026), replacing the
// generic upload-vault concept built in an earlier checkpoint entirely
// (not kept alongside — confirmed no other screen depended on its
// specific shape: LcsSandboxVault/LcsVaultDocument/etc. are defined in
// lib/lcs-sandbox.ts and used nowhere outside the old version of this
// file; the URL /deals-preview/vault and the "Documents" nav entry are
// unchanged, so every other screen's nav link keeps resolving).
//
// Source: app.documents.tsx's "document-intake" view (lines 788-1072) +
// DocumentEditorModal (lines 1518-1787) + the real document_templates
// table (17 rows, live-queried). Real structure kept: category rail
// (5 real categories, real sort order), per-template checklist cards
// (status icon/label, Required/Optional badge, progress bar, Start/
// Continue/Review/Edit action verb by status), the per-field editor with
// the real 4 field types (text/textarea/number/percentage), the real
// required-field asterisk (visual only — not blocking, matching the real
// screen exactly), live completeness %, and the deal-room visibility
// toggle per document.
//
// EXCLUDED as discovery-layer/scoring residue: the AIFeedback concept in
// full (overall_score 1-10, signal, investor_flag, recommendations) and
// its "AI Review" button — CLAUDE.md §15/§25 prohibits scoring/ranking/
// assessment, and §19b already found this exact review-document prompt
// flagged as a live, unresolved violation. Also excluded: file upload +
// AI extraction (a distinct real flow, already built as the shared
// ExtractionReview mechanism in Profile Builder's deck-upload — this
// screen is the fill-the-template path, not the upload-and-extract path,
// and porting both here would duplicate rather than extract). Also
// excluded: Source Files and Document Privacy Settings (two of the real
// file's four views) — flagged as a real scope note, not silently
// dropped. Confirmed by reading the real privacy-settings view (lines
// 1321-1379) before excluding it, not assumed: it is NOT the founder-
// profile section-visibility control (a separate real system gating
// public-profile sections like "team"/"financials") — it's a second
// surface for the exact same founder_documents.visibility toggle this
// screen already has live on every checklist card (all four real
// visibility writers in app.documents.tsx, lines 997/1114/1231/1354,
// write the identical column/value pair). Privacy Settings' own two
// sections are just that toggle re-listed for Source Files and the
// digital-document-vault detail view — both out of scope here, so there
// is no separate mechanism left to build; the toggle itself is already
// ported and verified working. Source Files is a raw-upload list with no
// template structure of its own, out of scope for the structured-
// template rebuild this checkpoint is about.

const VIEWER_ROLE_KEY = "lcs-viewer-role";
const CATEGORY_ORDER: LcsDocCategory[] = ["market", "financials", "team", "product", "legal"];

export const Route = createFileRoute("/deals-preview/vault")({
  component: DocumentVault,
});

function statusVerb(status: LcsFounderDocument["status"] | undefined): string {
  if (!status || status === "empty") return "Start";
  if (status === "draft") return "Continue";
  return "Edit";
}

function DocumentVault() {
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);
  const [docs, setDocs] = useState<Record<string, LcsFounderDocument> | null>(null);
  const [hasCompany, setHasCompany] = useState<boolean | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<LcsDocCategory | "All">("All");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});

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
    setDocs(getFounderDocuments());
    setHasCompany(!!getSandboxCompany());
  }, []);

  const templates = useMemo(
    () =>
      [...DOC_TEMPLATES]
        .filter((t) => selectedCategory === "All" || t.category === selectedCategory)
        .sort((a, b) => a.sort_order - b.sort_order),
    [selectedCategory]
  );

  const openEditor = (template: LcsDocTemplate) => {
    const existing = docs?.[template.slug];
    setEditContent(existing?.content ?? {});
    setEditingSlug(template.slug);
  };

  const handleSave = () => {
    if (!editingSlug) return;
    const saved = saveFounderDocument(editingSlug, editContent);
    setDocs((prev) => ({ ...(prev ?? {}), [editingSlug]: saved }));
    setEditingSlug(null);
  };

  const handleToggleDealRoom = (slug: string) => {
    const updated = toggleDocDealRoomVisibility(slug);
    if (updated) setDocs((prev) => ({ ...(prev ?? {}), [slug]: updated }));
  };

  const isFounder = role === "founder";
  const editingTemplate = editingSlug ? DOC_TEMPLATES.find((t) => t.slug === editingSlug) : undefined;
  const editingFields = editingSlug ? (DOC_TEMPLATE_FIELDS[editingSlug] ?? []) : [];
  const liveCompleteness = editingSlug ? computeDocCompleteness(editingSlug, editContent) : { score: 0, status: "empty" as const };

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
            <>
            <LcsNavItem to="/deals-preview/profile" label="Profile" collapsed={collapsed} icon="C" />
            <LcsNavItem to="/deals-preview/analytics" label="Analytics" collapsed={collapsed} icon="A" />
            </>
          )}
          <LcsNavItem to="/deals-preview" label="Investors" collapsed={collapsed} icon="I" />
          <LcsNavItem to="/deals-preview/vault" label="Documents" active collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          {role === "advisor" && (
            <LcsNavItem to="/deals-preview/team" label="Team" collapsed={collapsed} icon="P" />
          )}
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader title="Document workspace" description="Fill each document using the structured template, or track what's ready for a deal room." />

      {role === undefined || docs === null || hasCompany === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          The document workspace is only available in Founder view. Switch roles above to view it.
        </p>
      ) : !hasCompany ? (
        <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--lcs-line)" }}>
          <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>Build your profile first to start filling documents.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Category rail — real 5 categories, real sort order */}
          <div className="w-full sm:col-span-3">
            <div className="flex sm:flex-col gap-2 sm:gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
              {(["All", ...CATEGORY_ORDER] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="shrink-0 whitespace-nowrap text-left px-3 py-2 text-[13px] font-medium transition-colors"
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    color: selectedCategory === cat ? "var(--lcs-white)" : "var(--lcs-ink-muted)",
                    background: selectedCategory === cat ? "var(--lcs-accent)" : "transparent",
                  }}
                >
                  {cat === "All" ? "All" : DOC_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Template checklist */}
          <div className="w-full sm:col-span-9">
            {templates.length === 0 ? (
              <LcsEmptyState text="No templates in this category." />
            ) : (
              <div className="flex flex-col gap-3">
                {templates.map((template, i) => {
                  const showHeader = selectedCategory === "All" && (i === 0 || templates[i - 1].category !== template.category);
                  const doc = docs[template.slug];
                  const status = doc?.status ?? "empty";
                  return (
                    <div key={template.id}>
                      {showHeader && (
                        <div
                          className={i === 0 ? "mb-2" : "mt-5 mb-2"}
                          style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--lcs-ink-muted)" }}
                        >
                          {DOC_CATEGORY_LABELS[template.category]}
                        </div>
                      )}
                      <div className="border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: "var(--lcs-line)" }}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              aria-hidden="true"
                              className="inline-block size-1.5 rounded-full shrink-0"
                              style={{
                                background:
                                  status === "complete" ? "var(--lcs-satisfied)" : status === "draft" ? "var(--lcs-progress)" : "var(--lcs-pending)",
                              }}
                            />
                            <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, fontWeight: 500, color: "var(--lcs-ink)" }}>
                              {template.name}
                            </span>
                            <span
                              className="px-1.5 py-0.5"
                              style={{
                                fontFamily: "var(--font-lcs-ui)",
                                fontSize: 10,
                                fontWeight: 600,
                                color: template.is_required ? "var(--lcs-attention)" : "var(--lcs-ink-muted)",
                                background: template.is_required ? "var(--lcs-attention-wash)" : "var(--lcs-surface)",
                              }}
                            >
                              {template.is_required ? "Required" : "Optional"}
                            </span>
                          </div>
                          {doc && doc.completeness_score > 0 && status !== "complete" && (
                            <div className="mt-2 flex items-center gap-2 max-w-[220px]">
                              <div className="flex-1 h-1 overflow-hidden" style={{ background: "var(--lcs-surface)" }}>
                                <div className="h-full" style={{ width: `${doc.completeness_score}%`, background: "var(--lcs-progress)" }} />
                              </div>
                              <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 10, color: "var(--lcs-ink-muted)" }}>{doc.completeness_score}%</span>
                            </div>
                          )}
                          {doc && status === "complete" && (
                            <button
                              onClick={() => handleToggleDealRoom(template.slug)}
                              className="mt-2 px-2 py-0.5 text-[11px] transition-colors"
                              style={{
                                fontFamily: "var(--font-lcs-ui)",
                                color: doc.in_deal_room ? "var(--lcs-attention)" : "var(--lcs-ink-muted)",
                                background: doc.in_deal_room ? "var(--lcs-attention-wash)" : "var(--lcs-surface)",
                              }}
                              title={doc.in_deal_room ? "Visible in deal room — click to restrict" : "Not in deal room — click to include"}
                            >
                              {doc.in_deal_room ? "Deal room" : "+ Add to deal room"}
                            </button>
                          )}
                        </div>
                        <LcsButton variant="secondary" onClick={() => openEditor(template)}>
                          {statusVerb(status)}
                        </LcsButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {editingSlug && editingTemplate && (
        <LcsModal
          title={editingTemplate.name}
          variant="slide-over"
          onClose={() => setEditingSlug(null)}
          footer={
            <>
              <LcsButton variant="secondary" onClick={() => setEditingSlug(null)}>
                Cancel
              </LcsButton>
              <LcsButton variant="primary" onClick={handleSave}>
                Save
              </LcsButton>
            </>
          }
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1 overflow-hidden" style={{ background: "var(--lcs-surface)" }}>
              <div className="h-full" style={{ width: `${liveCompleteness.score}%`, background: "var(--lcs-progress)" }} />
            </div>
            <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, color: "var(--lcs-ink-muted)" }}>{liveCompleteness.score}% complete</span>
          </div>
          {editingFields.map((field) => {
            const label = field.required ? `${field.label} *` : field.label;
            const value = editContent[field.key] ?? "";
            const onChange = (v: string) => setEditContent((prev) => ({ ...prev, [field.key]: v }));
            if (field.type === "textarea") {
              return (
                <LcsTextareaField
                  key={field.key}
                  label={label}
                  placeholder={field.placeholder}
                  rows={4}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                />
              );
            }
            if (field.type === "number") {
              return (
                <LcsTextField
                  key={field.key}
                  label={label}
                  type="number"
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                />
              );
            }
            if (field.type === "percentage") {
              return (
                <LcsTextField
                  key={field.key}
                  label={label}
                  type="number"
                  min={0}
                  max={100}
                  helper="%"
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                />
              );
            }
            return (
              <LcsTextField
                key={field.key}
                label={label}
                type="text"
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            );
          })}
        </LcsModal>
      )}
    </LcsPageShell>
  );
}
