import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useAuthStore } from "@/lib/auth-store";
import { extractDocumentText } from "@/lib/document-extractor";
import { callAction } from "@/lib/actions/call";
import { libraryClarityCheck } from "@/lib/actions/library";
import {
  LcsPageShell,
  LcsPageHeader,
  LcsNavItem,
  LcsCard,
  LcsEmptyState,
  LcsButton,
  LcsStatusPill,
  LcsDropzone,
  LcsSelectField,
  LcsModal,
  type LcsStatus,
} from "@/components/lcs";

// The private Library container — stage 1 of 3 (Library -> Data Pack ->
// Information Vault). NEW table (library_documents), not a rename/reuse
// of founder_documents — founder_documents carries a real cross-owner
// share path (investor_read_approved_docs) for its own legitimate
// purpose, which is the opposite of Library's never-shareable premise.
// This route is genuinely distinct from /app/prepare/ip-vault/
// document-intake (a thin alias over app.documents.tsx, founder_documents-
// backed, founder-only). Library serves both owner types.
//
// ROUTE PLACEMENT — deliberately OUTSIDE /app/*, same reasoning as
// deals-preview/*: app.tsx's layout route unconditionally wraps every
// /app/* child in AdminShell/MemberShell (the old v1/v2 shell), which
// would double-wrap this real LcsPageShell. This is TEMPORARY placement,
// not final — cuts over to /app/library once the real app shell migrates
// to the LCS Component System (already a tracked future task; logged
// alongside deals-preview/*'s own identical note in LCS_MIGRATION_PLAN.md
// and CLAUDE.md). Unlike deals-preview/*, this route has a REAL auth
// check (below) and REAL private user data — it is not a design sandbox.
//
// SCOPE OF THIS PASS (3a-i): the container only.
//   - NO AI anywhere in this file. No analysis, no gap/mismatch flagging,
//     no edit-suggest loop. analysis_status does not exist as a column
//     yet (deliberately deferred to 3a-ii/3b) and nothing here reads or
//     writes it.
//   - NO digital document builder (3a-iii). `source` is always written
//     as 'uploaded' — the 'builder_created' branch has no UI here.
//   - NO cross-document analysis, NO Data Pack (3b). The only outbound
//     action from Library is deferred entirely; this pass has no
//     "add to pack" affordance of any kind.
//
// SINGLE-OWNER ISOLATION — every query in this file is scoped
// `.eq("owner_id", user.id)`, matching library_documents' own two-policy
// RLS design exactly (library_documents_own: owner_id = auth.uid(), no
// other policy, no team-permission policy, no cross-owner join of any
// kind — CLAUDE.md §15/§25). owner_id is always the resolved caller's own
// uid from useAuth(), never a route param or any other caller-supplied
// value.
//
// UPLOAD PIPELINE — reuses the existing upload-security-gate edge
// function (magic-byte verification + malware-scan stub +
// quarantine/notify/auto-remove), extended in this same pass with a
// third 'library_documents' branch (owner_id = uid, the simplest of its
// three ownership shapes — no join). No second upload-security path
// exists or is written here.

const CATEGORY_OPTIONS = [
  { value: "company", label: "Company" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "operations", label: "Operations" },
  { value: "product", label: "Product" },
  { value: "team", label: "Team" },
  { value: "market", label: "Market" },
  { value: "other", label: "Other" },
] as const;
type Category = (typeof CATEGORY_OPTIONS)[number]["value"];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
);
// Fixed display order — same rationale as app.documents.tsx's own
// CATEGORY_SORT_ORDER: an explicit order reads better than whatever
// order rows happen to arrive in, and staying explicit avoids the same
// "invented enum that never matched the real categories" drift that
// file's own comment already recorded once.
const CATEGORY_ORDER: Record<string, number> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c, i) => [c.value, i]),
);

const ALLOWED_EXTENSIONS = new Set(["pdf", "csv", "pptx", "docx", "html", "png", "jpg", "jpeg"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface ClarityFeedback {
  summary: string;
  flags: string[];
  recommendations: string[];
}

interface LibraryDocument {
  id: string;
  owner_type: "founder" | "investor";
  owner_id: string;
  source: "uploaded" | "builder_created";
  category: Category;
  scan_status: "pending" | "clean" | "quarantined";
  // analysis_status is SEPARATE from scan_status and from clarity_feedback's
  // own contents — the UI must branch on this column first, never on
  // clarity_feedback.flags.length, per §7.4 (the same completeness_score=0
  // "plausible-wrong" trap founder_documents already made once).
  analysis_status: "unanalyzed" | "analyzing" | "analyzed";
  clarity_feedback: ClarityFeedback | null;
  visibility: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

function scanStatusToLcs(status: LibraryDocument["scan_status"]): LcsStatus {
  if (status === "clean") return "satisfied";
  if (status === "quarantined") return "attention";
  return "pending";
}

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export const Route = createFileRoute("/library")({
  // Real auth gate, matching /app's own beforeLoad exactly — this route
  // is outside /app/* for shell-nesting reasons only (see the header
  // comment above), not because it should skip authentication. Unlike
  // deals-preview/*, Library holds real private user documents.
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { user, initialized } = useAuthStore.getState();
    if (initialized && !user) throw redirect({ to: "/sign-in", search: {}, replace: true });
  },
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saveCategory, setSaveCategory] = useState<Category>("other");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LibraryDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["library-documents", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // scan_status='clean' on top of RLS's owner_id scoping — a still-
      // pending or quarantined row must never appear as usable, same
      // rule already shipped for founder_documents/documents.
      const { data, error } = await supabase
        .from("library_documents")
        .select("*")
        .eq("owner_id", user!.id)
        .eq("scan_status", "clean")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[library] list failed:", error);
        return [];
      }
      return (data ?? []) as LibraryDocument[];
    },
  });

  const grouped = useMemo(() => {
    const byCategory = new Map<string, LibraryDocument[]>();
    for (const doc of documents) {
      const list = byCategory.get(doc.category) ?? [];
      list.push(doc);
      byCategory.set(doc.category, list);
    }
    return Array.from(byCategory.entries()).sort(
      ([a], [b]) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99),
    );
  }, [documents]);

  const handleFilesSelected = (files: FileList) => {
    const file = files[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      toast.error(`${file.name}: file type not allowed`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name}: exceeds 50 MB limit`);
      return;
    }
    setPendingFile(file);
    setSaveCategory("other");
  };

  const handleSave = async () => {
    if (!pendingFile || !user?.id) return;
    setSaving(true);
    try {
      // "personal/{uid}/..." — the only storage RLS prefix that matches a
      // bare owner_id=auth.uid() check (storage.objects' own INSERT/
      // SELECT/UPDATE/DELETE policies on the documents bucket only
      // recognize 'founder-docs/{startup_id}/...', a deal-room-id prefix,
      // or 'personal/{uid}/...' — confirmed live against the real
      // policies before fixing this, not guessed a second time).
      const path = `personal/${user.id}/${Date.now()}-${pendingFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, pendingFile);
      if (uploadError) {
        toast.error("Upload failed");
        return;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("library_documents")
        .insert({
          owner_type: user.role,
          owner_id: user.id,
          source: "uploaded",
          category: saveCategory,
          file_path: path,
          file_name: pendingFile.name,
          file_size: pendingFile.size,
        })
        .select("id")
        .single();
      if (insertError || !inserted?.id) {
        toast.error("Could not save — try again.");
        return;
      }

      // Upload-security gate — same deployed function used by
      // founder_documents/documents, extended with a library_documents
      // branch in this same pass. Awaited before any success messaging;
      // the row stays 'pending' (excluded from the list query above)
      // until this resolves.
      const { data: gateData, error: gateError } = await supabase.functions.invoke(
        "upload-security-gate",
        { body: { documentId: inserted.id, table: "library_documents" } },
      );
      if (gateError) {
        console.error("[library] upload-security-gate failed:", gateError);
        toast.error("Could not verify this file — try again.");
        return;
      }
      const verdict = (gateData as { verdict?: string; reason?: string })?.verdict;
      if (verdict === "quarantined") {
        const reason = (gateData as { reason?: string })?.reason;
        toast.error(
          reason === "malware"
            ? "This file failed our security scan and was removed."
            : `This file isn't a valid ${(pendingFile.name.split(".").pop() ?? "").toUpperCase()}.`,
        );
        setPendingFile(null);
        return;
      }

      toast.success(`${pendingFile.name} added to your Library`);
      setPendingFile(null);
      queryClient.invalidateQueries({ queryKey: ["library-documents", user.id] });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user?.id) return;
    setDeleting(true);
    try {
      // Row first, then storage — matching the auto-remove discipline
      // already established for quarantine: no orphaned files. If the
      // row delete succeeds but storage fails, the file is unreachable
      // from the UI regardless (RLS-scoped list no longer includes it),
      // so failing the storage cleanup silently rather than blocking the
      // user's delete action is the same tradeoff already accepted for
      // the gate's own auto-remove path.
      const { error: deleteError } = await supabase
        .from("library_documents")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("owner_id", user.id);
      if (deleteError) {
        toast.error("Could not delete — try again.");
        return;
      }
      if (deleteTarget.file_path) {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove([deleteTarget.file_path]);
        if (storageError) {
          console.error("[library] storage cleanup failed:", storageError);
        }
      }
      toast.success(`${deleteTarget.file_name ?? "Document"} deleted`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["library-documents", user.id] });
    } finally {
      setDeleting(false);
    }
  };

  // Per-document clarity check — user-click ONLY, never automatic. This is
  // the sole place this action is ever invoked from; there is no
  // on-upload or on-schedule trigger anywhere in this file. The rate-limit
  // RPC fails open on infra error (confirmed during 3a-ii's recon), so it
  // is NOT the spend guard here — this click is.
  const handleClarityCheck = async (doc: LibraryDocument) => {
    if (!doc.file_path) return;
    setCheckingId(doc.id);
    // Optimistic local state matches the server's own immediate
    // 'analyzing' write (the action flips this before the AI call even
    // starts) — invalidate right away so a fast re-render shows the real
    // held state rather than the pre-click 'unanalyzed'.
    queryClient.setQueryData<LibraryDocument[]>(
      ["library-documents", user?.id],
      (old) => (old ?? []).map((d) => (d.id === doc.id ? { ...d, analysis_status: "analyzing" } : d)),
    );
    try {
      const { data: blob, error: dlError } = await supabase.storage
        .from("documents")
        .download(doc.file_path);
      if (dlError || !blob) {
        toast.error("Could not read this file — try again.");
        queryClient.invalidateQueries({ queryKey: ["library-documents", user?.id] });
        return;
      }
      const arrayBuffer = await (blob as Blob).arrayBuffer();
      const documentText = await extractDocumentText(arrayBuffer, doc.file_name ?? "");

      const result = await callAction<{ ok: boolean; feedback?: ClarityFeedback; error?: string }>(
        libraryClarityCheck,
        doc.owner_id,
        { documentId: doc.id, documentText, category: doc.category },
      );
      if (!result.ok) {
        toast.error(result.error ?? "Clarity check failed — try again.");
        return;
      }
      toast.success("Clarity check complete");
    } catch (e: any) {
      toast.error(e?.message ?? "Clarity check failed — try again.");
    } finally {
      setCheckingId(null);
      // The server is the source of truth for analysis_status regardless
      // of outcome (success -> 'analyzed', any failure -> reset to
      // 'unanalyzed' inside the action's own bulletproofed handler) — a
      // real refetch here, not a guess about which state it landed in.
      queryClient.invalidateQueries({ queryKey: ["library-documents", user?.id] });
    }
  };

  return (
    <LcsPageShell
      searchPlaceholder="Search your Library"
      userInitials={(user?.fullName ?? user?.email ?? "?").slice(0, 2).toUpperCase()}
      userLabel={user?.fullName ?? user?.email ?? ""}
      sidebar={(collapsed) => (
        <nav className="flex flex-col gap-0.5 p-2">
          {!collapsed && (
            <div
              className="px-2 py-2 text-[15px] font-semibold"
              style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}
            >
              Lengdon
            </div>
          )}
          <LcsNavItem to="/library" label="Library" active collapsed={collapsed} icon="L" />
        </nav>
      )}
    >
      <LcsPageHeader
        title="Library"
        description="Your private document store. Files here are never shared — add an approved file to a data pack when you're ready to share it."
      />

      <div className="flex flex-col gap-6">
        <LcsCard title="Add a document">
          <div className="p-4 flex flex-col gap-4">
            <LcsDropzone
              label="Upload a file"
              hint="PDF, CSV, PPTX, DOCX, PNG, or JPEG · up to 50 MB"
              onFilesSelected={handleFilesSelected}
            />
            {pendingFile && (
              <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: "var(--lcs-line)" }}>
                <div className="text-sm" style={{ color: "var(--lcs-ink)" }}>
                  {pendingFile.name}
                </div>
                <LcsSelectField
                  label="Category"
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value as Category)}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </LcsSelectField>
                <div className="flex gap-2">
                  <LcsButton variant="primary" disabled={saving} onClick={handleSave}>
                    {saving ? "Saving…" : "Save to Library"}
                  </LcsButton>
                  <LcsButton variant="secondary" disabled={saving} onClick={() => setPendingFile(null)}>
                    Cancel
                  </LcsButton>
                </div>
              </div>
            )}
          </div>
        </LcsCard>

        {isLoading ? null : documents.length === 0 ? (
          <LcsEmptyState
            title="No documents yet"
            text="Upload a file above to add it to your Library."
          />
        ) : (
          grouped.map(([category, docs]) => (
            <LcsCard key={category} title={CATEGORY_LABEL[category] ?? category} count={docs.length}>
              <div className="divide-y" style={{ borderColor: "var(--lcs-line)" }}>
                {docs.map((doc) => {
                  // analysis_status is checked FIRST, always — never
                  // clarity_feedback.flags.length. A real 'analyzed' result
                  // with zero flags is a genuine "nothing found," which
                  // must never render identically to 'unanalyzed' (never
                  // checked at all). See CLAUDE.md §7.4.
                  const isChecking = doc.analysis_status === "analyzing" || checkingId === doc.id;
                  return (
                    <div key={doc.id} className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm truncate" style={{ color: "var(--lcs-ink)" }}>
                            {doc.file_name}
                          </div>
                          <div className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <LcsStatusPill status={scanStatusToLcs(doc.scan_status)} label="Clean" />
                          <LcsButton
                            variant="secondary"
                            disabled={isChecking}
                            onClick={() => handleClarityCheck(doc)}
                          >
                            {isChecking ? "Analyzing…" : "Check for clarity"}
                          </LcsButton>
                          <LcsButton variant="text-link" onClick={() => setDeleteTarget(doc)}>
                            Delete
                          </LcsButton>
                        </div>
                      </div>
                      {doc.analysis_status === "analyzed" && (
                        <div
                          className="mt-1 p-3 text-sm flex flex-col gap-2"
                          style={{ background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)" }}
                        >
                          <div style={{ color: "var(--lcs-ink)" }}>
                            {doc.clarity_feedback?.summary || "No summary returned."}
                          </div>
                          {doc.clarity_feedback && doc.clarity_feedback.flags.length > 0 ? (
                            <ul className="list-disc pl-4" style={{ color: "var(--lcs-ink-muted)" }}>
                              {doc.clarity_feedback.flags.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          ) : (
                            <div style={{ color: "var(--lcs-ink-muted)" }}>No issues flagged.</div>
                          )}
                          {doc.clarity_feedback && doc.clarity_feedback.recommendations.length > 0 && (
                            <ul className="list-disc pl-4" style={{ color: "var(--lcs-ink-muted)" }}>
                              {doc.clarity_feedback.recommendations.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </LcsCard>
          ))
        )}
      </div>

      {deleteTarget && (
        <LcsModal
          title="Delete this document?"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <LcsButton variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </LcsButton>
              <LcsButton variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </LcsButton>
            </>
          }
        >
          <p className="text-sm" style={{ color: "var(--lcs-ink)" }}>
            {deleteTarget.file_name} will be permanently removed from your Library.
          </p>
        </LcsModal>
      )}
    </LcsPageShell>
  );
}
