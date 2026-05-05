import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download, FileText, FileSpreadsheet, TrendingUp, Briefcase, ClipboardCheck, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const deals: { firm: string; partner: string; check: string; stage: string; thesis: string }[] = [];
const ddChecklist: { category: string; title: string; owner: string; due: string; status: string }[] = [];
const auditLog: { actor: string; action: string; target: string; category: string; ip: string; time: string; severity: string }[] = [];

export const Route = createFileRoute("/app/reports")({
  component: Reports,
});

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
}

function toPdfHtml(title: string, rows: (string | number)[][], cols: string[]) {
  const date = new Date().toLocaleString();
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;color:#0a0a0f;padding:40px;max-width:980px;margin:auto}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0a0a0f;padding-bottom:16px;margin-bottom:24px}
  h1{margin:0;font-size:24px;letter-spacing:-0.02em}
  .brand{font-weight:700;letter-spacing:0.08em;font-size:11px;color:#666;text-transform:uppercase}
  .meta{font-size:11px;color:#666}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;text-transform:uppercase;font-size:10px;letter-spacing:0.06em;color:#666;border-bottom:1px solid #ddd;padding:8px 6px}
  td{border-bottom:1px solid #eee;padding:8px 6px}
  footer{margin-top:32px;font-size:10px;color:#999;text-align:center}
</style></head><body>
<header>
  <div><div class="brand">Venture Room · Report</div><h1>${title}</h1></div>
  <div class="meta">Generated ${date}</div>
</header>
<table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>
<footer>Confidential — Venture Room</footer>
<script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script>
</body></html>`;
  return body;
}

function downloadPdf(title: string, cols: string[], rows: (string | number)[][]) {
  const html = toPdfHtml(title, rows, cols);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function Reports() {
  const { t } = useI18n();

  const reports = [
    {
      key: "pipeline",
      title: "Pipeline snapshot",
      desc: "All deals with stage, partner, check size, and probability.",
      icon: Briefcase,
      tint: "bg-brand/10 text-brand",
      cols: ["Firm", "Partner", "Stage", "Check", "Probability", "Last touch"],
      rows: () => deals.map((d) => [d.firm, d.partner, d.stage, d.check, `${d.probability}%`, d.lastTouch]),
    },
    {
      key: "diligence",
      title: "Due diligence status",
      desc: "Checklist by category with owners and status.",
      icon: ClipboardCheck,
      tint: "bg-violet/10 text-violet",
      cols: ["Category", "Item", "Owner", "Status", "Due"],
      rows: () => ddChecklist.map((d) => [d.category, d.title, d.owner, d.status, d.due]),
    },
    {
      key: "activity",
      title: "Activity & audit log",
      desc: "Workspace activity across users, documents, and decisions.",
      icon: ShieldCheck,
      tint: "bg-success/10 text-success",
      cols: ["Actor", "Action", "Target", "Category", "Severity", "When"],
      rows: () => auditLog.map((a) => [a.actor, a.action, a.target, a.category, a.severity, a.time]),
    },
    {
      key: "performance",
      title: "Round performance",
      desc: "Funnel velocity, conversion rate, and avg. time per stage.",
      icon: TrendingUp,
      tint: "bg-warning/10 text-warning",
      cols: ["Stage", "Deals", "Conversion", "Avg days"],
      rows: () => [
        ["Sourced", 2, "88%", 4],
        ["Qualified", 2, "75%", 6],
        ["Pitched", 2, "62%", 9],
        ["Diligence", 2, "55%", 14],
        ["Term Sheet", 1, "85%", 7],
        ["Closed", 1, "—", 3],
      ],
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div key={r.key} className="rounded-xl border border-border/60 bg-card p-5 shadow-card flex flex-col">
            <div className="flex items-start gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${r.tint}`}>
                <r.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => {
                  const rows = r.rows();
                  downloadFile(`${r.key}.csv`, toCsv([r.cols, ...rows]), "text/csv");
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> {t("reports.csv")}
              </button>
              <button
                onClick={() => downloadPdf(r.title, r.cols, r.rows())}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent"
              >
                <FileText className="h-3.5 w-3.5" /> {t("reports.pdf")}
              </button>
              <button
                onClick={() => {
                  const rows = r.rows();
                  downloadFile(`${r.key}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), columns: r.cols, rows }, null, 2), "application/json");
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent ms-auto"
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
