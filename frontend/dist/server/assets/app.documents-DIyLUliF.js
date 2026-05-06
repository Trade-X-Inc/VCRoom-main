import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { D as Dropzone, E as Eye } from "./Dropzone-B6seOivR.js";
import { d as useI18n, u as useAuth, c as useQueryClient, s as supabase, t as toast } from "./router-DUHyCcO4.js";
import { u as useQuery } from "./useQuery-CqUX3-7B.js";
import { U as Upload } from "./upload-CeiGIE-p.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { F as FileText } from "./file-text-D5pqWYYG.js";
import { f as formatDistanceToNow } from "./formatDistanceToNow-DZsPIRrC.js";
import { C as CircleCheck } from "./circle-check-O5LqB_cu.js";
import { T as TriangleAlert } from "./triangle-alert-11Lnv70t.js";
import { D as Download } from "./download-DanhJleR.js";
import { T as Trash2 } from "./trash-2-CcYLBnzw.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./utils-Bz4m9VPB.js";
import "./x-DEg4i2kq.js";
import "./index-DYJmQpRE.js";
const __iconNode = [
  [
    "path",
    {
      d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      key: "usdka0"
    }
  ]
];
const FolderOpen = createLucideIcon("folder-open", __iconNode);
const CATEGORIES = ["Pitch", "Financial", "Legal", "Technical", "Market", "Other"];
function Documents() {
  const {
    t
  } = useI18n();
  const {
    user
  } = useAuth();
  const [showUpload, setShowUpload] = reactExports.useState(false);
  const [selectedCategory, setSelectedCategory] = reactExports.useState("Pitch");
  const [activeFolder, setActiveFolder] = reactExports.useState("All");
  const [deletingId, setDeletingId] = reactExports.useState(null);
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
  const folders = reactExports.useMemo(() => {
    const counts = docs.reduce((acc, d) => {
      const key = d.category || "Other";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return [["All", docs.length], ...Object.entries(counts)];
  }, [docs]);
  const filtered = activeFolder === "All" ? docs : docs.filter((d) => (d.category || "Other") === activeFolder);
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: t("app.documents") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-muted-foreground", children: [
          docs.length,
          " files · access controlled"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowUpload((v) => !v), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4" }),
        " ",
        t("docs.upload")
      ] })
    ] }),
    showUpload && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Category:" }),
        CATEGORIES.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSelectedCategory(cat), className: `rounded-full px-3 py-1 text-xs border transition-colors ${selectedCategory === cat ? "bg-brand text-brand-foreground border-brand" : "border-border/60 text-muted-foreground hover:bg-accent"}`, children: cat }, cat))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Dropzone, { title: t("docs.dragOr"), hint: t("docs.maxSize"), onFiles })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid lg:grid-cols-[220px_1fr] gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "space-y-1", children: folders.map(([n, c], i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setActiveFolder(n), className: `w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${activeFolder === n ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "h-4 w-4" }),
          " ",
          n
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: c })
      ] }, n)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-5", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: "Category" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: "Uploaded" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: "Views" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-1 text-right", children: "Status" })
        ] }),
        isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0", children: [1, 2, 3].map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-5 flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 rounded-md bg-muted animate-pulse" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-40 rounded bg-muted animate-pulse" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-7 h-4 w-24 rounded bg-muted/60 animate-pulse" })
        ] }, n)) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-16 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-8 w-8 text-muted-foreground/30 mx-auto mb-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: activeFolder === "All" ? "No documents yet — upload your first file." : `No files in ${activeFolder}.` })
        ] }) : filtered.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-5 flex items-center gap-3 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: d.file_name || "Untitled" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
                Math.max(1, Math.round((Number(d.file_size) || 0) / 1024)),
                " KB"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground", children: d.category || "Other" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 text-xs text-muted-foreground", children: d.created_at ? formatDistanceToNow(new Date(d.created_at), {
            addSuffix: true
          }) : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 text-muted-foreground inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-3.5 w-3.5" }),
            " —"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-1 flex items-center justify-end gap-1.5", children: [
            d.status === "uploaded" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5 text-success", title: "Uploaded" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5 text-warning", title: "Review needed" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleDownload(d.storage_path), title: "Download", className: "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleDelete(d.id, d.storage_path), title: deletingId === d.id ? "Click again to confirm delete" : "Delete", className: `opacity-0 group-hover:opacity-100 transition-opacity ${deletingId === d.id ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }) })
          ] })
        ] }, d.id))
      ] })
    ] })
  ] });
}
export {
  Documents as component
};
