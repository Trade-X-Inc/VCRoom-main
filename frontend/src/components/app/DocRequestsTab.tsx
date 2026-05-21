import { useState, useEffect } from "react";
import {
  ClipboardList, Plus, X, Loader2, CheckCircle2, Clock,
  Upload, FileText, AlertCircle, Send,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { getDocRequests, createDocRequest, fulfillDocRequest } from "@/lib/doc-request-fn";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ─── types ───────────────────────────────────────────────────────────────────

interface DocRequest {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "uploaded" | "fulfilled";
  created_at: string;
  updated_at: string;
  requested_by: string;
  for_user_id: string;
  document_id?: string;
}

interface Props {
  dealRoomId: string;
  isInvestor: boolean;
  isFounder: boolean;
  userId: string | undefined;
  founderUserId?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

// ─── status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    cls: "bg-warning/10 text-warning",
  },
  uploaded: {
    label: "Uploaded",
    icon: Upload,
    cls: "bg-brand/10 text-brand",
  },
  fulfilled: {
    label: "Fulfilled",
    icon: CheckCircle2,
    cls: "bg-success/10 text-success",
  },
};

// ─── component ───────────────────────────────────────────────────────────────

export function DocRequestsTab({ dealRoomId, isInvestor, isFounder, userId, founderUserId }: Props) {
  const [token, setToken] = useState("");
  const supabaseKey = (import.meta.env as any).VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL || "";
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? ""));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setToken(session?.access_token ?? "");
    });
    return () => subscription.unsubscribe();
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState("");

  // ── fetch requests
  const { data, isLoading } = useQuery({
    queryKey: ["doc-requests", dealRoomId],
    enabled: !!dealRoomId && !!token,
    queryFn: () => getDocRequests({ data: { dealRoomId, userId: userId ?? "", userAccessToken: token, supabaseUrl, supabaseKey } }),
    refetchInterval: 30_000, // poll every 30s
  });

  const requests: DocRequest[] = (data?.requests ?? []) as DocRequest[];

  // ── fallback: resolve founder user_id via service role (bypasses RLS)
  const { data: founderMember } = useQuery({
    queryKey: ["deal-room-founder", dealRoomId],
    enabled: !!dealRoomId && !founderUserId,
    queryFn: async () => {
      const resolvedKey = supabaseKey ||
        (import.meta.env as any).VITE_SUPABASE_SERVICE_ROLE_KEY || "";
      const resolvedUrl = supabaseUrl ||
        (import.meta.env as any).VITE_SUPABASE_URL ||
        "https://ldimninnjlvxozubheib.supabase.co";
      const adminSb = resolvedKey
        ? createClient(resolvedUrl, resolvedKey, { auth: { persistSession: false } })
        : supabase;
      const { data } = await adminSb
        .from("deal_room_members")
        .select("user_id, role")
        .eq("deal_room_id", dealRoomId)
        .eq("role", "founder")
        .maybeSingle();
      console.log("[DocRequest] founderMember result:", data);
      return data;
    },
  });

  const resolvedFounderId = founderUserId || founderMember?.user_id || "";
  console.log("[DocRequest] founderUserId prop:", founderUserId);
  console.log("[DocRequest] resolvedFounderId:", resolvedFounderId);

  // ── fetch founder's uploaded docs (for founder to link when fulfilling)
  const { data: founderDocs = [] } = useQuery({
    queryKey: ["deal-room-docs", dealRoomId],
    enabled: !!dealRoomId && isFounder,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, storage_path, category")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // ── create request (investor only)
  const createMut = useMutation({
    mutationFn: () =>
      createDocRequest({
        data: {
          dealRoomId,
          requestedBy: userId!,
          forUserId: resolvedFounderId,
          title: title.trim(),
          description: description.trim() || undefined,
          userAccessToken: token,
          supabaseUrl,
          supabaseKey,
        },
      }),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error ?? "Failed to create request"); return; }
      toast.success("Request sent to founder");
      setTitle("");
      setDescription("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["doc-requests", dealRoomId] });
    },
    onError: () => toast.error("Failed to send request"),
  });

  // ── fulfill request (founder only)
  const fulfillMut = useMutation({
    mutationFn: (req: DocRequest) =>
      fulfillDocRequest({
        data: {
          requestId: req.id,
          documentId: selectedDocId || undefined,
          requestedBy: req.requested_by,
          title: req.title,
          dealRoomId,
          userId: userId ?? "",
          userAccessToken: token,
          supabaseUrl,
          supabaseKey,
        },
      }),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error ?? "Failed to fulfill"); return; }
      toast.success("Marked as fulfilled — investor notified");
      setFulfillingId(null);
      setSelectedDocId("");
      qc.invalidateQueries({ queryKey: ["doc-requests", dealRoomId] });
    },
    onError: () => toast.error("Failed to fulfill request"),
  });

  const pending = requests.filter((r) => r.status === "pending");
  const done = requests.filter((r) => r.status !== "pending");

  // ─── render ──────────────────────────────────────────────────────────────
  console.log("[DocRequest Debug]", {
    founderUserId,
    founderMember,
    resolvedFounderId,
    supabaseKey: supabaseKey?.slice(0, 10),
    isInvestor,
    dealRoomId,
  });
  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-brand" />
            Document Requests
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isInvestor
              ? "Request specific documents from the founder"
              : "Documents requested by the investor"}
          </p>
        </div>
        {isInvestor && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
          >
            <Plus className="h-4 w-4" /> Request document
          </button>
        )}
      </div>

      {/* Request form — investor only */}
      {isInvestor && showForm && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">New document request</span>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Document name *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audited financials 2024, Cap table, Customer contracts…"
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Additional context (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Explain why you need this or what format you prefer…"
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand/50"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!title.trim() || createMut.isPending || !resolvedFounderId}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50"
            >
              {createMut.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />}
              Send request
            </button>
          </div>
          {!resolvedFounderId && (
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Founder user ID not found — request cannot be sent yet.
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && requests.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 bg-card py-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted mx-auto mb-3">
            <ClipboardList className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium">No document requests yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isInvestor
              ? "Use the button above to request a specific document from the founder."
              : "When the investor requests a document, it will appear here."}
          </p>
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pending ({pending.length})
          </div>
          {pending.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              isFounder={isFounder}
              isInvestor={isInvestor}
              founderDocs={founderDocs}
              fulfillingId={fulfillingId}
              selectedDocId={selectedDocId}
              setFulfillingId={setFulfillingId}
              setSelectedDocId={setSelectedDocId}
              onFulfill={() => fulfillMut.mutate(req)}
              fulfilling={fulfillMut.isPending}
            />
          ))}
        </div>
      )}

      {/* Fulfilled requests */}
      {done.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Completed ({done.length})
          </div>
          {done.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              isFounder={isFounder}
              isInvestor={isInvestor}
              founderDocs={founderDocs}
              fulfillingId={fulfillingId}
              selectedDocId={selectedDocId}
              setFulfillingId={setFulfillingId}
              setSelectedDocId={setSelectedDocId}
              onFulfill={() => fulfillMut.mutate(req)}
              fulfilling={fulfillMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RequestCard ──────────────────────────────────────────────────────────────

function RequestCard({
  req,
  isFounder,
  isInvestor,
  founderDocs,
  fulfillingId,
  selectedDocId,
  setFulfillingId,
  setSelectedDocId,
  onFulfill,
  fulfilling,
}: {
  req: DocRequest;
  isFounder: boolean;
  isInvestor: boolean;
  founderDocs: any[];
  fulfillingId: string | null;
  selectedDocId: string;
  setFulfillingId: (id: string | null) => void;
  setSelectedDocId: (id: string) => void;
  onFulfill: () => void;
  fulfilling: boolean;
}) {
  const cfg = STATUS_CONFIG[req.status];
  const StatusIcon = cfg.icon;
  const isExpanded = fulfillingId === req.id;

  function nameFromPath(p: string) {
    return (p?.split("/").pop() ?? "").replace(/^\d{13}-/, "") || "Untitled";
  }

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all",
      req.status === "pending" ? "border-border/60" : "border-border/40 opacity-80",
    )}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className={cn("grid h-8 w-8 place-items-center rounded-lg shrink-0 mt-0.5", cfg.cls)}>
          <StatusIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium">{req.title}</div>
              {req.description && (
                <div className="text-xs text-muted-foreground mt-0.5">{req.description}</div>
              )}
            </div>
            <span className={cn("shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full", cfg.cls)}>
              {cfg.label}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {req.created_at
                ? formatDistanceToNow(new Date(req.created_at), { addSuffix: true })
                : "—"}
            </span>
            {/* Founder can fulfill pending requests */}
            {isFounder && req.status === "pending" && !isExpanded && (
              <button
                onClick={() => { setFulfillingId(req.id); setSelectedDocId(""); }}
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Upload className="h-3 w-3" /> Mark as uploaded
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Founder fulfill panel */}
      {isFounder && isExpanded && req.status === "pending" && (
        <div className="border-t border-border/60 px-4 py-3 bg-muted/20 space-y-3">
          <p className="text-xs text-muted-foreground">
            Optionally link an uploaded document, or just mark as fulfilled.
          </p>
          {founderDocs.length > 0 && (
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            >
              <option value="">Select a document (optional)…</option>
              {founderDocs.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {nameFromPath(d.storage_path)} {d.category ? `· ${d.category}` : ""}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setFulfillingId(null)}
              className="flex-1 rounded-md border border-border/60 py-1.5 text-xs hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={onFulfill}
              disabled={fulfilling}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground py-1.5 text-xs shadow-glow disabled:opacity-50"
            >
              {fulfilling
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <CheckCircle2 className="h-3 w-3" />}
              Mark fulfilled
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
