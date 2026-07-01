/**
 * Client-side document text extraction.
 * Runs in the browser before sending to the AI summary server function.
 */

export async function extractDocumentText(
  source: File | ArrayBuffer,
  fileName: string
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  try {
    // Always clone the buffer — prevents detached ArrayBuffer errors when
    // the same buffer is reused by multiple async operations.
    const raw = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
    const buf = raw.slice(0);

    if (ext === "pdf") return await extractPDF(buf, fileName);
    if (["docx", "doc"].includes(ext)) return await extractDOCX(buf);
    if (["pptx", "ppt"].includes(ext)) return await extractPPTX(buf);
    if (["xlsx", "xls"].includes(ext)) return await extractXLSX(buf);
    if (ext === "csv") return await extractCSV(buf);
    if (["txt", "md", "rtf"].includes(ext)) {
      const text = new TextDecoder().decode(new Uint8Array(buf));
      return text.slice(0, 15000);
    }

    const kb = (buf.byteLength / 1024).toFixed(0);
    return `File: ${fileName} (${ext.toUpperCase()}, ${kb} KB). Binary format — describe based on filename.`;
  } catch (e) {
    console.error("[document-extractor]", ext, e);
    return `Could not extract text from ${fileName}. Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// ── Intake-specific extraction ─────────────────────────────────────────────────
// Returns structured per-file results for the Deal Intake page.

const INTAKE_ALLOWED_EXTS = ["pdf", "xlsx", "xls", "csv"];

export type IntakeFileResult = {
  file: string;
  status: "ok" | "rejected" | "extraction_failed";
  text?: string;
  reason?: string;
};

export async function extractForIntake(file: File): Promise<IntakeFileResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!INTAKE_ALLOWED_EXTS.includes(ext)) {
    return {
      file: file.name,
      status: "rejected",
      reason:
        "Unsupported file type. We accept pitch decks (PDF) and contact lists (Excel, CSV) only.",
    };
  }

  try {
    const buf = (await file.arrayBuffer()).slice(0);

    if (ext === "pdf") {
      const text = await extractPDFForIntake(buf, file.name);
      if (!text) {
        return {
          file: file.name,
          status: "extraction_failed",
          reason:
            "Could not read this PDF. Try a clearer scan or paste the content directly.",
        };
      }
      return { file: file.name, status: "ok", text };
    }

    if (["xlsx", "xls"].includes(ext)) {
      try {
        const text = await extractXLSX(buf);
        if (!text || text === "No data found in spreadsheet") {
          return {
            file: file.name,
            status: "extraction_failed",
            reason:
              "Could not read this spreadsheet. Ensure it has column headers and is not password-protected.",
          };
        }
        return { file: file.name, status: "ok", text };
      } catch {
        return {
          file: file.name,
          status: "extraction_failed",
          reason:
            "Could not read this spreadsheet. Ensure it has column headers and is not password-protected.",
        };
      }
    }

    if (ext === "csv") {
      try {
        const text = await extractCSV(buf);
        if (!text?.trim()) {
          return {
            file: file.name,
            status: "extraction_failed",
            reason:
              "Could not read this CSV. Ensure it has column headers and is not empty.",
          };
        }
        return { file: file.name, status: "ok", text };
      } catch {
        return {
          file: file.name,
          status: "extraction_failed",
          reason: "Could not read this CSV file.",
        };
      }
    }

    return { file: file.name, status: "rejected", reason: "Unsupported file type." };
  } catch (e) {
    return {
      file: file.name,
      status: "extraction_failed",
      reason: `Extraction error: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}

// ── PDF (general — used by AI summary) ────────────────────────────────────────
async function extractPDF(buf: ArrayBuffer, fileName: string): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    // Use the bundled worker from the same package version (6.0.227)
    // new URL() resolves to the correct asset path in Vite
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buf),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    const maxPages = Math.min(pdf.numPages, 30);
    const pages: string[] = [];

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 10) pages.push(`[Page ${i}] ${text}`);
    }

    const result = pages.join("\n\n");
    console.log(`[PDF] extracted ${result.length} chars from ${pdf.numPages} pages — ${fileName}`);
    return result.slice(0, 15000) || `PDF parsed (${pdf.numPages} pages) but no readable text found — may be a scanned image PDF.`;
  } catch (err) {
    console.warn("[PDF] pdfjs failed, trying basic extraction:", err);
    return extractPDFBasic(buf.slice(0), fileName);
  }
}

// ── PDF (intake — with image-based PDF fallback via GPT-4o vision) ─────────────
async function extractPDFForIntake(buf: ArrayBuffer, fileName: string): Promise<string | null> {
  let text = "";

  // 1. Try text extraction first
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buf.slice(0)),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    const maxPages = Math.min(pdf.numPages, 30);
    const pages: string[] = [];
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageText.length > 10) pages.push(`[Page ${i}] ${pageText}`);
    }
    text = pages.join("\n\n").slice(0, 15000);
    console.log(`[PDF intake] text extracted: ${text.length} chars — ${fileName}`);

    // If text is sufficient, return it directly
    if (text.length >= 100) return text;

    // 2. Text too short — image-based PDF, fall back to vision
    console.log(`[PDF intake] sparse text (${text.length} chars), attempting vision fallback — ${fileName}`);
    const visionText = await extractPDFViaVision(buf, pdf, fileName);
    return visionText || text || null;
  } catch (err) {
    console.warn("[PDF intake] pdfjs failed:", err);
    // Fall through to basic then vision
  }

  // 3. Basic text extraction fallback
  text = extractPDFBasic(buf.slice(0), fileName);
  if (text.length >= 100) return text;

  // 4. Vision fallback (pdfjs failed entirely — try canvas render without pdf object)
  return text.length > 0 ? text : null;
}

// ── GPT-4o vision extraction for image-based PDFs ─────────────────────────────
async function extractPDFViaVision(
  buf: ArrayBuffer,
  pdf: any,
  fileName: string
): Promise<string | null> {
  try {
    // Determine which pages to process: pages 1, 2, 3, last-1, last (max 5, deduplicated)
    const total: number = pdf.numPages;
    const pageNums = [...new Set([
      1, 2, 3,
      Math.max(1, total - 1),
      total,
    ])].filter((n) => n >= 1 && n <= total);

    console.log(`[PDF vision] scanning pages ${pageNums.join(",")} of ${total} — ${fileName}`);

    const extractedParts: string[] = [];

    for (const pageNum of pageNums) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        if (!base64) continue;

        const result = await callVisionAPI(base64, pageNum);
        if (result && result !== "NOT_STARTUP") {
          extractedParts.push(`[Page ${pageNum}] ${result}`);
        }

        // Clean up canvas
        canvas.width = 0;
        canvas.height = 0;
      } catch (pageErr) {
        console.warn(`[PDF vision] page ${pageNum} failed:`, pageErr);
      }
    }

    if (extractedParts.length === 0) return null;
    return extractedParts.join("\n\n");
  } catch (err) {
    console.warn("[PDF vision] failed:", err);
    return null;
  }
}

async function callVisionAPI(base64Image: string, pageNum: number): Promise<string | null> {
  // Read API key from meta tag injected at build time (safe — not a secret, just the Supabase anon key pattern)
  // For vision we need the OpenAI key — but that's a server secret.
  // Strategy: POST to our own server function endpoint that proxies vision calls.
  // This keeps the key server-side and avoids exposing it in the browser bundle.
  try {
    const { visionExtractPage } = await import("@/lib/vision-extract-fn");
    const result = await visionExtractPage({ data: { base64Image, pageNum } });
    return result.text ?? null;
  } catch (err) {
    console.warn(`[vision API] page ${pageNum} error:`, err);
    return null;
  }
}

function extractPDFBasic(buf: ArrayBuffer, fileName: string): string {
  try {
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf));

    // Extract text between BT/ET PDF operators
    const btEt = raw.match(/BT[\s\S]*?ET/g) ?? [];
    const btText = btEt
      .flatMap((block) => [...block.matchAll(/\(([^)]{2,})\)/g)].map((m) => m[1]))
      .map((s) => s.replace(/\\n/g, " ").replace(/\\/g, "").trim())
      .filter((s) => /[a-zA-Z]{2,}/.test(s))
      .join(" ");

    // Also grab parenthesised strings anywhere (common in PDF streams)
    const parenText = [...raw.matchAll(/\(([^)]{3,200})\)/g)]
      .map((m) => m[1].replace(/\\./g, " ").trim())
      .filter((s) => /[a-zA-Z]{3,}/.test(s) && !/^\d+$/.test(s))
      .join(" ");

    const candidate = btText.length > parenText.length ? btText : parenText;
    const result = [...new Set(candidate.split(/\s+/))]
      .join(" ")
      .slice(0, 8000);

    console.log(`[PDF basic] ${result.length} chars — ${fileName}`);
    return result || "";
  } catch {
    return "";
  }
}

// ── DOCX ─────────────────────────────────────────────────────────────────────
async function extractDOCX(buf: ArrayBuffer): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buf);

  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return "Could not read DOCX — word/document.xml not found";

  // Match all paragraphs and join their text runs
  const paragraphs = [...docXml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)];
  const text = paragraphs
    .map((p) => {
      const runs = [...p[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
      return runs.map((r) => r[1]).join("");
    })
    .filter((t) => t.trim().length > 0)
    .join("\n");

  console.log(`[DOCX] extracted: ${text.length} chars`);
  return text.slice(0, 15000) || "No readable text found in DOCX";
}

// ── PPTX ─────────────────────────────────────────────────────────────────────
async function extractPPTX(buf: ArrayBuffer): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buf);

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
      return na - nb;
    });

  console.log(`[PPTX] slides found: ${slideFiles.length}`);

  const slides: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
      .map((m) => m[1].trim())
      .filter((t) => t.length > 0);
    if (texts.length > 0) slides.push(`[Slide ${i + 1}] ${texts.join(" ")}`);
  }

  const result = slides.join("\n");
  console.log(`[PPTX] extracted: ${result.length} chars`);
  return result.slice(0, 15000) || "No text found in PPTX slides";
}

// ── XLSX ─────────────────────────────────────────────────────────────────────
async function extractXLSX(buf: ArrayBuffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(new Uint8Array(buf), { type: "array" });

  const sheets: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const filtered = csv.split("\n").filter((row) => row.replace(/,/g, "").trim()).join("\n");
    if (filtered.trim()) sheets.push(`[Sheet: ${sheetName}]\n${filtered}`);
  }

  const result = sheets.join("\n\n");
  console.log(`[XLSX] ${workbook.SheetNames.length} sheets, ${result.length} chars`);
  return result.slice(0, 15000) || "No data found in spreadsheet";
}

// ── CSV ───────────────────────────────────────────────────────────────────────
async function extractCSV(buf: ArrayBuffer): Promise<string> {
  const text = new TextDecoder().decode(new Uint8Array(buf));
  console.log(`[CSV] full length: ${text.length} chars`);
  return text.slice(0, 15000);
}
