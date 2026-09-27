#!/usr/bin/env node
// SEO-008 — one-off PDF generation for the /templates library.
// Not part of the build pipeline: run manually, output committed as static
// assets to frontend/public/templates/. Uses the pre-installed Chromium at
// /opt/pw-browsers (never downloads) and self-hosted @fontsource files, so
// generation has no network dependency and is fully reproducible.

import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(__dirname, "templates-src");
const OUT_DIR = path.join(ROOT, "public", "templates");
const FONT_DIR = path.join(ROOT, "node_modules", "@fontsource");

mkdirSync(OUT_DIR, { recursive: true });

function fontUrl(pkg, file) {
  const p = path.join(FONT_DIR, pkg, "files", file);
  return `file://${p}`;
}

const VERSION_DATE = "September 2026";
const DISCLAIMER =
  "Educational template — not legal or financial advice. Consult qualified counsel before use. Market terms vary by jurisdiction and by deal.";

const FONT_FACES = `
@font-face { font-family: "Archivo"; font-weight: 400; font-style: normal; src: url("${fontUrl("archivo", "archivo-latin-400-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Archivo"; font-weight: 500; font-style: normal; src: url("${fontUrl("archivo", "archivo-latin-500-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Archivo"; font-weight: 600; font-style: normal; src: url("${fontUrl("archivo", "archivo-latin-600-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Archivo"; font-weight: 700; font-style: normal; src: url("${fontUrl("archivo", "archivo-latin-700-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Source Serif 4"; font-weight: 400; font-style: normal; src: url("${fontUrl("source-serif-4", "source-serif-4-latin-400-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Source Serif 4"; font-weight: 400; font-style: italic; src: url("${fontUrl("source-serif-4", "source-serif-4-latin-400-italic.woff2")}") format("woff2"); }
@font-face { font-family: "Source Serif 4"; font-weight: 600; font-style: normal; src: url("${fontUrl("source-serif-4", "source-serif-4-latin-600-normal.woff2")}") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 400; font-style: normal; src: url("${fontUrl("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff2")}") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 500; font-style: normal; src: url("${fontUrl("jetbrains-mono", "jetbrains-mono-latin-500-normal.woff2")}") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 700; font-style: normal; src: url("${fontUrl("jetbrains-mono", "jetbrains-mono-latin-700-normal.woff2")}") format("woff2"); }
`;

const PAGE_CSS = `
${FONT_FACES}
:root {
  --navy: #1B3A63;
  --navy-wash: #E8EDF4;
  --ink: #16181C;
  --ink-2: #464C58;
  --ink-3: #6E7585;
  --rule: #D6D4CD;
  --satisfied: #215B49;
  --attention: #7A5310;
  --adverse: #7A2E2A;
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 0;
  font-family: "Source Serif 4", serif;
  font-size: 10.5pt; line-height: 1.55; color: var(--ink);
}
.brand-bar {
  background: var(--navy); color: #fff;
  padding: 14pt 0 12pt; margin: 0 0 18pt;
  display: flex; align-items: baseline; justify-content: space-between;
}
.brand-bar .brand-name {
  font-family: "Archivo", sans-serif; font-weight: 600; font-size: 13pt; letter-spacing: -0.01em;
}
.brand-bar .brand-tag {
  font-family: "JetBrains Mono", monospace; font-size: 8pt; letter-spacing: 0.08em;
  text-transform: uppercase; color: #C9D6E8;
}
.doc-head { margin: 0 0 14pt; }
.doc-eyebrow {
  font-family: "JetBrains Mono", monospace; font-size: 8pt; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--ink-3); margin: 0 0 6pt;
}
h1.doc-title {
  font-family: "Archivo", sans-serif; font-weight: 500; font-size: 20pt;
  letter-spacing: -0.01em; color: var(--ink); margin: 0 0 6pt; line-height: 1.2;
}
.doc-sub {
  font-family: "Source Serif 4", serif; font-style: italic; font-size: 11.5pt;
  color: var(--ink-2); margin: 0 0 14pt;
}
.disclaimer {
  border: 1px solid var(--attention); background: #FBF3E3; color: #5C3F0C;
  font-family: "Archivo", sans-serif; font-size: 8.5pt; line-height: 1.5;
  padding: 9pt 12pt; margin: 0 0 16pt;
}
.disclaimer b { font-weight: 600; }
h2.section-title {
  font-family: "Archivo", sans-serif; font-weight: 600; font-size: 12.5pt;
  color: var(--navy); margin: 20pt 0 4pt; padding-top: 10pt;
  border-top: 1px solid var(--rule);
}
h2.section-title:first-of-type { padding-top: 0; border-top: none; margin-top: 4pt; }
h3.clause-name {
  font-family: "Archivo", sans-serif; font-weight: 600; font-size: 10.5pt;
  color: var(--ink); margin: 12pt 0 3pt;
}
p { margin: 0 0 8pt; }
.clause-body { margin: 0 0 6pt; }
.annotation {
  font-family: "Archivo", sans-serif; font-size: 8.8pt; line-height: 1.5;
  border-inline-start: 2px solid var(--navy); padding: 5pt 0 5pt 9pt; margin: 0 0 4pt;
  background: var(--navy-wash);
}
.annotation .label {
  font-family: "JetBrains Mono", monospace; font-size: 7.5pt; font-weight: 500;
  color: var(--navy); text-transform: uppercase; letter-spacing: 0.06em; margin-right: 4pt;
}
.annotation.range { border-inline-start-color: var(--ink-3); background: #F5F4F1; }
.annotation.range .label { color: var(--ink-3); }
.callout {
  border: 1px solid var(--rule); padding: 10pt 12pt; margin: 10pt 0 14pt;
  page-break-inside: avoid;
}
.callout .callout-label {
  font-family: "JetBrains Mono", monospace; font-size: 7.5pt; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.07em; color: var(--navy); margin: 0 0 6pt;
}
table {
  width: 100%; border-collapse: collapse; margin: 8pt 0 14pt; font-size: 8.8pt;
  page-break-inside: auto;
}
table tr { page-break-inside: avoid; page-break-after: auto; }
th {
  font-family: "Archivo", sans-serif; font-weight: 600; font-size: 8pt;
  text-transform: uppercase; letter-spacing: 0.04em; color: #fff;
  background: var(--navy); text-align: left; padding: 5pt 7pt; border: 1px solid var(--navy);
}
td {
  font-family: "Archivo", sans-serif; padding: 5pt 7pt; border: 1px solid var(--rule);
  vertical-align: top; color: var(--ink-2);
}
td.mono { font-family: "JetBrains Mono", monospace; font-size: 8pt; }
td.status-box { width: 22pt; text-align: center; }
.checkbox { display: inline-block; width: 9pt; height: 9pt; border: 1px solid var(--ink-3); }
.tag-good { color: var(--satisfied); font-weight: 600; }
.tag-gap, .tag-red { color: var(--adverse); font-weight: 600; }
.tag-amber { color: var(--attention); font-weight: 600; }
.tag-green { color: var(--satisfied); font-weight: 600; }
.rag-badge {
  display: inline-block; font-family: "JetBrains Mono", monospace; font-weight: 500;
  font-size: 7.6pt; padding: 1.5pt 6pt; letter-spacing: 0.02em; white-space: nowrap;
}
.rag-red { background: #FBEEED; color: var(--adverse); }
.rag-amber { background: #FBF3E3; color: var(--attention); }
.rag-green { background: #EAF2EE; color: var(--satisfied); }
table.wide { font-size: 7.8pt; }
table.wide th, table.wide td { padding: 4.5pt 5.5pt; }
.category-eyebrow {
  font-family: "JetBrains Mono", monospace; font-size: 7.5pt; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-3); margin: 0 0 2pt;
}
.market-tag {
  display: inline-block; font-family: "JetBrains Mono", monospace; font-size: 7.5pt;
  padding: 1.5pt 5pt; margin-left: 4pt; letter-spacing: 0.03em;
}
.market-standard { background: #EAF2EE; color: var(--satisfied); }
.market-aggressive { background: #F7E9E8; color: var(--adverse); }
.market-founder-friendly { background: #EFF1E6; color: #4B5320; }
.no-write {
  border: 1px solid var(--adverse); background: #FBEEED; padding: 8pt 11pt; margin: 8pt 0 14pt;
  font-family: "Archivo", sans-serif; font-size: 8.8pt;
}
.no-write .callout-label { color: var(--adverse); }
ul, ol { margin: 4pt 0 10pt; padding-inline-start: 16pt; }
li { margin: 0 0 4pt; }
strong { font-weight: 600; }
.small-print {
  font-family: "JetBrains Mono", monospace; font-size: 7.5pt; color: var(--ink-3); margin-top: 18pt;
}
`;

function shell({ title, eyebrow, sub, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${PAGE_CSS}</style>
</head>
<body>
  <div class="brand-bar">
    <span class="brand-name">Lengdon</span>
    <span class="brand-tag">Template Library / ${VERSION_DATE}</span>
  </div>
  <div class="doc-head">
    <p class="doc-eyebrow">${eyebrow}</p>
    <h1 class="doc-title">${title}</h1>
    ${sub ? `<p class="doc-sub">${sub}</p>` : ""}
  </div>
  <div class="disclaimer"><b>Educational template</b> — not legal or financial advice. Consult qualified counsel before use. Market terms vary by jurisdiction and by deal.</div>
  ${bodyHtml}
  <p class="small-print">Lengdon — lengdon.com — ${VERSION_DATE} template edition.</p>
</body>
</html>`;
}

const HEADER_TEMPLATE = `<div style="width:100%;"></div>`;
const FOOTER_TEMPLATE = `
<div style="width:100%; font-family: Arial, sans-serif; font-size: 7.5px; color: #6E7585; display:flex; justify-content: space-between; padding: 0 20mm; -webkit-print-color-adjust: exact;">
  <span>Lengdon — lengdon.com</span>
  <span class="pageNumber"></span>&nbsp;/&nbsp;<span class="totalPages"></span>
</div>`;

const TEMPLATES = [
  { slug: "t-f1-convertible-note-term-sheet", src: "t-f1.html", title: "Convertible Note — Term Sheet", eyebrow: "Founders / Fundraising instruments", sub: "Annotated market-standard convertible note term sheet for a pre-seed or seed round." },
  { slug: "t-f2-safe-post-money-term-sheet", src: "t-f2.html", title: "SAFE (Post-Money) — Term Sheet", eyebrow: "Founders / Fundraising instruments", sub: "Y Combinator's post-money SAFE structure, annotated, with a worked dilution example." },
  { slug: "t-f3-due-diligence-checklist-founder", src: "t-f3.html", title: "Due Diligence Checklist — Seed / Series A", eyebrow: "Founders / Fundraising process", sub: "What a serious investor will ask for, organised by category, with the gap founders usually have." },
  { slug: "t-f4-data-room-index-series-a", src: "t-f4.html", title: "Data Room Index — Series A Ready", eyebrow: "Founders / Fundraising process", sub: "The folder structure and quality standard for a complete Series A data room." },
  { slug: "t-f5-mutual-nda-fundraising", src: "t-f5.html", title: "Mutual NDA — Fundraising Context", eyebrow: "Founders / Fundraising instruments", sub: "A mutual confidentiality agreement written specifically for sharing a deck and financial model." },
  { slug: "t-i1-investment-memo-seed", src: "t-i1.html", title: "Investment Memo — Seed Stage", eyebrow: "Investors / Process documents", sub: "The memo structure used ahead of a partner meeting, with a worked fictional example (Acme Co)." },
  { slug: "t-i2-lp-update-quarterly", src: "t-i2.html", title: "LP Update — Quarterly Template", eyebrow: "Investors / Process documents", sub: "A direct, no-spin quarterly update structure for emerging fund managers." },
  { slug: "t-i3-due-diligence-checklist-investor", src: "t-i3.html", title: "Due Diligence Checklist — Seed (Investor-Facing)", eyebrow: "Investors / Process documents", sub: "The investor's own checklist for what to verify before signing, by risk area." },
  { slug: "t-i4-term-sheet-lead-investor-equity", src: "t-i4.html", title: "Term Sheet — Lead Investor, Priced Equity Round", eyebrow: "Investors / Fundraising instruments", sub: "A priced-round term sheet from the lead investor's side, annotated for what is negotiable." },
  { slug: "t-i5-portfolio-monitoring-monthly", src: "t-i5.html", title: "Portfolio Monitoring — Monthly Template", eyebrow: "Investors / Process documents", sub: "A monthly operating-metrics tracker for a portfolio of 10–20 companies, with a runway RAG system.", landscape: true },
];

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const results = [];
  try {
    for (const t of TEMPLATES) {
      const bodyHtml = readFileSync(path.join(SRC_DIR, t.src), "utf8");
      const html = shell({ title: t.title, eyebrow: t.eyebrow, sub: t.sub, bodyHtml });
      const tmpHtmlPath = path.join(OUT_DIR, `.${t.slug}.tmp.html`);
      writeFileSync(tmpHtmlPath, html, "utf8");

      const page = await browser.newPage();
      await page.goto(`file://${tmpHtmlPath}`, { waitUntil: "networkidle" });
      // Force webfonts to be fully loaded before printing (font-face src is a
      // local file:// URL, so this resolves near-instantly, but wait explicitly
      // rather than assume — a missed @font-face load silently falls back to
      // a system serif/sans and would go unnoticed in a headless run.
      await page.evaluate(() => document.fonts.ready);

      const outPath = path.join(OUT_DIR, `${t.slug}.pdf`);
      await page.pdf({
        path: outPath,
        format: "A4",
        landscape: !!t.landscape,
        margin: { top: "20mm", bottom: "16mm", left: "20mm", right: "20mm" },
        displayHeaderFooter: true,
        headerTemplate: HEADER_TEMPLATE,
        footerTemplate: FOOTER_TEMPLATE,
        printBackground: true,
      });
      await page.close();

      const { statSync, unlinkSync } = await import("node:fs");
      unlinkSync(tmpHtmlPath);
      const size = statSync(outPath).size;
      results.push({ slug: t.slug, bytes: size });
      console.log(`✓ ${t.slug}.pdf — ${(size / 1024).toFixed(1)} KB`);
    }
  } finally {
    await browser.close();
  }
  console.log("\nAll 10 PDFs generated.");
  return results;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
