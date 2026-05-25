import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, Upload, CheckCircle2, AlertTriangle,
  Download, Trash2, Loader2, LayoutGrid, List,
  File, Table2, Image, Video, X, Plus, ExternalLink, Link as LinkIcon,
} from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/documents")({
  component: Documents,
});

const CATEGORIES = [
  "Pitch Deck", "Financials", "Legal", "Market Research", "Team", "Product", "Other",
] as const;
type DocCategory = (typeof CATEGORIES)[number];

const TAB_LABELS = ["All", ...CATEGORIES] as const;

const EXPECTED_DOCS: Record<DocCategory, string[]> = {
  "Pitch Deck": [
    "Pitch Deck (PDF or PPTX)",
    "One-pager / Executive Summary",
    "Company Blurb (1-2 paragraphs)",
  ],
  "Financials": [
    "Last 3 years P&L",
    "Current balance sheet",
    "Cash flow statement",
    "Revenue projections (3 years)",
    "Cap table",
    "Current MRR/ARR metrics",
  ],
  "Legal": [
    "Certificate of incorporation",
    "Shareholder agreement",
    "IP ownership / assignments",
    "Pending litigation disclosure",
    "Key contracts",
  ],
  "Market Research": [
    "TAM/SAM/SOM analysis",
    "Competitive landscape",
    "Customer research / surveys",
    "Market sizing model",
  ],
  "Team": [
    "Founder CVs / LinkedIn profiles",
    "Org chart",
    "Key employee contracts",
    "Advisory board list",
  ],
  "Product": [
    "Product roadmap",
    "Tech architecture overview",
    "Demo recording / video link",
    "Key metrics dashboard",
    "Product screenshots",
  ],
  "Other": [],
};

type ViewMode = "list" | "grid";

const CAT_COLOR: Record<string, string> = {
  "Pitch Deck":      "bg-brand/10 text-brand",
  "Financials":      "bg-success/10 text-success",
  "Legal":           "bg-destructive/10 text-destructive",
  "Market Research": "bg-violet/10 text-violet",
  "Team":            "bg-warning/10 text-warning",
  "Product":         "bg-brand/15 text-brand",
  "Other":           "bg-muted text-muted-foreground",
};

function getFileIconProps(fileName: string): { Icon: any; colorCls: string } {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return { Icon: FileText, colorCls: "text-red-500" };
  if (["pptx", "ppt", "key"].includes(ext)) return { Icon: FileText, colorCls: "text-orange-500" };
  if (["xlsx", "xls", "csv"].includes(ext)) return { Icon: Table2, colorCls: "text-green-600" };
  if (["doc", "docx"].includes(ext)) return { Icon: FileText, colorCls: "text-blue-500" };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return { Icon: Image, colorCls: "text-purple-500" };
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return { Icon: Video, colorCls: "text-pink-500" };
  return { Icon: File, colorCls: "text-muted-foreground" };
}

function nameFromPath(storagePath: string): string {
  const last = storagePath.split("/").pop() ?? "";
  // Strip leading timestamp prefix (13-digit unix ms) if present
  return last.replace(/^\d{13}-/, "") || last || "Untitled";
}

function DocIcon({ fileName, size = "md" }: { fileName: string; size?: "sm" | "md" | "lg" }) {
  const { Icon, colorCls } = getFileIconProps(fileName);
  const cls = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  return <Icon className={cn(cls, colorCls, "shrink-0")} />;
}

function Documents() {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addRoomDocId, setAddRoomDocId] = useState<string | null>(null);
  const [addRoomId, setAddRoomId] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, category, status, storage_path, created_at, deal_room_id")
        .eq("uploader_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error("Documents fetch error:", error);
        throw error;
      }
      return data ?? [];
    },
  });

  const { data: dealRooms = [] } = useQuery({
    queryKey: ["founder-deal-rooms-docs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // deal_rooms has no founder_id — go through startup first
      const { data: startup } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id)
        .maybeSingle();
      if (!startup) return [];
      const { data } = await supabase
        .from("deal_rooms")
        .select("id")
        .eq("startup_id", startup.id)
        .limit(20);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        name: startup.company_name ? `${startup.company_name} — Deal Room` : r.id,
      }));
    },
  });

  const { data: startupMedia } = useQuery({
    queryKey: ["startup-media-docs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, product_video_url, pitch_deck_url")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: docs.length };
    for (const d of docs) {
      const key = (d.category as string) || "Other";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [docs]);

  // Pitch deck doc is always shown first
  const pitchDeckDoc = docs.find((d) =>
    (d.category as string) === "Pitch Deck" ||
    /(pitch.?deck|pitch|deck)/i.test(nameFromPath((d.storage_path as string) ?? ""))
  );

  const filtered = activeTab === "All"
    ? [
        ...(pitchDeckDoc ? [pitchDeckDoc] : []),
        ...docs.filter((d) => d.id !== pitchDeckDoc?.id),
      ]
    : docs.filter((d) => ((d.category as string) || "Other") === activeTab);

  const handleDownload = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) {
      toast.error(error?.message || "Unable to create download link.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (deletingId !== id) { setDeletingId(id); return; }
    setDeletingId(null);
    await supabase.storage.from("documents").remove([storagePath]);
    const { error } = await supabase.from("documents").delete().eq("id", id).eq("uploader_id", user!.id);
    if (error) { toast.error(error.message); return; }
    // Remove from cache immediately, then sync
    queryClient.setQueryData(["documents", user?.id], (old: any) =>
      (old ?? []).filter((d: any) => d.id !== id)
    );
    queryClient.invalidateQueries({ queryKey: ["documents", user?.id] });
    toast.success("Document deleted");
  };

  const handleAddToRoom = async () => {
    if (!addRoomDocId || !addRoomId) return;
    setAddingRoom(true);
    const { error } = await supabase
      .from("documents")
      .update({ deal_room_id: addRoomId })
      .eq("id", addRoomDocId);
    if (error) toast.error(error.message);
    else {
      toast.success("Added to deal room");
      queryClient.invalidateQueries({ queryKey: ["documents", user?.id] });
    }
    setAddRoomDocId(null);
    setAddRoomId("");
    setAddingRoom(false);
  };

  const preSelectCategory = (activeTab === "All" ? "Pitch Deck" : activeTab) as DocCategory;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <div className="text-sm text-muted-foreground">
            {docs.length} file{docs.length !== 1 ? "s" : ""} · access controlled
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn("grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors", viewMode === "list" && "bg-accent text-foreground")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors", viewMode === "grid" && "bg-accent text-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
          >
            <Upload className="h-4 w-4" /> Upload document
          </button>
        </div>
      </div>

      {/* Media & Links */}
      <MediaLinksPanel startupMedia={startupMedia ?? null} userId={user!.id} queryClient={queryClient} dealRooms={dealRooms} />

      {/* Category tabs */}
      <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-0.5 border-b border-border/60">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "shrink-0 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab
                ? "border-brand text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
            {tabCounts[tab] !== undefined && (
              <span className={cn("ml-1.5 text-xs", activeTab === tab ? "text-brand" : "text-muted-foreground/60")}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
                <div className="h-9 w-9 rounded-md bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent mx-auto mb-4">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <div className="text-sm font-medium">
              {activeTab === "All" ? "No documents yet" : `No files in ${activeTab}`}
            </div>
            <div className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
              {activeTab === "All"
                ? "Upload your pitch deck and data room documents to share with investors"
                : `Upload your ${activeTab.toLowerCase()} documents here.`}
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
            >
              <Upload className="h-4 w-4" /> Upload now
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((d) => {
              const fname = nameFromPath(d.storage_path as string ?? "");
              return (
                <div key={d.id} className="group rounded-xl border border-border/60 bg-card p-4 hover:shadow-card transition-shadow flex flex-col gap-3">
                  <div className="flex items-center justify-center h-16">
                    <DocIcon fileName={fname} size="lg" />
                  </div>
                  <div>
                    <div className="text-sm font-medium truncate" title={fname}>
                      {fname.length > 24 ? fname.slice(0, 24) + "…" : fname || "Untitled"}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", CAT_COLOR[(d.category as string) || "Other"])}>
                        {(d.category as string) || "Other"}
                      </span>
                      {d.status === "uploaded"
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 flex items-center justify-between">
                    <span>{d.created_at ? formatDistanceToNow(new Date(d.created_at as string), { addSuffix: true }) : "—"}</span>
                    <span>—</span>
                  </div>
                  <div className="flex gap-1 pt-1 border-t border-border/40">
                    <button
                      onClick={() => handleDownload(d.storage_path as string)}
                      title="Download"
                      className="flex-1 grid place-items-center h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {dealRooms.length > 0 && (
                      <button
                        onClick={() => { setAddRoomDocId(d.id as string); setAddRoomId(""); }}
                        title="Add to deal room"
                        className="flex-1 grid place-items-center h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(d.id as string, d.storage_path as string)}
                      title={deletingId === d.id ? "Click again to confirm" : "Delete"}
                      className={cn(
                        "flex-1 grid place-items-center h-7 rounded-md transition-colors",
                        deletingId === d.id
                          ? "text-destructive bg-destructive/10"
                          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Uploaded</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            {filtered.map((d, idx) => {
              const fname = nameFromPath(d.storage_path as string ?? "");
              const isPitchDeck = activeTab === "All" && idx === 0 && !!pitchDeckDoc && d.id === pitchDeckDoc.id;
              return (
                <div
                  key={d.id}
                  className={cn(
                    "grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group",
                    isPitchDeck && "bg-brand/5 border-l-2 border-l-brand"
                  )}
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <DocIcon fileName={fname} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="font-medium truncate" title={fname}>{fname || "Untitled"}</div>
                        {isPitchDeck && (
                          <span className="shrink-0 text-[9px] font-semibold bg-brand/20 text-brand px-1.5 py-0.5 rounded-full">📌 PINNED</span>
                        )}
                      </div>
                      {d.status === "uploaded"
                        ? <span className="text-[10px] text-success flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" />Uploaded</span>
                        : <span className="text-[10px] text-warning flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />Review needed</span>}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", CAT_COLOR[(d.category as string) || "Other"])}>
                      {(d.category as string) || "Other"}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">—</div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {d.created_at ? formatDistanceToNow(new Date(d.created_at as string), { addSuffix: true }) : "—"}
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleDownload(d.storage_path as string)}
                      title="Download"
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {dealRooms.length > 0 && (
                      <button
                        onClick={() => { setAddRoomDocId(d.id as string); setAddRoomId(""); }}
                        title="Add to deal room"
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(d.id as string, d.storage_path as string)}
                      title={deletingId === d.id ? "Click again to confirm delete" : "Delete"}
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                        deletingId === d.id
                          ? "text-destructive"
                          : "text-muted-foreground hover:text-destructive",
                      )}
                    >
                      {deletingId === d.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expected documents for this category */}
      {activeTab !== "All" && (EXPECTED_DOCS[activeTab as DocCategory] ?? []).length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Recommended documents for this category
          </div>
          <div className="rounded-xl border border-dashed border-border/60 divide-y divide-border/40 overflow-hidden">
            {(EXPECTED_DOCS[activeTab as DocCategory] ?? []).map((docName) => (
              <div
                key={docName}
                className="flex items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground">{docName}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">Not uploaded yet</div>
                </div>
                <label className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 text-brand px-3 py-1.5 text-xs cursor-pointer hover:bg-brand/5 transition-colors shrink-0">
                  <Upload className="h-3 w-3" /> Upload
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user?.id) return;
                      const path = `personal/${user.id}/${Date.now()}-${file.name}`;
                      const { error: upErr } = await supabase.storage
                        .from("documents")
                        .upload(path, file);
                      if (upErr) { toast.error("Upload failed"); return; }
                      await supabase.from("documents").insert({
                        uploader_id: user.id,
                        storage_path: path,
                        category: activeTab,
                        file_name: file.name,
                        file_size: file.size,
                        status: "uploaded",
                      });
                      queryClient.invalidateQueries({ queryKey: ["documents", user.id] });
                      toast.success(`${file.name} uploaded`);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          userId={user!.id}
          initialCategory={preSelectCategory}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            queryClient.invalidateQueries({ queryKey: ["documents", user?.id] });
            setShowUpload(false);
          }}
        />
      )}

      {/* Add to deal room modal */}
      {addRoomDocId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
          onClick={() => setAddRoomDocId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-elev p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Add to deal room</h3>
              <button onClick={() => setAddRoomDocId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <select
              value={addRoomId}
              onChange={(e) => setAddRoomId(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 mb-4"
            >
              <option value="">Select deal room…</option>
              {dealRooms.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setAddRoomDocId(null)}
                className="flex-1 rounded-md border border-border/60 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToRoom}
                disabled={!addRoomId || addingRoom}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground py-2 text-sm shadow-glow disabled:opacity-50"
              >
                {addingRoom && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add to room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaLinksPanel({ startupMedia, userId, queryClient, dealRooms }: {
  startupMedia: { id: string; product_video_url?: string | null; pitch_deck_url?: string | null } | null;
  userId: string;
  queryClient: any;
  dealRooms: any[];
}) {
  const [videoUrl, setVideoUrl] = useState(startupMedia?.product_video_url ?? "");
  const [savingVideo, setSavingVideo] = useState(false);
  const [uploadingDeck, setUploadingDeck] = useState(false);
  const deckRef = useRef<HTMLInputElement>(null);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [newLinkDealRoomId, setNewLinkDealRoomId] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const { data: links = [] } = useQuery({
    queryKey: ["founder-links", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_links")
        .select("id, name, url, deal_room_id, created_at")
        .eq("uploader_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    setAddingLink(true);
    try {
      const { error } = await supabase.from("deal_room_links").insert({
        uploader_id: userId,
        name: linkName.trim(),
        url: linkUrl.trim(),
        ...(newLinkDealRoomId ? { deal_room_id: newLinkDealRoomId } : {}),
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["founder-links", userId] });
      setShowAddLink(false);
      setLinkName("");
      setLinkUrl("");
      setNewLinkDealRoomId("");
      toast.success("Link added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add link");
    } finally {
      setAddingLink(false);
    }
  };

  const removeLink = async (id: string) => {
    const { error } = await supabase.from("deal_room_links").delete().eq("id", id).eq("uploader_id", userId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["founder-links", userId] });
    toast.success("Link removed");
  };

  const saveVideoUrl = async () => {
    if (!startupMedia?.id) { toast.error("Set up your Company Profile first"); return; }
    setSavingVideo(true);
    try {
      const { error } = await supabase.from("startups")
        .update({ product_video_url: videoUrl || null })
        .eq("id", startupMedia.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["startup-media-docs", userId] });
      toast.success("Video link saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingVideo(false);
    }
  };

  const uploadDeck = async (file: File) => {
    if (!userId) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large — max 50MB"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf","pptx","ppt","docx","doc","xlsx","xls","csv"].includes(ext)) {
      toast.error("Supported: PDF, PPTX, DOCX, XLSX, CSV"); return;
    }
    setUploadingDeck(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `personal/${userId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("documents").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("documents").insert({
        uploader_id: userId,
        category: "Pitch Deck",
        status: "uploaded",
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        deal_room_id: null,
      });
      if (dbErr) throw dbErr;
      queryClient.invalidateQueries({ queryKey: ["documents", userId] });
      queryClient.invalidateQueries({ queryKey: ["startup-media-docs", userId] });
      toast.success(`${file.name} uploaded as Pitch Deck`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingDeck(false);
    }
  };

  return (
    <>
    <div className="mt-6 rounded-xl border border-border/60 bg-card p-5">
      <div className="text-sm font-semibold mb-4">Media &amp; Links</div>
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Product Video URL — with explicit Save button */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Product Video URL
            <span className="font-normal ml-1 opacity-60">(YouTube / Loom / Vimeo)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            />
            <button
              onClick={saveVideoUrl}
              disabled={savingVideo}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow disabled:opacity-50 shrink-0"
            >
              {savingVideo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </button>
          </div>
          {startupMedia?.product_video_url && (
            <a href={startupMedia.product_video_url} target="_blank" rel="noopener noreferrer"
              className="mt-1.5 text-[11px] text-brand hover:underline inline-flex items-center gap-1">
              ↗ Currently saved: {startupMedia.product_video_url.slice(0, 40)}{startupMedia.product_video_url.length > 40 ? "…" : ""}
            </a>
          )}
        </div>

        {/* Pitch Deck — file upload (PDF/PPTX) */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Pitch Deck
            <span className="font-normal ml-1 opacity-60">(PDF or PPTX — replaces DocSend link)</span>
          </label>
          <button
            onClick={() => deckRef.current?.click()}
            disabled={uploadingDeck}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-brand/40 bg-brand/5 text-brand px-4 py-2.5 text-sm font-medium hover:bg-brand/10 transition-colors disabled:opacity-50"
          >
            {uploadingDeck
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              : <><Upload className="h-4 w-4" /> Upload Pitch Deck (PDF / PPTX)</>}
          </button>
          <input
            ref={deckRef}
            type="file"
            className="hidden"
            accept=".pdf,.pptx,.ppt"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDeck(f); e.target.value = ""; }}
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Investors can preview this directly in the deal room. Pinned to the top of all document views.
          </p>
        </div>
      </div>

      {/* Saved links */}
      <div className="mt-5 pt-5 border-t border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" /> Saved Links
            {(links as any[]).length > 0 && (
              <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-full">{(links as any[]).length}</span>
            )}
          </div>
          <button
            onClick={() => setShowAddLink(true)}
            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Plus className="h-3 w-3" /> Add link
          </button>
        </div>
        {(links as any[]).length === 0 ? (
          <p className="text-xs text-muted-foreground/60 italic">No links saved yet. Add deal room links, demo URLs, or resources.</p>
        ) : (
          <div className="space-y-2">
            {(links as any[]).map((link: any) => (
              <div key={link.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                <ExternalLink className="h-3.5 w-3.5 text-brand shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{link.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{link.url}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Open link">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => removeLink(link.id)}
                    className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove link">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Add link modal */}
    {showAddLink && (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
        onClick={() => setShowAddLink(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-elev p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Add link</h3>
            <button onClick={() => setShowAddLink(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Link name *</label>
              <input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="e.g. Demo video, Product Hunt, Deck"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">URL *</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            {dealRooms.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Deal room (optional)</label>
                <select
                  value={newLinkDealRoomId}
                  onChange={(e) => setNewLinkDealRoomId(e.target.value)}
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                >
                  <option value="">None</option>
                  {dealRooms.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setShowAddLink(false)}
              className="flex-1 rounded-md border border-border/60 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={addLink}
              disabled={!linkName.trim() || !linkUrl.trim() || addingLink}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground py-2 text-sm shadow-glow disabled:opacity-50"
            >
              {addingLink && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add link
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function UploadModal({
  userId,
  initialCategory,
  onClose,
  onUploaded,
}: {
  userId: string;
  initialCategory: DocCategory;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DocCategory>(initialCategory);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `personal/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase.from("documents").insert({
        uploader_id: userId,
        category,
        status: "uploaded",
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        deal_room_id: null,
      });
      if (insertErr) throw insertErr;
      toast.success("Document uploaded");
      onUploaded();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="text-base font-semibold">Upload document</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocCategory)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* File input */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                "rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
                file
                  ? "border-brand/50 bg-brand/5"
                  : "border-border/60 bg-muted/20 hover:border-brand/40 hover:bg-accent/20",
              )}
            >
              {file ? (
                <div>
                  <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {Math.round(file.size / 1024)} KB
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-2 text-xs text-muted-foreground hover:text-destructive underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <div className="text-sm font-medium">Click to select file</div>
                  <div className="text-xs text-muted-foreground mt-0.5">All file types · max 50MB</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
          </div>

        </div>

        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> Upload</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}