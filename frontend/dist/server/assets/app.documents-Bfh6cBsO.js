import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { List, LayoutGrid, Upload, FileText, CheckCircle2, AlertTriangle, Download, Plus, Trash2, Loader2, X, Table2, Image, Video, File } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { u as useAuth, s as supabase } from "./router-ZDeKAwyq.js";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { c as cn } from "./utils-H80jjgLf.js";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "clsx";
import "tailwind-merge";
const CATEGORIES = ["Pitch Deck", "Financials", "Legal", "Market Research", "Team", "Product", "Other"];
const TAB_LABELS = ["All", ...CATEGORIES];
const CAT_COLOR = {
  "Pitch Deck": "bg-brand/10 text-brand",
  "Financials": "bg-success/10 text-success",
  "Legal": "bg-destructive/10 text-destructive",
  "Market Research": "bg-violet/10 text-violet",
  "Team": "bg-warning/10 text-warning",
  "Product": "bg-brand/15 text-brand",
  "Other": "bg-muted text-muted-foreground"
};
function getFileIconProps(fileName) {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return {
    Icon: FileText,
    colorCls: "text-red-500"
  };
  if (["pptx", "ppt", "key"].includes(ext)) return {
    Icon: FileText,
    colorCls: "text-orange-500"
  };
  if (["xlsx", "xls", "csv"].includes(ext)) return {
    Icon: Table2,
    colorCls: "text-green-600"
  };
  if (["doc", "docx"].includes(ext)) return {
    Icon: FileText,
    colorCls: "text-blue-500"
  };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return {
    Icon: Image,
    colorCls: "text-purple-500"
  };
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return {
    Icon: Video,
    colorCls: "text-pink-500"
  };
  return {
    Icon: File,
    colorCls: "text-muted-foreground"
  };
}
function DocIcon({
  fileName,
  size = "md"
}) {
  const {
    Icon,
    colorCls
  } = getFileIconProps(fileName);
  const cls = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  return /* @__PURE__ */ jsx(Icon, { className: cn(cls, colorCls, "shrink-0") });
}
function Documents() {
  const {
    user
  } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [viewMode, setViewMode] = useState("list");
  const [deletingId, setDeletingId] = useState(null);
  const [addRoomDocId, setAddRoomDocId] = useState(null);
  const [addRoomId, setAddRoomId] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);
  const queryClient = useQueryClient();
  const {
    data: docs = [],
    isLoading
  } = useQuery({
    queryKey: ["documents", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("documents").select("id, category, status, storage_path, file_name, file_size, created_at, deal_room_id").eq("uploader_id", user.id).order("created_at", {
        ascending: false
      }).limit(100);
      if (error) throw error;
      return data ?? [];
    }
  });
  const {
    data: dealRooms = []
  } = useQuery({
    queryKey: ["founder-deal-rooms-docs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_rooms").select("id, startups(company_name)").eq("founder_id", user.id).limit(20);
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.startups?.company_name ?? r.id
      }));
    }
  });
  const tabCounts = useMemo(() => {
    const counts = {
      All: docs.length
    };
    for (const d of docs) {
      const key = d.category || "Other";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [docs]);
  const filtered = activeTab === "All" ? docs : docs.filter((d) => (d.category || "Other") === activeTab);
  const handleDownload = async (storagePath) => {
    const {
      data,
      error
    } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) {
      toast.error(error?.message || "Unable to create download link.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const handleDelete = async (id, storagePath) => {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    setDeletingId(null);
    await supabase.storage.from("documents").remove([storagePath]);
    const {
      error
    } = await supabase.from("documents").delete().eq("id", id).eq("uploader_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({
      queryKey: ["documents", user?.id]
    });
    toast.success("Document deleted");
  };
  const handleAddToRoom = async () => {
    if (!addRoomDocId || !addRoomId) return;
    setAddingRoom(true);
    const {
      error
    } = await supabase.from("documents").update({
      deal_room_id: addRoomId
    }).eq("id", addRoomDocId);
    if (error) toast.error(error.message);
    else {
      toast.success("Added to deal room");
      queryClient.invalidateQueries({
        queryKey: ["documents", user?.id]
      });
    }
    setAddRoomDocId(null);
    setAddRoomId("");
    setAddingRoom(false);
  };
  const preSelectCategory = activeTab === "All" ? "Pitch Deck" : activeTab;
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Documents" }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
          docs.length,
          " file",
          docs.length !== 1 ? "s" : "",
          " · access controlled"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 rounded-md border border-border/60 p-0.5", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setViewMode("list"), className: cn("grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors", viewMode === "list" && "bg-accent text-foreground"), children: /* @__PURE__ */ jsx(List, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => setViewMode("grid"), className: cn("grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors", viewMode === "grid" && "bg-accent text-foreground"), children: /* @__PURE__ */ jsx(LayoutGrid, { className: "h-3.5 w-3.5" }) })
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setShowUpload(true), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
          " Upload document"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 flex items-center gap-1 overflow-x-auto pb-0.5 border-b border-border/60", children: TAB_LABELS.map((tab) => /* @__PURE__ */ jsxs("button", { onClick: () => setActiveTab(tab), className: cn("shrink-0 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap", activeTab === tab ? "border-brand text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"), children: [
      tab,
      tabCounts[tab] !== void 0 && /* @__PURE__ */ jsx("span", { className: cn("ml-1.5 text-xs", activeTab === tab ? "text-brand" : "text-muted-foreground/60"), children: tabCounts[tab] })
    ] }, tab)) }),
    /* @__PURE__ */ jsx("div", { className: "mt-4", children: isLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-2", children: [1, 2, 3].map((n) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "h-9 w-9 rounded-md bg-muted animate-pulse shrink-0" }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-1.5", children: [
        /* @__PURE__ */ jsx("div", { className: "h-4 w-48 rounded bg-muted animate-pulse" }),
        /* @__PURE__ */ jsx("div", { className: "h-3 w-24 rounded bg-muted/60 animate-pulse" })
      ] })
    ] }, n)) }) : filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-dashed border-border/60 bg-card py-16 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-14 w-14 place-items-center rounded-2xl bg-accent mx-auto mb-4", children: /* @__PURE__ */ jsx(FileText, { className: "h-7 w-7 text-muted-foreground/50" }) }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: activeTab === "All" ? "No documents yet" : `No files in ${activeTab}` }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1 mb-4 max-w-sm mx-auto", children: activeTab === "All" ? "Upload your pitch deck and data room documents to share with investors" : `Upload your ${activeTab.toLowerCase()} documents here.` }),
      /* @__PURE__ */ jsxs("button", { onClick: () => setShowUpload(true), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
        " Upload now"
      ] })
    ] }) : viewMode === "grid" ? /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", children: filtered.map((d) => {
      const fname = d.file_name || "";
      return /* @__PURE__ */ jsxs("div", { className: "group rounded-xl border border-border/60 bg-card p-4 hover:shadow-card transition-shadow flex flex-col gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-16", children: /* @__PURE__ */ jsx(DocIcon, { fileName: fname, size: "lg" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", title: fname, children: fname.length > 24 ? fname.slice(0, 24) + "…" : fname || "Untitled" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1.5 flex items-center justify-between gap-1", children: [
            /* @__PURE__ */ jsx("span", { className: cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", CAT_COLOR[d.category || "Other"]), children: d.category || "Other" }),
            d.status === "uploaded" ? /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3.5 w-3.5 text-success shrink-0" }) : /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3.5 w-3.5 text-warning shrink-0" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-muted-foreground/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("span", { children: d.created_at ? formatDistanceToNow(new Date(d.created_at), {
            addSuffix: true
          }) : "—" }),
          /* @__PURE__ */ jsxs("span", { children: [
            Math.max(1, Math.round((Number(d.file_size) || 0) / 1024)),
            " KB"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-1 pt-1 border-t border-border/40", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => handleDownload(d.storage_path), title: "Download", className: "flex-1 grid place-items-center h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors", children: /* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5" }) }),
          dealRooms.length > 0 && /* @__PURE__ */ jsx("button", { onClick: () => {
            setAddRoomDocId(d.id);
            setAddRoomId("");
          }, title: "Add to deal room", className: "flex-1 grid place-items-center h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors", children: /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => handleDelete(d.id, d.storage_path), title: deletingId === d.id ? "Click again to confirm" : "Delete", className: cn("flex-1 grid place-items-center h-7 rounded-md transition-colors", deletingId === d.id ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"), children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
        ] })
      ] }, d.id);
    }) }) : /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
        /* @__PURE__ */ jsx("div", { className: "col-span-5", children: "Name" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Category" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Size" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Uploaded" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-1 text-right", children: "Actions" })
      ] }),
      filtered.map((d) => {
        const fname = d.file_name || "";
        return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group", children: [
          /* @__PURE__ */ jsxs("div", { className: "col-span-5 flex items-center gap-3 min-w-0", children: [
            /* @__PURE__ */ jsx(DocIcon, { fileName: fname, size: "sm" }),
            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "font-medium truncate", title: fname, children: fname || "Untitled" }),
              d.status === "uploaded" ? /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-success flex items-center gap-0.5", children: [
                /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3 w-3" }),
                "Uploaded"
              ] }) : /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-warning flex items-center gap-0.5", children: [
                /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3 w-3" }),
                "Review needed"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsx("span", { className: cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", CAT_COLOR[d.category || "Other"]), children: d.category || "Other" }) }),
          /* @__PURE__ */ jsxs("div", { className: "col-span-2 text-xs text-muted-foreground", children: [
            Math.max(1, Math.round((Number(d.file_size) || 0) / 1024)),
            " KB"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "col-span-2 text-xs text-muted-foreground", children: d.created_at ? formatDistanceToNow(new Date(d.created_at), {
            addSuffix: true
          }) : "—" }),
          /* @__PURE__ */ jsxs("div", { className: "col-span-1 flex items-center justify-end gap-1", children: [
            /* @__PURE__ */ jsx("button", { onClick: () => handleDownload(d.storage_path), title: "Download", className: "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }) }),
            dealRooms.length > 0 && /* @__PURE__ */ jsx("button", { onClick: () => {
              setAddRoomDocId(d.id);
              setAddRoomId("");
            }, title: "Add to deal room", className: "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsx("button", { onClick: () => handleDelete(d.id, d.storage_path), title: deletingId === d.id ? "Click again to confirm delete" : "Delete", className: cn("grid h-7 w-7 place-items-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity", deletingId === d.id ? "text-destructive" : "text-muted-foreground hover:text-destructive"), children: deletingId === d.id ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
          ] })
        ] }, d.id);
      })
    ] }) }),
    showUpload && /* @__PURE__ */ jsx(UploadModal, { userId: user.id, initialCategory: preSelectCategory, onClose: () => setShowUpload(false), onUploaded: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents", user?.id]
      });
      setShowUpload(false);
    } }),
    addRoomDocId && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4", onClick: () => setAddRoomDocId(null), children: /* @__PURE__ */ jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-elev p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: "Add to deal room" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setAddRoomDocId(null), className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxs("select", { value: addRoomId, onChange: (e) => setAddRoomId(e.target.value), className: "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 mb-4", children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "Select deal room…" }),
        dealRooms.map((r) => /* @__PURE__ */ jsx("option", { value: r.id, children: r.name }, r.id))
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setAddRoomDocId(null), className: "flex-1 rounded-md border border-border/60 py-2 text-sm hover:bg-accent", children: "Cancel" }),
        /* @__PURE__ */ jsxs("button", { onClick: handleAddToRoom, disabled: !addRoomId || addingRoom, className: "flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground py-2 text-sm shadow-glow disabled:opacity-50", children: [
          addingRoom && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
          "Add to room"
        ] })
      ] })
    ] }) })
  ] });
}
function UploadModal({
  userId,
  initialCategory,
  onClose,
  onUploaded
}) {
  const fileRef = useRef(null);
  const [category, setCategory] = useState(initialCategory);
  const [file, setFile] = useState(null);
  const [docName, setDocName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }
    setFile(f);
    if (!docName) setDocName(f.name);
  };
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `personal/${userId}/${Date.now()}-${file.name}`;
      const {
        error: uploadErr
      } = await supabase.storage.from("documents").upload(path, file, {
        upsert: true
      });
      if (uploadErr) throw uploadErr;
      const {
        error: insertErr
      } = await supabase.from("documents").insert({
        uploader_id: userId,
        category,
        status: "uploaded",
        storage_path: path,
        file_name: docName || file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        description: description || null,
        deal_room_id: null
      });
      if (insertErr) throw insertErr;
      toast.success("Document uploaded");
      onUploaded();
    } catch (e) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-border/60 flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-base font-semibold", children: "Upload document" }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "px-6 py-5 space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-1.5", children: "Category *" }),
        /* @__PURE__ */ jsx("select", { value: category, onChange: (e) => setCategory(e.target.value), className: "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: CATEGORIES.map((c) => /* @__PURE__ */ jsx("option", { children: c }, c)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-1.5", children: "File *" }),
        /* @__PURE__ */ jsx("div", { onClick: () => fileRef.current?.click(), className: cn("rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors", file ? "border-brand/50 bg-brand/5" : "border-border/60 bg-muted/20 hover:border-brand/40 hover:bg-accent/20"), children: file ? /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(CheckCircle2, { className: "h-6 w-6 text-success mx-auto mb-2" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: file.name }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground mt-0.5", children: [
            Math.round(file.size / 1024),
            " KB"
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: (e) => {
            e.stopPropagation();
            setFile(null);
            setDocName("");
          }, className: "mt-2 text-xs text-muted-foreground hover:text-destructive underline", children: "Remove" })
        ] }) : /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Upload, { className: "h-6 w-6 text-muted-foreground mx-auto mb-2" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "Click to select file" }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: "All file types · max 50MB" })
        ] }) }),
        /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", className: "hidden", onChange: handleFileChange })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-1.5", children: "Document name" }),
        /* @__PURE__ */ jsx("input", { type: "text", value: docName, onChange: (e) => setDocName(e.target.value), placeholder: "Auto-filled from filename", className: "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-1.5", children: "Description (optional)" }),
        /* @__PURE__ */ jsx("input", { type: "text", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Brief description of this document", className: "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2", children: [
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { onClick: handleUpload, disabled: !file || uploading, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50", children: uploading ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
        " Uploading…"
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Upload, { className: "h-3.5 w-3.5" }),
        " Upload"
      ] }) })
    ] })
  ] }) });
}
export {
  Documents as component
};
