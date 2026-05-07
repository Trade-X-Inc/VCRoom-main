import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { Upload, FileText, XCircle, CheckCircle2, X } from "lucide-react";
import { c as cn } from "./utils-H80jjgLf.js";
import { u as useAuth, d as uploadDocument, s as supabase } from "./router-BwbG75Bj.js";
function Dropzone({
  onFiles,
  title = "Drag & drop or click to upload",
  hint = "Up to 50 MB · PDF, DOCX, XLSX, PNG",
  dealRoomId,
  onUploadComplete
}) {
  const [isOver, setIsOver] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);
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
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs(
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
          /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-brand-foreground mx-auto shadow-glow", children: /* @__PURE__ */ jsx(Upload, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 text-sm font-medium", children: title }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: hint }),
          /* @__PURE__ */ jsx(
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
    files.length > 0 && /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60 overflow-hidden", children: files.map((f) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-4 py-3", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0", children: /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: f.name }),
          /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-muted-foreground tabular-nums shrink-0", children: [
            (f.size / 1024).toFixed(0),
            " KB"
          ] })
        ] }),
        f.error ? /* @__PURE__ */ jsx("div", { className: "mt-1.5 text-xs text-destructive", children: "Upload failed — try again" }) : /* @__PURE__ */ jsx("div", { className: "mt-1.5 h-1 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-brand transition-all", style: { width: `${f.progress}%` } }) })
      ] }),
      f.error ? /* @__PURE__ */ jsx(XCircle, { className: "h-4 w-4 text-destructive shrink-0" }) : f.progress === 100 ? /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-success shrink-0" }) : /* @__PURE__ */ jsx(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            setFiles((xs) => xs.filter((x) => x.id !== f.id));
          },
          className: "text-muted-foreground hover:text-foreground shrink-0",
          children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
        }
      )
    ] }, f.id)) })
  ] });
}
export {
  Dropzone as D
};
