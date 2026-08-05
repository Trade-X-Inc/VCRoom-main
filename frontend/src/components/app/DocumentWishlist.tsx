import { useState, useRef } from "react";

const ALLOWED_EXTENSIONS = new Set(["pdf","pptx","ppt","xlsx","xls","docx","doc","csv","png","jpg","jpeg"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callAction } from "@/lib/actions/call";
import {
  docRequestList, docRequestInsert, docRequestSetStatus, docRequestDelete,
  docRequestRespondLink, docInsert,
} from "@/lib/actions/deal-room-documents";
import {
  V2Button, LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel,
} from "@/components/v2";
import {
  Plus, X, ChevronDown, ChevronUp, Link2, Upload, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  dealRoomId: string;
  isInvestor: boolean;
  isFounder: boolean;
  userId: string | undefined;
}

const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

const SUGGESTED_REQUESTS = [
  { title: "Audited financials (last 2 years)", priority: "high" },
  { title: "Cap table (current + fully diluted)", priority: "high" },
  { title: "Revenue projections (3-year model)", priority: "high" },
  { title: "Pitch deck (latest version)", priority: "medium" },
  { title: "Product roadmap", priority: "medium" },
  { title: "Customer references / case studies", priority: "medium" },
  { title: "Founder CVs / LinkedIn profiles", priority: "low" },
  { title: "TAM/SAM/SOM market analysis", priority: "low" },
  { title: "Certificate of incorporation", priority: "low" },
] as const;

export function DocumentWishlist({ dealRoomId, isInvestor, isFounder, userId }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Per-request link response state (founder can respond with a link)
  const [linkInputId, setLinkInputId] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: requests = [] } = useQuery({
    queryKey: ["doc-wishlist", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      // doc_request_list returns member-scoped rows (to_jsonb, all columns),
      // ordered created_at desc; the UI re-derives pending/fulfilled and does not
      // depend on order, so this is behaviourally equivalent to the prior query.
      const res = await callAction<{ requests: any[] }>(docRequestList, dealRoomId, { dealRoomId });
      return res.requests ?? [];
    },
    refetchInterval: 30_000,
  });

  const handleAdd = async (t?: string, p?: string) => {
    const finalTitle = (t ?? title).trim();
    const finalPriority = (p ?? priority) as "high" | "medium" | "low";
    if (!finalTitle || !userId) return;
    setSaving(true);
    try {
      // requested_by is derived server-side from the token (not passed); for_user_id
      // preserves the prior behaviour (= the caller). status defaults to 'pending'.
      await callAction(docRequestInsert, dealRoomId, {
        dealRoomId,
        title: finalTitle,
        description: description.trim() || null,
        priority: finalPriority,
        forUserId: userId,
      });
      toast.success("Document requested");
      setTitle(""); setDescription(""); setAdding(false); setShowSuggested(false);
      qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleFulfill = async (id: string) => {
    try {
      await callAction(docRequestSetStatus, dealRoomId, { requestId: id, status: "fulfilled" });
    } catch (err: any) {
      console.error("[wishlist] fulfill failed:", err); toast.error("Could not update request."); return;
    }
    toast.success("Marked as uploaded");
    qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
  };

  const handleSaveLink = async (id: string) => {
    if (!linkValue.trim()) return;
    setSavingLink(true);
    try {
      await callAction(docRequestRespondLink, dealRoomId, { requestId: id, link: linkValue.trim() });
      toast.success("Link saved and request marked fulfilled");
      setLinkInputId(null); setLinkValue("");
      qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
    } catch (err: any) {
      toast.error(err.message);
    }
    setSavingLink(false);
  };

  const handleUploadForRequest = async (id: string, file: File) => {
    if (!userId) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) { toast.error(`${file.name}: file type not allowed`); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name}: exceeds 50 MB limit`); return; }
    setUploadingId(id);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${dealRoomId}/${Date.now()}-${safeName}`;
      // Storage upload stays client-side (Storage RLS-governed; no gateway storage
      // action in Step A scope). Only the two DB writes move to the gateway.
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      await callAction(docInsert, dealRoomId, {
        dealRoomId,
        storagePath: path,
        fileName: file.name,
        category: "Other",
        uploadedByRole: null,
        fileSize: file.size,
      });
      await callAction(docRequestSetStatus, dealRoomId, { requestId: id, status: "fulfilled" });
      qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["documents", dealRoomId] });
      toast.success(`${file.name} uploaded and request fulfilled`);
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploadingId(null); }
  };

  const handleDelete = async (id: string) => {
    try {
      await callAction(docRequestDelete, dealRoomId, { requestId: id });
    } catch (err: any) {
      console.error("[wishlist] delete failed:", err); toast.error("Could not delete request."); return;
    }
    qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
  };

  const pending   = (requests as any[]).filter((r) => r.status === "pending");
  const fulfilled = (requests as any[]).filter((r) => r.status === "fulfilled");
  const allRows = [...pending, ...fulfilled];

  if (requests.length === 0 && !isInvestor) return null;

  return (
    <div className="mb-5 border border-v2-rule bg-v2-panel" style={{ borderRadius: "var(--v2-radius)" }}>
      {/* Header — no reference number exists for document_requests yet, so
          ReferenceLine is not used here; it would render null anyway. */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: "40px", borderBottom: "1px solid var(--v2-rule)" }}
      >
        <button className="flex items-center gap-2 flex-1 text-left font-v2-ui" onClick={() => setCollapsed((v) => !v)}>
          <span className="text-v2-ink font-medium" style={{ fontSize: "13.5px" }}>Documents needed</span>
          {pending.length > 0 && (
            <StatusLabel tone="attention" dot={false}>{pending.length} outstanding</StatusLabel>
          )}
          {fulfilled.length > 0 && (
            <StatusLabel tone="satisfied" dot={false}>{fulfilled.length} complete</StatusLabel>
          )}
          {collapsed
            ? <ChevronDown className="h-3.5 w-3.5 text-v2-ink-muted ml-auto" />
            : <ChevronUp className="h-3.5 w-3.5 text-v2-ink-muted ml-auto" />}
        </button>
        {isInvestor && !adding && !collapsed && (
          <div className="flex items-center gap-1.5 ml-3">
            <V2Button variant="quiet" onClick={() => setShowSuggested((v) => !v)} style={{ height: "auto", padding: "2px 6px", fontSize: "11px" }}>
              Quick add
            </V2Button>
            <V2Button variant="quiet" onClick={() => { setAdding(true); setShowSuggested(false); }} style={{ height: "auto", padding: "2px 6px" }}>
              <Plus className="h-3.5 w-3.5" /> Custom
            </V2Button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Quick add suggestions */}
          {showSuggested && isInvestor && (
            <div className="px-4 py-3 font-v2-ui" style={{ borderBottom: "1px solid var(--v2-rule)", background: "var(--v2-surface)" }}>
              <div className="text-v2-ink-muted uppercase font-medium mb-2" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>
                Common requests — select to add
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_REQUESTS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => handleAdd(s.title, s.priority)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 border border-v2-rule bg-v2-panel px-2.5 py-1 hover:bg-v2-accent-wash disabled:opacity-40 font-v2-ui"
                    style={{ borderRadius: "var(--v2-radius)", fontSize: "11px" }}
                  >
                    {s.title}
                    <span className="text-v2-ink-muted" style={{ fontSize: "10px" }}>{PRIORITY_LABEL[s.priority]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom add form */}
          {adding && (
            <div className="px-4 py-3 space-y-2 font-v2-ui" style={{ borderBottom: "1px solid var(--v2-rule)" }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAdd()}
                placeholder="Document name (e.g. Audited financials 2024)"
                autoFocus
                className="w-full border border-v2-rule bg-v2-panel px-3 focus:outline-none"
                style={{ height: "36px", borderRadius: "var(--v2-radius)", fontSize: "13.5px" }}
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional note for the founder"
                className="w-full border border-v2-rule bg-v2-panel px-3 py-1.5 focus:outline-none"
                style={{ borderRadius: "var(--v2-radius)", fontSize: "12.5px" }}
              />
              <div className="flex items-center gap-2">
                <span className="text-v2-ink-muted uppercase" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>Priority</span>
                {(["high", "medium", "low"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "border px-2 py-0.5 font-medium transition-colors",
                      priority === p ? "border-v2-accent bg-v2-accent-wash text-v2-accent" : "border-v2-rule text-v2-ink-muted hover:bg-v2-accent-wash",
                    )}
                    style={{ borderRadius: "var(--v2-radius)", fontSize: "11px" }}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
                <div className="flex-1" />
                <V2Button variant="quiet" onClick={() => { setAdding(false); setTitle(""); setDescription(""); }}>
                  <X className="h-4 w-4" />
                </V2Button>
                <V2Button variant="primary" onClick={() => handleAdd()} disabled={!title.trim() || saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                </V2Button>
              </div>
            </div>
          )}

          {/* Empty state — names what would appear + the primary action (§7.3) */}
          {requests.length === 0 && (
            <div className="px-4 py-4 text-v2-ink-secondary font-v2-ui" style={{ fontSize: "12.5px" }}>
              {isInvestor
                ? "Request specific documents from the founder. They are notified and can upload files or share links directly in response."
                : "The investor has not requested any specific documents yet."}
            </div>
          )}

          {/* Hidden file input for upload-per-request */}
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && uploadingId) handleUploadForRequest(uploadingId, file);
              e.target.value = "";
            }}
          />

          {allRows.length > 0 && (
            <div className="overflow-x-auto">
              <LedgerTable>
                <LedgerHead>
                  <Tr>
                    <Th>Document</Th>
                    <Th>Priority</Th>
                    <Th>Status</Th>
                    {isFounder && <Th>Respond</Th>}
                    {isInvestor && <Th aria-label="Actions" />}
                  </Tr>
                </LedgerHead>
                <LedgerBody>
                  {pending.map((r: any) => (
                    <Tr key={r.id} status="attention">
                      <Td>
                        <div className="font-medium text-v2-ink">{r.title}</div>
                        {r.description && (
                          <div className="text-v2-ink-muted" style={{ fontSize: "11px", marginTop: "2px" }}>{r.description}</div>
                        )}
                      </Td>
                      <Td>{r.priority ? PRIORITY_LABEL[r.priority as keyof typeof PRIORITY_LABEL] ?? r.priority : "—"}</Td>
                      <Td><StatusLabel tone="attention">Outstanding</StatusLabel></Td>
                      {isFounder && (
                        <Td>
                          {linkInputId === r.id ? (
                            <div className="flex gap-2 items-center">
                              <input
                                value={linkValue}
                                onChange={(e) => setLinkValue(e.target.value)}
                                placeholder="Paste link"
                                autoFocus
                                className="border border-v2-rule bg-v2-panel px-2 py-1 focus:outline-none font-v2-ui"
                                style={{ borderRadius: "var(--v2-radius)", fontSize: "11.5px", width: "160px" }}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveLink(r.id)}
                              />
                              <V2Button variant="primary" onClick={() => handleSaveLink(r.id)} disabled={!linkValue.trim() || savingLink} style={{ height: "28px", fontSize: "11px" }}>
                                {savingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                              </V2Button>
                              <V2Button variant="quiet" onClick={() => { setLinkInputId(null); setLinkValue(""); }} style={{ height: "28px" }}>
                                <X className="h-3.5 w-3.5" />
                              </V2Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <V2Button variant="secondary" onClick={() => { setLinkInputId(r.id); setLinkValue(""); }} style={{ height: "28px", fontSize: "11px" }}>
                                <Link2 className="h-3 w-3" /> Share link
                              </V2Button>
                              <V2Button
                                variant="secondary"
                                onClick={() => { setUploadingId(r.id); fileRef.current?.click(); }}
                                disabled={uploadingId === r.id}
                                style={{ height: "28px", fontSize: "11px" }}
                              >
                                {uploadingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                Upload
                              </V2Button>
                              <V2Button variant="quiet" onClick={() => handleFulfill(r.id)} style={{ height: "28px", fontSize: "11px" }}>
                                Mark uploaded
                              </V2Button>
                            </div>
                          )}
                        </Td>
                      )}
                      {isInvestor && (
                        <Td numeric>
                          <V2Button variant="quiet" onClick={() => handleDelete(r.id)} style={{ height: "28px" }}>
                            <X className="h-3.5 w-3.5" />
                          </V2Button>
                        </Td>
                      )}
                    </Tr>
                  ))}
                  {fulfilled.map((r: any) => (
                    <Tr key={r.id} status="satisfied">
                      <Td>
                        <div className="text-v2-ink-secondary" style={{ textDecoration: "line-through" }}>{r.title}</div>
                        {r.response_link && (
                          <a href={r.response_link} target="_blank" rel="noopener noreferrer"
                            className="text-v2-accent hover:underline block" style={{ fontSize: "11px", marginTop: "2px" }}>
                            {r.response_link}
                          </a>
                        )}
                      </Td>
                      <Td>{r.priority ? PRIORITY_LABEL[r.priority as keyof typeof PRIORITY_LABEL] ?? r.priority : "—"}</Td>
                      <Td><StatusLabel tone="satisfied">Complete</StatusLabel></Td>
                      {isFounder && <Td />}
                      {isInvestor && <Td numeric />}
                    </Tr>
                  ))}
                </LedgerBody>
              </LedgerTable>
            </div>
          )}
        </>
      )}
    </div>
  );
}
