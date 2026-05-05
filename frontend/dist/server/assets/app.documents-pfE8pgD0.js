import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Dz_cryAq.js";
import { D as Dropzone, E as Eye } from "./Dropzone-DoNGu_KC.js";
import { d as useI18n, u as useAuth, c as useQueryClient, s as supabase } from "./router-DDxKVwv8.js";
import { u as useQuery } from "./useQuery-BKQDWNmV.js";
import { U as Upload } from "./upload-BF_6UqKn.js";
import { c as createLucideIcon } from "./createLucideIcon-BWyo4Tuv.js";
import { F as FileText } from "./file-text-2-PMncWE.js";
import { C as CircleCheck } from "./circle-check-CwHIy6AR.js";
import { T as TriangleAlert } from "./triangle-alert-BRF_D58Q.js";
import { D as Download } from "./download-Dg_uv4rB.js";
import { E as Ellipsis } from "./ellipsis-BbYZpEyU.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./utils-Bz4m9VPB.js";
import "./x-DBXYvj1Z.js";
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
function Documents() {
  const {
    t
  } = useI18n();
  const {
    user
  } = useAuth();
  const [showUpload, setShowUpload] = reactExports.useState(false);
  const [uploadError, setUploadError] = reactExports.useState("");
  const queryClient = useQueryClient();
  const {
    data: docs = []
  } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("documents").select("id, category, status, storage_path, file_name, file_size").order("created_at", {
        ascending: false
      }).limit(100);
      if (error) throw error;
      return data ?? [];
    }
  });
  const folders = reactExports.useMemo(() => {
    const counts = docs.reduce((acc, d) => {
      const key = d.category || "Uncategorized";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return [["All", docs.length], ...Object.entries(counts)];
  }, [docs]);
  const onFiles = async (incoming) => {
    if (!user) return;
    setUploadError("");
    const {
      data: room
    } = await supabase.from("deal_rooms").select("id").limit(1).maybeSingle();
    if (!room?.id) {
      setUploadError("Create a deal room before uploading documents.");
      return;
    }
    for (const f of incoming) {
      const file = f.rawFile;
      if (!file) continue;
      const path = `${room.id}/${Date.now()}-${file.name}`;
      const upload = await supabase.storage.from("documents").upload(path, file, {
        upsert: true
      });
      if (upload.error) {
        setUploadError(upload.error.message);
        return;
      }
      const insert = await supabase.from("documents").insert({
        deal_room_id: room.id,
        uploader_id: user.id,
        category: "General",
        status: "uploaded",
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream"
      });
      if (insert.error) {
        setUploadError(insert.error.message);
        return;
      }
    }
    await queryClient.invalidateQueries({
      queryKey: ["documents"]
    });
  };
  const handleDownload = async (storagePath) => {
    const {
      data,
      error
    } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) {
      setUploadError(error?.message || "Unable to create download URL.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: t("app.documents") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-muted-foreground", children: [
          docs.length,
          " files · watermarked · access controlled"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowUpload((v) => !v), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4" }),
        " ",
        t("docs.upload")
      ] })
    ] }),
    showUpload && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Dropzone, { title: t("docs.dragOr"), hint: t("docs.maxSize"), onFiles }) }),
    uploadError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-xs text-destructive", children: uploadError }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid lg:grid-cols-[220px_1fr] gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "space-y-1", children: folders.map(([n, c], i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: `w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${i === 0 ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "h-4 w-4" }),
          " ",
          n
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: c })
      ] }, n)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-6", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: "Category" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: "Views" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 text-right", children: "Status" })
        ] }),
        docs.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-6 flex items-center gap-3 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: d.file_name || "Untitled" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
                Math.max(1, Math.round((Number(d.file_size) || 0) / 1024)),
                " KB"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 text-muted-foreground", children: d.category || "General" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 text-muted-foreground inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-3.5 w-3.5" }),
            " -"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 flex items-center justify-end gap-2", children: [
            d.status === "uploaded" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-success text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5" }),
              " Approved"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-warning text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5" }),
              " Review"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleDownload(d.storage_path), className: "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "h-4 w-4" }) })
          ] })
        ] }, d.id))
      ] })
    ] })
  ] });
}
export {
  Documents as component
};
