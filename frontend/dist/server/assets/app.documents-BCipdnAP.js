import { jsxs, jsx } from "react/jsx-runtime";
import { List, LayoutGrid, Upload, FileText, Download, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { D as Dropzone } from "./Dropzone-C6ZyEcbf.js";
import { a as useI18n, u as useAuth, s as supabase } from "./router-AGHVmeo2.js";
import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { c as cn } from "./utils-H80jjgLf.js";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "clsx";
import "tailwind-merge";
const CATEGORIES = ["Pitch Deck", "Financials", "Legal", "Market Research", "Team", "Other"];
function fileInfo(fileName) {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return {
    label: "PDF",
    bg: "bg-red-500/10",
    text: "text-red-500"
  };
  if (["pptx", "ppt", "key"].includes(ext)) return {
    label: "PPT",
    bg: "bg-orange-500/10",
    text: "text-orange-500"
  };
  if (["xlsx", "xls", "csv"].includes(ext)) return {
    label: "XLS",
    bg: "bg-green-600/10",
    text: "text-green-600"
  };
  if (["doc", "docx"].includes(ext)) return {
    label: "DOC",
    bg: "bg-blue-500/10",
    text: "text-blue-500"
  };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return {
    label: "IMG",
    bg: "bg-purple-500/10",
    text: "text-purple-500"
  };
  if (["zip", "tar", "gz"].includes(ext)) return {
    label: "ZIP",
    bg: "bg-yellow-600/10",
    text: "text-yellow-600"
  };
  return {
    label: ext.toUpperCase() || "FILE",
    bg: "bg-muted",
    text: "text-muted-foreground"
  };
}
function FileIcon({
  fileName,
  size = "md"
}) {
  const {
    label,
    bg,
    text
  } = fileInfo(fileName);
  const cls = size === "sm" ? "h-8 w-8 text-[9px]" : size === "lg" ? "h-14 w-14 text-xs" : "h-9 w-9 text-[10px]";
  return /* @__PURE__ */ jsx("div", { className: cn("grid place-items-center rounded-md font-bold shrink-0", cls, bg, text), children: label });
}
const TAB_LABELS = ["All", ...CATEGORIES];
function Documents() {
  const {
    t
  } = useI18n();
  const {
    user
  } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Pitch Deck");
  const [activeTab, setActiveTab] = useState("All");
  const [deletingId, setDeletingId] = useState(null);
  const [viewMode, setViewMode] = useState("list");
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
      } = await supabase.from("documents").select("id, category, status, storage_path, file_name, file_size, created_at").eq("uploader_id", user.id).order("created_at", {
        ascending: false
      }).limit(100);
      if (error) throw error;
      return data ?? [];
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
  const onFiles = async (incoming) => {
    if (!user) return;
    for (const f of incoming) {
      const file = f.rawFile;
      if (!file) continue;
      const path = `personal/${user.id}/${Date.now()}-${file.name}`;
      const {
        error: uploadErr
      } = await supabase.storage.from("documents").upload(path, file, {
        upsert: true
      });
      if (uploadErr) {
        toast.error(uploadErr.message);
        return;
      }
      const {
        error: insertErr
      } = await supabase.from("documents").insert({
        uploader_id: user.id,
        category: selectedCategory,
        status: "uploaded",
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        deal_room_id: null
      });
      if (insertErr) {
        toast.error(insertErr.message);
        return;
      }
    }
    queryClient.invalidateQueries({
      queryKey: ["documents", user.id]
    });
    toast.success("Document uploaded");
    setShowUpload(false);
  };
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
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: t("app.documents") }),
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
        /* @__PURE__ */ jsxs("button", { onClick: () => setShowUpload((v) => !v), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
          " ",
          t("docs.upload")
        ] })
      ] })
    ] }),
    showUpload && /* @__PURE__ */ jsxs("div", { className: "mt-5 rounded-xl border border-border/60 bg-card p-5 shadow-card space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "Category:" }),
        CATEGORIES.map((cat) => /* @__PURE__ */ jsx("button", { onClick: () => setSelectedCategory(cat), className: cn("rounded-full px-3 py-1 text-xs border transition-colors", selectedCategory === cat ? "bg-brand text-brand-foreground border-brand" : "border-border/60 text-muted-foreground hover:bg-accent"), children: cat }, cat))
      ] }),
      /* @__PURE__ */ jsx(Dropzone, { title: t("docs.dragOr"), hint: t("docs.maxSize"), onFiles })
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
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1 mb-4", children: activeTab === "All" ? "Upload pitch decks, financials, legal docs and more." : `Upload your ${activeTab.toLowerCase()} documents here.` }),
      /* @__PURE__ */ jsxs("button", { onClick: () => {
        setSelectedCategory(activeTab === "All" ? "Pitch Deck" : activeTab);
        setShowUpload(true);
      }, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
        " Upload now"
      ] })
    ] }) : viewMode === "grid" ? /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", children: filtered.map((d) => /* @__PURE__ */ jsxs("div", { className: "group rounded-xl border border-border/60 bg-card p-4 hover:shadow-card transition-shadow", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-3", children: [
        /* @__PURE__ */ jsx(FileIcon, { fileName: d.file_name || "", size: "lg" }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => handleDownload(d.storage_path), className: "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => handleDelete(d.id, d.storage_path), title: deletingId === d.id ? "Click again to confirm" : "Delete", className: cn("grid h-7 w-7 place-items-center rounded-md transition-colors", deletingId === d.id ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"), children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", title: d.file_name || "Untitled", children: d.file_name || "Untitled" }),
      /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
          Math.max(1, Math.round((Number(d.file_size) || 0) / 1024)),
          " KB"
        ] }),
        d.status === "uploaded" ? /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3.5 w-3.5 text-success" }) : /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3.5 w-3.5 text-warning" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-[10px] text-muted-foreground/60", children: d.created_at ? formatDistanceToNow(new Date(d.created_at), {
        addSuffix: true
      }) : "—" })
    ] }, d.id)) }) : /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
        /* @__PURE__ */ jsx("div", { className: "col-span-5", children: "Name" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Category" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Size" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Uploaded" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-1 text-right", children: "Actions" })
      ] }),
      filtered.map((d) => /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group", children: [
        /* @__PURE__ */ jsxs("div", { className: "col-span-5 flex items-center gap-3 min-w-0", children: [
          /* @__PURE__ */ jsx(FileIcon, { fileName: d.file_name || "", size: "sm" }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium truncate", title: d.file_name || "Untitled", children: d.file_name || "Untitled" }),
            d.status === "uploaded" ? /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-success flex items-center gap-0.5", children: [
              /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3 w-3" }),
              "Uploaded"
            ] }) : /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-warning flex items-center gap-0.5", children: [
              /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3 w-3" }),
              "Review needed"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsx("span", { className: "rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground", children: d.category || "Other" }) }),
        /* @__PURE__ */ jsxs("div", { className: "col-span-2 text-xs text-muted-foreground", children: [
          Math.max(1, Math.round((Number(d.file_size) || 0) / 1024)),
          " KB"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2 text-xs text-muted-foreground", children: d.created_at ? formatDistanceToNow(new Date(d.created_at), {
          addSuffix: true
        }) : "—" }),
        /* @__PURE__ */ jsxs("div", { className: "col-span-1 flex items-center justify-end gap-1", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => handleDownload(d.storage_path), title: "Download", className: "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => handleDelete(d.id, d.storage_path), title: deletingId === d.id ? "Click again to confirm delete" : "Delete", className: cn("grid h-7 w-7 place-items-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity", deletingId === d.id ? "text-destructive" : "text-muted-foreground hover:text-destructive"), children: deletingId === d.id ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
        ] })
      ] }, d.id))
    ] }) })
  ] });
}
export {
  Documents as component
};
