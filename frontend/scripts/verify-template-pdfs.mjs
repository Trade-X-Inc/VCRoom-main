#!/usr/bin/env node
// One-off verification: screenshot page 1 of each generated template PDF
// via Chromium's built-in PDF viewer, so page-1 content/branding can be
// visually confirmed. Not part of the build; run manually, outputs to a
// scratch dir, not committed.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PDF_DIR = path.join(ROOT, "public", "templates");
const OUT_DIR = process.argv[2] || "/tmp/template-pdf-shots";
mkdirSync(OUT_DIR, { recursive: true });

const SLUGS = [
  "t-f1-convertible-note-term-sheet",
  "t-f2-safe-post-money-term-sheet",
  "t-f3-due-diligence-checklist-founder",
  "t-f4-data-room-index-series-a",
  "t-f5-mutual-nda-fundraising",
  "t-i1-investment-memo-seed",
  "t-i2-lp-update-quarterly",
  "t-i3-due-diligence-checklist-investor",
  "t-i4-term-sheet-lead-investor-equity",
  "t-i5-portfolio-monitoring-monthly",
];

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  for (const slug of SLUGS) {
    const pdfPath = path.join(PDF_DIR, `${slug}.pdf`);
    await page.goto(`file://${pdfPath}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const shotPath = path.join(OUT_DIR, `${slug}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`✓ ${shotPath}`);
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
