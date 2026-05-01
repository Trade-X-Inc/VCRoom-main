import { r as reactExports, T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { a as cn } from "./utils-BYfsx3cX.js";
import { U as Upload } from "./upload-Cq9av_Er.js";
import { F as FileText } from "./file-text-D9XXuUkz.js";
import { C as CircleCheck } from "./circle-check-CZw26OL2.js";
import { X } from "./x-BIY2iyG1.js";
function Dropzone({
  onFiles,
  title = "Drag & drop or click to upload",
  hint = "Up to 50 MB · PDF, DOCX, XLSX, PNG"
}) {
  const [isOver, setIsOver] = reactExports.useState(false);
  const [files, setFiles] = reactExports.useState([]);
  const inputRef = reactExports.useRef(null);
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 h-1 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-brand transition-all", style: { width: `${f.progress}%` } }) })
      ] }),
      f.progress === 100 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4 text-success shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
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
  Dropzone as D
};
