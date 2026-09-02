import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
  LcsCard,
  LcsTable,
  LcsTableHead,
  LcsTh,
  LcsTableBody,
  LcsTr,
  LcsTd,
  LcsStatusPill,
  LcsButton,
  LcsEmptyState,
  LcsModal,
  LcsTextField,
  LcsDropzone,
} from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { ExtractionReview } from "@/components/deals-preview/ProfileForm";
import {
  getSandboxVaults,
  createSandboxVault,
  renameSandboxVault,
  addDocumentToVault,
  removeDocumentFromVault,
  logDocumentView,
  requestDocumentRelease,
  respondToReleaseRequest,
  mockExtractFields,
  DOCUMENT_ACCESS_LABEL,
  type LcsSandboxVault,
  type LcsVaultDocument,
  type LcsDocumentAccess,
  type LcsExtractedField,
  type LcsViewerRole,
} from "@/lib/lcs-sandbox";

// Document Vault (2 Sep 2026) — built against the corrected architecture
// report from the Pack Builder scoping discussion. Three corrections,
// all grounded in CLAUDE.md's own already-established rules (§8.2's
// tool-class table, §10's AI-usage table, the real documentRender/
// documents.requestAccess/documents.grantRelease action names), not
// re-derived from inference — see lcs-sandbox.ts's own header comment on
// the vault data model for the full citation trail.
//
// 1. TWO-WAY ACCESS (view-only / release-on-request), UI-only, honestly
//    flagged as not enforced by this sandbox. Every view is logged
//    regardless of mode; release is modeled as a real two-step
//    request/grant interaction (documents.requestAccess ->
//    documents.grantRelease in spirit) rather than a single toggle,
//    because CLAUDE.md §8.2 names "release a document" as a Commit-class
//    action no agent may ever perform — the UI should read as a real
//    human decision, not a settings flip, even with no backend behind it.
//
// 2. PER-FIELD extraction confirm/correct — CLAUDE.md §10 verbatim:
//    "Proposes a value with citation to page and location. Human
//    confirms; the confirmation is the warranty." THE CONCRETE GUARANTEE
//    THIS FILE HOLDS: there is no "Confirm all" / batch-confirm control
//    anywhere in ExtractionReview below. Each field's Confirm/Correct
//    button operates on that field's id alone (see handleConfirmField/
//    handleCorrectField) — no action in this file sets more than one
//    field's status in a single call. Only fields with status
//    "confirmed"/"corrected" (i.e. confirmedValue is set) are added to
//    the vault; "proposed" fields are dropped, never silently included.
//
// 3. Universal cross-transaction document management (shared library,
//    versioning, unified cross-deal audit trail) is explicitly OUT OF
//    SCOPE — not built here, logged as a deferred future feature in
//    CLAUDE.md's own Amendment log as part of this same commit.
//
// Vaults are reusable across deals (not scoped to one transaction, per
// direct confirmation) — independent of the existing per-transaction
// Document Vault stage panel (deals-preview.$sector_.$instrument.$dealId
// .tsx's DocumentVaultPanel), which stays as-is: a display of whatever's
// actually shared into that specific room, a different concern from
// vault management itself, per explicit instruction not to merge them.
//
// Responsive: built against the addendum from the start — sticky first
// table column, LcsModal's existing full-viewport-below-sm behavior for
// both the create-vault and upload/extraction modals, no new breakpoint
// behavior invented.

const VIEWER_ROLE_KEY = "lcs-viewer-role";

export const Route = createFileRoute("/deals-preview/vault")({
  component: DocumentVault,
});

const ACCESS_TO_PILL: Record<LcsDocumentAccess, "satisfied" | "pending"> = {
  "view-only": "satisfied",
  "release-on-request": "pending",
};

function DocumentVault() {
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);
  const [vaults, setVaults] = useState<LcsSandboxVault[] | null>(null);
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  const refresh = () => {
    const all = getSandboxVaults();
    setVaults(all);
    setActiveVaultId((current) => current ?? all[0]?.id ?? null);
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeVault = vaults?.find((v) => v.id === activeVaultId) ?? null;

  const handleCreateVault = (name: string) => {
    createSandboxVault(role ?? "founder", name);
    refresh();
    setShowCreateModal(false);
  };

  const handleView = (doc: LcsVaultDocument) => {
    if (!activeVault) return;
    logDocumentView(activeVault.id, doc.id, {
      viewerRole: role ?? "founder",
      viewerName: role === "founder" ? "R. Mehta" : role === "investor" ? "S. Cole" : "Advisor",
      at: new Date().toISOString(),
    });
    refresh();
  };

  const handleRequestRelease = (doc: LcsVaultDocument) => {
    if (!activeVault) return;
    requestDocumentRelease(activeVault.id, doc.id, {
      role: role ?? "founder",
      name: role === "founder" ? "R. Mehta" : role === "investor" ? "S. Cole" : "Advisor",
    });
    refresh();
  };

  const handleRespond = (doc: LcsVaultDocument, requestId: string, decision: "granted" | "declined") => {
    if (!activeVault) return;
    respondToReleaseRequest(activeVault.id, doc.id, requestId, decision, {
      role: role ?? "founder",
      name: role === "founder" ? "R. Mehta" : role === "investor" ? "S. Cole" : "Advisor",
    });
    refresh();
  };

  const handleRemoveDoc = (doc: LcsVaultDocument) => {
    if (!activeVault) return;
    removeDocumentFromVault(activeVault.id, doc.id);
    refresh();
  };

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
            <LcsNavItem to="/deals-preview/profile" label="Profile" collapsed={collapsed} icon="C" />
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
      <LcsPageHeader
        title="Documents"
        description="Vaults you own, reusable across deals. Share into a deal room from here — documents are never shared outside a deal room."
        action={
          <LcsButton variant="secondary" onClick={() => setShowCreateModal(true)}>
            New vault
          </LcsButton>
        }
      />

      {role === undefined || vaults === null ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : vaults.length === 0 ? (
        <LcsEmptyState
          title="No vaults yet"
          text="Create a vault to start storing documents."
          action={<LcsButton variant="secondary" onClick={() => setShowCreateModal(true)}>New vault</LcsButton>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1 flex-wrap" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
            {vaults.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveVaultId(v.id)}
                className="h-9 px-3 text-[13px] flex items-center gap-1.5 -mb-px"
                style={{
                  fontFamily: "var(--font-lcs-ui)",
                  fontWeight: activeVaultId === v.id ? 500 : 400,
                  color: activeVaultId === v.id ? "var(--lcs-accent)" : "var(--lcs-ink)",
                  borderBottom: activeVaultId === v.id ? "2px solid var(--lcs-accent)" : "2px solid transparent",
                }}
              >
                {v.name}
                <span
                  className="text-[11px] px-1.5"
                  style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)", background: "var(--lcs-surface)", borderRadius: "var(--radius-lcs-control)" }}
                >
                  {v.documents.length}
                </span>
              </button>
            ))}
          </div>

          {activeVault && (
            <LcsCard title={activeVault.name} count={activeVault.documents.length}>
              {activeVault.documents.length === 0 ? (
                <LcsEmptyState text="No documents in this vault yet." />
              ) : (
                <LcsTable>
                  <LcsTableHead>
                    <LcsTh sticky>Name</LcsTh>
                    <LcsTh>Category</LcsTh>
                    <LcsTh>Access</LcsTh>
                    <LcsTh>Activity</LcsTh>
                    <LcsTh>Actions</LcsTh>
                  </LcsTableHead>
                  <LcsTableBody>
                    {activeVault.documents.map((doc) => {
                      const pendingRequest = doc.releaseRequests.find((r) => r.status === "pending");
                      return (
                        <LcsTr key={doc.id}>
                          <LcsTd sticky>{doc.name}</LcsTd>
                          <LcsTd>{doc.category}</LcsTd>
                          <LcsTd>
                            <LcsStatusPill status={ACCESS_TO_PILL[doc.access]} label={DOCUMENT_ACCESS_LABEL[doc.access]} />
                          </LcsTd>
                          <LcsTd>
                            {doc.viewLog.length > 0 ? `Viewed ${doc.viewLog.length}×` : "No views"}
                            {pendingRequest && (
                              <>
                                {" · "}
                                <LcsStatusPill status="attention" label="Release requested" />
                              </>
                            )}
                          </LcsTd>
                          <LcsTd>
                            <div className="flex items-center gap-2 flex-wrap">
                              <LcsButton variant="text-link" onClick={() => handleView(doc)}>
                                View
                              </LcsButton>
                              {doc.access === "release-on-request" && !pendingRequest && (
                                <LcsButton variant="text-link" onClick={() => handleRequestRelease(doc)}>
                                  Request release
                                </LcsButton>
                              )}
                              {pendingRequest && (
                                <>
                                  <LcsButton variant="text-link" onClick={() => handleRespond(doc, pendingRequest.id, "granted")}>
                                    Grant
                                  </LcsButton>
                                  <LcsButton variant="text-link" onClick={() => handleRespond(doc, pendingRequest.id, "declined")}>
                                    Decline
                                  </LcsButton>
                                </>
                              )}
                              <LcsButton variant="text-link" onClick={() => handleRemoveDoc(doc)}>
                                Remove
                              </LcsButton>
                            </div>
                          </LcsTd>
                        </LcsTr>
                      );
                    })}
                  </LcsTableBody>
                </LcsTable>
              )}
              <div className="px-3 py-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                <LcsButton variant="secondary" onClick={() => setShowUploadModal(true)}>
                  Add document
                </LcsButton>
              </div>
            </LcsCard>
          )}
        </div>
      )}

      {showCreateModal && <CreateVaultModal onCreate={handleCreateVault} onClose={() => setShowCreateModal(false)} />}
      {showUploadModal && activeVault && (
        <UploadExtractionModal
          onDone={() => {
            refresh();
            setShowUploadModal(false);
          }}
          onClose={() => setShowUploadModal(false)}
          onAddDocument={(name, category) => {
            addDocumentToVault(activeVault.id, { name, category, contributedBy: "self", access: "view-only" });
          }}
        />
      )}
    </LcsPageShell>
  );
}

function CreateVaultModal({ onCreate, onClose }: { onCreate: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  return (
    <LcsModal
      title="New vault"
      onClose={onClose}
      footer={
        <>
          <LcsButton variant="secondary" onClick={onClose}>
            Cancel
          </LcsButton>
          <LcsButton variant="primary" onClick={() => onCreate(name)}>
            Create
          </LcsButton>
        </>
      }
    >
      <LcsTextField
        label="Vault name"
        placeholder="New Vault"
        value={name}
        onChange={(e) => setName(e.target.value)}
        helper="Leave blank to use “New Vault” — you can rename it any time."
      />
    </LcsModal>
  );
}

/** Upload -> per-field mock-extraction confirm/correct -> add to vault.
 * The per-field review UI itself moved to the shared ExtractionReview
 * component (src/components/deals-preview/ProfileForm.tsx) once Profile
 * Builder needed the identical mechanism for pitch-deck extraction — one
 * implementation, two callers, not duplicated. THE GUARANTEE is enforced
 * there now: no handler iterates over every field and confirms them all;
 * "Add to vault" only reads fields already "confirmed"/"corrected". */
function UploadExtractionModal({
  onDone,
  onClose,
  onAddDocument,
}: {
  onDone: () => void;
  onClose: () => void;
  onAddDocument: (name: string, category: string) => void;
}) {
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [fields, setFields] = useState<LcsExtractedField[]>([]);

  const handleFilesSelected = (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setDocumentName(file.name);
    setFields(mockExtractFields(file.name));
  };

  const confirmedCount = fields.filter((f) => f.status !== "proposed").length;
  const allResolved = fields.length > 0 && confirmedCount === fields.length;

  const handleAddToVault = () => {
    if (!documentName) return;
    onAddDocument(documentName, "Uploaded");
    onDone();
  };

  return (
    <LcsModal
      title="Add document"
      variant="slide-over"
      onClose={onClose}
      footer={
        <>
          <LcsButton variant="secondary" onClick={onClose}>
            Cancel
          </LcsButton>
          <LcsButton variant="primary" onClick={handleAddToVault} disabled={!allResolved}>
            Add to vault
          </LcsButton>
        </>
      }
    >
      {!documentName ? (
        <LcsDropzone label="Document" hint="Drop file or click to upload" onFilesSelected={handleFilesSelected} />
      ) : (
        <ExtractionReview fields={fields} setFields={setFields} documentName={documentName} />
      )}
    </LcsModal>
  );
}
