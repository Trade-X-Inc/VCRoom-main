import { c as createLucideIcon } from "./createLucideIcon-amrEyyxI.js";
import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-4qtpAlX3.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { u as useAuth, x as uploadDocument, s as supabase } from "./router-DliDWiY8.js";
import { U as Upload } from "./upload-DCqN5M2q.js";
import { F as FileText } from "./file-text-AooM6BWu.js";
import { C as CircleCheck } from "./circle-check-DyneNPE7.js";
import { X } from "./x-BlXb_k0x.js";
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
];
const CircleX = createLucideIcon("circle-x", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Eye = createLucideIcon("eye", __iconNode);
function Dropzone({
  onFiles,
  title = "Drag & drop or click to upload",
  hint = "Up to 50 MB · PDF, DOCX, XLSX, PNG",
  dealRoomId,
  onUploadComplete
}) {
  const [isOver, setIsOver] = reactExports.useState(false);
  const [files, setFiles] = reactExports.useState([]);
  const inputRef = reactExports.useRef(null);
  const { user } = useAuth();
  const handleFiles = (list) => {
    if (!list || list.length === 0) return;
    const next = Array.from(list).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type || "application/octet-stream",
      progress: 0,
      rawFile: f
    }));
    setFiles((xs) => [...next, ...xs]);
    onFiles?.(next);
    if (dealRoomId && user?.id) {
      next.forEach(async (nf) => {
        setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, progress: 10 } : x));
        const result = await uploadDocument(nf.rawFile, dealRoomId, user.id);
        if (result) {
          await supabase.from("documents").insert({
            deal_room_id: dealRoomId,
            uploader_id: user.id,
            storage_path: result.path,
            category: "General",
            status: "uploaded"
          });
          setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, progress: 100 } : x));
          onUploadComplete?.();
        } else {
          setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, error: true } : x));
        }
      });
    } else {
      next.forEach((nf) => {
        let p = 0;
        const id = setInterval(() => {
          p += Math.random() * 22 + 8;
          if (p >= 100) {
            p = 100;
            clearInterval(id);
          }
          setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, progress: Math.min(100, Math.round(p)) } : x));
        }, 220);
      });
    }
  };
  const onDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    handleFiles(e.dataTransfer.files);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        onDragOver: (e) => {
          e.preventDefault();
          setIsOver(true);
        },
        onDragLeave: () => setIsOver(false),
        onDrop,
        onClick: () => inputRef.current?.click(),
        className: cn(
          "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
          isOver ? "border-brand bg-brand/5" : "border-border bg-muted/30 hover:border-brand/50 hover:bg-accent/40"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-brand-foreground mx-auto shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-sm font-medium", children: title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: hint }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ref: inputRef,
              type: "file",
              multiple: true,
              className: "hidden",
              onChange: (e) => handleFiles(e.target.files)
            }
          )
        ]
      }
    ),
    files.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60 overflow-hidden", children: files.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: f.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground tabular-nums shrink-0", children: [
            (f.size / 1024).toFixed(0),
            " KB"
          ] })
        ] }),
        f.error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 text-xs text-destructive", children: "Upload failed — try again" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 h-1 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-brand transition-all", style: { width: `${f.progress}%` } }) })
      ] }),
      f.error ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-4 w-4 text-destructive shrink-0" }) : f.progress === 100 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4 text-success shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            setFiles((xs) => xs.filter((x) => x.id !== f.id));
          },
          className: "text-muted-foreground hover:text-foreground shrink-0",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" })
        }
      )
    ] }, f.id)) })
  ] });
}
export {
  CircleX as C,
  Dropzone as D,
  Eye as E
};
