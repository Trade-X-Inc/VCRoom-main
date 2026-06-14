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

// ── PDF ───────────────────────────────────────────────────────────────────────
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
    return result || `PDF text extraction failed for ${fileName} — may be image-based or encrypted.`;
  } catch {
    return `Could not extract PDF text from ${fileName}.`;
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
