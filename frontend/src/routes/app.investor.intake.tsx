import React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Loader2, AlertTriangle, CheckCircle2, ExternalLink,
  ChevronDown, ChevronUp, Clock, FileInput, Upload, Link2,
  Plus, X, Download, Target, ArrowRight, Mail, Table2, History,
  BookOpen, AlertCircle, FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
// intake-fn contains createServerFn — static import causes TDZ crash in client bundle.
// Use dynamic import inside the async handler instead.
import type { IntakeCandidate } from "@/lib/intake-fn";
import type { IntakeFileResult } from "@/lib/document-extractor";
import { PageGuide } from "@/components/app/PageGuide";

export const Route = createFileRoute("/app/investor/intake")({
  component: IntakePage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type Filter = "all" | "strong" | "on_platform" | "off_platform";

type BatchRow = {
  id: string;
  created_at: string;
  status: string;
  parsed_count: number | null;
  raw_input?: string | null;
};

// Infer input type from raw_input content
function inferInputType(raw: string | null | undefined): "email" | "table" | "links" {
  if (!raw) return "table";
  const lower = raw.toLowerCase();
  if (lower.includes("--- links ---") || lower.includes("http")) return "links";
  if (lower.includes("from:") || lower.includes("subject:") || lower.includes("forwarded")) return "email";
  return "table";
}

type CandidateRow = IntakeCandidate & { id: string; status: string };

// ── Styles ─────────────────────────────────────────────────────────────────────

// card style is now applied via className for theme support
const cardStyle = {
  borderRadius: 16,
  padding: "24px",
} as React.CSSProperties;

const badge = (color: "green" | "amber" | "muted") => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 9px",
  borderRadius: 99,
  ...(color === "green" && {
    background: "rgba(16,185,129,0.12)",
    color: "#10b981",
    border: "1px solid rgba(16,185,129,0.2)",
  }),
  ...(color === "amber" && {
    background: "rgba(245,158,11,0.12)",
    color: "#f59e0b",
    border: "1px solid rgba(245,158,11,0.2)",
  }),
  ...(color === "muted" && {
    background: "rgba(255,255,255,0.05)",
    color: "var(--color-muted-foreground)",
    border: "1px solid var(--color-border)",
  }),
} as React.CSSProperties);

function fitColor(score: number): "green" | "amber" | "muted" {
  if (score >= 80) return "green";
  if (score >= 60) return "amber";
  return "muted";
}

function fitLabel(score: number) {
  if (score >= 80) return "Strong fit";
  if (score >= 60) return "Possible fit";
  return "Low fit";
}

// ── Main component ──────────────────────────────────────────────────────────────

function IntakePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rawInput, setRawInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<string[]>([""]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-file extraction results (shown even if no candidates extracted)
  const [fileResults, setFileResults] = useState<IntakeFileResult[]>([]);

  // Current batch result state
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [currentCandidates, setCurrentCandidates] = useState<CandidateRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [batchCandidates, setBatchCandidates] = useState<Record<string, CandidateRow[]>>({});
  const [loadingBatch, setLoadingBatch] = useState<string | null>(null);
  // Per-batch strong match counts (fetched lazily when history renders)
  const [batchStrongCounts, setBatchStrongCounts] = useState<Record<string, number>>({});

  // Fetch investor profile (id + thesis fields for the banner)
  const { data: investorProfile } = useQuery({
    queryKey: ["investor-profile-intake", user?.id],
    enabled: !!user?.id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("id, sectors, stages, geography")
        .eq("user_id", user!.id)
        .maybeSingle();
      // sectors/stages may be stored as JSON string or real array — normalise here
      const toArr = (v: unknown): string[] => {
        if (!v) return [];
        if (Array.isArray(v)) return v as string[];
        if (typeof v === "string") {
          try { const p = JSON.parse(v); return Array.isArray(p) ? p : [v]; } catch { return [v]; }
        }
        return [];
      };
      return data ? { ...data, sectors: toArr(data.sectors), stages: toArr(data.stages) } as { id: string; sectors: string[]; stages: string[]; geography: string | null } : null;
    },
  });

  // Fetch past batches (include raw_input for input_type inference)
  const { data: batches = [], refetch: refetchBatches } = useQuery<BatchRow[]>({
    queryKey: ["intake-batches", investorProfile?.id],
    enabled: !!investorProfile?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_intake_batches")
        .select("id, created_at, status, parsed_count, raw_input")
        .eq("investor_profile_id", investorProfile!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as BatchRow[];
    },
  });

  // Watchlist company names for duplicate detection (lowercase for fuzzy matching)
  const { data: watchlistNames = [] } = useQuery<string[]>({
    queryKey: ["watchlist-names", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("company_name")
        .eq("investor_id", user!.id);
      return (data ?? []).map((r: any) => (r.company_name ?? "").toLowerCase());
    },
  });

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const trimmed = rawInput.trim();
    const hasLinks = links.some((l) => l.trim());
    const hasFiles = uploadedFiles.length > 0;
    if (!trimmed && !hasFiles && !hasLinks) {
      toast.error("Add some input first — paste text, upload files, or add links.");
      return;
    }
    if (!investorProfile?.id) { toast.error("Investor profile not found."); return; }

    setParsing(true);
    setParseError(null);
    setCurrentCandidates([]);
    setCurrentBatchId(null);
    setActiveFilter("all");
    setFileResults([]);

    // Build combined input: pasted text + extracted file text + links
    let combinedInput = trimmed;
    if (hasFiles) {
      const { extractForIntake } = await import("@/lib/document-extractor");
      const results: IntakeFileResult[] = [];
      for (const file of uploadedFiles) {
        const result = await extractForIntake(file);
        results.push(result);
        if (result.status === "ok" && result.text?.trim()) {
          combinedInput += (combinedInput ? "\n\n" : "") + `--- ${file.name} ---\n${result.text.trim()}`;
        }
      }
      setFileResults(results);

      const rejected = results.filter((r) => r.status === "rejected");
      const failed = results.filter((r) => r.status === "extraction_failed");
      if (rejected.length > 0) {
        toast.warning(`${rejected.length} file${rejected.length > 1 ? "s" : ""} skipped — unsupported type`);
      }
      if (failed.length > 0) {
        toast.warning(`${failed.length} file${failed.length > 1 ? "s" : ""} could not be read`);
      }
    }
    if (hasLinks) {
      const linkBlock = links.filter((l) => l.trim()).join("\n");
      combinedInput += (combinedInput ? "\n\n" : "") + `--- Links ---\n${linkBlock}`;
    }

    if (!combinedInput.trim()) {
      toast.error("Could not extract any text from the uploaded files.");
      setParsing(false);
      return;
    }

    // 1. Create batch row
    const { data: batch, error: batchErr } = await supabase
      .from("investor_intake_batches")
      .insert({
        investor_profile_id: investorProfile.id,
        raw_input: combinedInput,
        status: "processing",
      })
      .select("id")
      .single();

    if (batchErr || !batch) {
      toast.error("Could not start batch");
      setParsing(false);
      return;
    }

    setCurrentBatchId(batch.id);

    // 2. Call AI parse server function
    try {
      const { parseIntakeBatch } = await import("@/lib/intake-fn");
      const result = await parseIntakeBatch({
        data: {
          batchId: batch.id,
          investorProfileId: investorProfile.id,
          rawInput: combinedInput,
        },
      });

      if (result.error) {
        setParseError(result.error);
        toast.error("We couldn't parse that. Try pasting smaller chunks or check the formatting.");
      } else if (result.candidates.length === 0) {
        toast.info("No identifiable founders or companies found in that text.");
        setCurrentCandidates([]);
      } else {
        // Re-fetch candidates from DB so we have IDs
        const { data: dbCandidates } = await supabase
          .from("investor_intake_candidates")
          .select("*")
          .eq("batch_id", batch.id)
          .order("thesis_fit_score", { ascending: false });
        setCurrentCandidates((dbCandidates ?? []) as CandidateRow[]);
        toast.success(`Found ${result.candidates.length} lead${result.candidates.length !== 1 ? "s" : ""}`);
        setRawInput("");
        setUploadedFiles([]);
      }
    } catch (err: any) {
      setParseError(err.message);
      toast.error("We couldn't parse that. Try pasting smaller chunks or check the formatting.");
    } finally {
      setParsing(false);
      refetchBatches();
    }
  }

  // ── Load historical batch ──────────────────────────────────────────────────

  async function loadBatch(batchId: string) {
    if (batchCandidates[batchId]) {
      setExpandedBatchId(expandedBatchId === batchId ? null : batchId);
      return;
    }
    setLoadingBatch(batchId);
    const { data } = await supabase
      .from("investor_intake_candidates")
      .select("*")
      .eq("batch_id", batchId)
      .order("thesis_fit_score", { ascending: false });
    const rows = (data ?? []) as CandidateRow[];
    setBatchCandidates((prev) => ({ ...prev, [batchId]: rows }));
    // Cache the strong count (>= 70 per spec)
    const strong = rows.filter((c) => c.thesis_fit_score >= 70).length;
    setBatchStrongCounts((prev) => ({ ...prev, [batchId]: strong }));
    setExpandedBatchId(batchId);
    setLoadingBatch(null);
  }

  // Pre-fetch strong counts for all batches when batch list loads (for history header)
  async function prefetchBatchStrongCount(batchId: string) {
    if (batchStrongCounts[batchId] !== undefined) return;
    const { count } = await supabase
      .from("investor_intake_candidates")
      .select("*", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .gte("thesis_fit_score", 70);
    setBatchStrongCounts((prev) => ({ ...prev, [batchId]: count ?? 0 }));
  }

  // ── File handling ──────────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setUploadedFiles((prev) => {
      const combined = [...prev, ...files].slice(0, 20);
      return combined;
    });
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Link handling ──────────────────────────────────────────────────────────

  function addLink() {
    if (links.length >= 20) return;
    setLinks((prev) => [...prev, ""]);
  }

  function updateLink(idx: number, val: string) {
    setLinks((prev) => prev.map((l, i) => i === idx ? val : l));
  }

  function removeLink(idx: number) {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
    if (links.length === 1) setLinks([""]);
  }

  // ── Sample template download ───────────────────────────────────────────────

  function downloadTemplate() {
    const header = "Name,Company,Email,LinkedIn,Sector,Stage,Location,Notes";
    const sample = [
      "Jane Smith,Acme AI,jane@acme.ai,https://linkedin.com/in/janesmith,AI / ML,Seed,San Francisco,Met at TechCrunch",
      "Omar Hassan,GreenStack,omar@greenstack.io,https://linkedin.com/in/omarhassan,CleanTech,Series A,Dubai,Strong team",
    ].join("\n");
    const blob = new Blob([header + "\n" + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hockystick-intake-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Add to watchlist ───────────────────────────────────────────────────────

  async function addToWatchlist(c: CandidateRow) {
    if (!investorProfile?.id) return;
    const { error } = await supabase.from("investor_watchlist").insert({
      investor_id: user!.id,
      company_name: c.company_name || "Unknown",
      sector: c.sector ?? null,
      stage: c.stage ?? null,
      description: c.thesis_fit_reasons?.join("; ") ?? null,
      source: "intake",
      initial_score: c.thesis_fit_score,
      status: "Sourcing",
    });
    if (error) {
      toast.error("Could not add to watchlist");
    } else {
      toast.success(`${c.company_name || "Company"} added to watchlist`);
    }
  }

  // ── Mark reviewed ──────────────────────────────────────────────────────────

  async function markReviewed(candidateId: string) {
    await supabase
      .from("investor_intake_candidates")
      .update({ status: "reviewed" })
      .eq("id", candidateId);
    setCurrentCandidates((prev) =>
      prev.map((c: any) => c.id === candidateId ? { ...c, status: "reviewed" } : c)
    );
    toast.success("Marked as reviewed");
  }

  // ── Filtered candidates ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case "strong": return currentCandidates.filter((c) => c.thesis_fit_score >= 80);
      case "on_platform": return currentCandidates.filter((c) => !!c.matched_startup_id);
      case "off_platform": return currentCandidates.filter((c) => !c.matched_startup_id);
      default: return currentCandidates;
    }
  }, [currentCandidates, activeFilter]);

  const strongCount = currentCandidates.filter((c) => c.thesis_fit_score >= 80).length;
  const onPlatformCount = currentCandidates.filter((c) => !!c.matched_startup_id).length;

  const hasInput = rawInput.trim() || uploadedFiles.length > 0 || links.some((l) => l.trim());

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8">

      {/* Header */}
      <div className="mb-7 flex items-start gap-3">
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileInput size={16} style={{ color: "#a78bfa" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground m-0" style={{ fontFamily: "Syne, sans-serif" }}>
              Deal Intake
            </h1>
            <PageGuide pageId="investor-intake" />
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">
            Paste, upload, or link any founder data. We extract contacts, score against your thesis, and surface the strongest matches.
          </p>
        </div>
      </div>

      {/* ── Past intake runs (ABOVE the inputs) ────────────────────────── */}
      {batches.length === 0 && !investorProfile?.id ? null : (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <History size={13} style={{ color: "var(--color-muted-foreground)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Past intake runs
            </span>
          </div>
          {batches.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-card px-5 py-4 text-sm text-muted-foreground">
              No intake runs yet — parse your first batch below.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {batches
                .filter((b) => b.id !== currentBatchId)
                .map((b) => {
                  const itype = inferInputType(b.raw_input);
                  const typeIcon = itype === "email"
                    ? <Mail size={13} style={{ color: "#a78bfa" }} />
                    : itype === "links"
                    ? <Link2 size={13} style={{ color: "#a78bfa" }} />
                    : <Table2 size={13} style={{ color: "#a78bfa" }} />;
                  const typeLabel = itype === "email" ? "Forwarded emails" : itype === "links" ? "Links" : "Pasted data";
                  const dateLabel = new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  const strongCount = batchStrongCounts[b.id];

                  return (
                    <div key={b.id} className="bg-card border border-border/60 rounded-xl overflow-hidden">
                      <button
                        onClick={() => {
                          prefetchBatchStrongCount(b.id);
                          loadBatch(b.id);
                        }}
                        disabled={b.status === "processing"}
                        style={{
                          width: "100%", background: "transparent", border: "none",
                          cursor: b.status === "processing" ? "not-allowed" : "pointer",
                          padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
                          opacity: b.status === "processing" ? 0.7 : 1,
                        }}
                      >
                        {/* Input type icon */}
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(124,58,237,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {b.status === "processing" ? <Loader2 size={12} style={{ color: "#a78bfa" }} className="animate-spin" /> : typeIcon}
                        </div>
                        {/* Label */}
                        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>
                            {typeLabel} — {dateLabel}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", marginTop: 2 }}>
                            {b.status === "processing" ? "Processing…" : b.status === "failed" ? "Parse failed" : b.parsed_count != null ? `${b.parsed_count} lead${b.parsed_count !== 1 ? "s" : ""}` : "No leads found"}
                          </div>
                        </div>
                        {/* Strong matches badge */}
                        {b.status === "parsed" && strongCount !== undefined && strongCount > 0 && (
                          <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: "#10b981", flexShrink: 0 }}>
                            {strongCount} strong
                          </div>
                        )}
                        {b.status === "failed" && (
                          <span style={{ fontSize: 11, color: "#ef4444", flexShrink: 0 }}>Failed</span>
                        )}
                        {b.status === "processing" ? null : loadingBatch === b.id
                          ? <Loader2 size={13} style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }} className="animate-spin" />
                          : expandedBatchId === b.id
                          ? <ChevronUp size={13} style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }} />
                          : <ChevronDown size={13} style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }} />
                        }
                      </button>

                      {expandedBatchId === b.id && batchCandidates[b.id] && (
                        <div style={{ borderTop: "1px solid var(--hs-border)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                          {batchCandidates[b.id].length === 0 ? (
                            <p style={{ fontSize: 13, color: "var(--color-muted-foreground)", margin: 0 }}>No candidates extracted from this batch.</p>
                          ) : (
                            batchCandidates[b.id].map((c) => (
                              <CandidateCard key={c.id} candidate={c} watchlistNames={watchlistNames} compact />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Thesis banner */}
      <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          <Target size={13} style={{ color: "#A855F7", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--color-foreground)" }}>Your current thesis:</span>
          {investorProfile?.sectors?.length ? (
            <span style={{ fontSize: 12, color: "#A855F7", fontWeight: 600 }}>{investorProfile.sectors.slice(0, 2).join(", ")}</span>
          ) : <span style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>No sectors set</span>}
          <span style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>·</span>
          {investorProfile?.stages?.length ? (
            <span style={{ fontSize: 12, color: "#A855F7", fontWeight: 600 }}>{investorProfile.stages.slice(0, 2).join(", ")}</span>
          ) : <span style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>No stages set</span>}
          {investorProfile?.geography && (
            <>
              <span style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>·</span>
              <span style={{ fontSize: 12, color: "#A855F7", fontWeight: 600 }}>{investorProfile.geography}</span>
            </>
          )}
        </div>
        <button
          onClick={() => navigate({ to: "/app/investor/profile" as any })}
          style={{ fontSize: 12, fontWeight: 600, color: "#A855F7", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0, flexShrink: 0 }}
        >
          Edit thesis <ArrowRight size={12} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Section 1 — Paste */}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column" as const, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileInput size={14} style={{ color: "#A855F7" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>Paste raw data</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-muted-foreground)", margin: 0, lineHeight: 1.5 }}>
            Paste forwarded emails, LinkedIn profiles, event attendee lists, or CRM exports. Plain text only.
          </p>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            disabled={parsing}
            placeholder="Name, company, email, or just paste the whole email thread…"
            style={{
              flex: 1,
              minHeight: 180,
              background: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "12px 14px",
              fontSize: 13,
              color: "var(--color-foreground)",
              resize: "vertical" as const,
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.6,
              boxSizing: "border-box" as const,
              opacity: parsing ? 0.5 : 1,
            }}
          />
          <p style={{ fontSize: 11, color: "var(--color-muted-foreground)", margin: 0 }}>
            Plain text, CSV, or JSON supported
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>

          {/* Section 2 — Upload files */}
          <div style={{ ...cardStyle }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={14} style={{ color: "#A855F7" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>Upload files</span>
              </div>
              <button
                onClick={downloadTemplate}
                style={{ fontSize: 11, color: "#A855F7", background: "transparent", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Download size={10} /> Sample template
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--color-muted-foreground)", margin: "0 0 10px", lineHeight: 1.5 }}>
              Pitch decks (PDF) and contact lists (Excel, CSV) — up to 20 files. Image-based PDFs are read using AI vision. Other file types are not supported.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            {uploadedFiles.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 10 }}>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 6, padding: "5px 10px" }}>
                    <span style={{ fontSize: 12, color: "var(--color-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "85%" }}>{f.name}</span>
                    <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: 0, flexShrink: 0 }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {uploadedFiles.length < 20 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ width: "100%", background: "var(--color-muted)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px", fontSize: 12, color: "var(--color-muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Plus size={13} /> Add files
              </button>
            )}
          </div>

          {/* Section 3 — Add links */}
          <div style={{ ...cardStyle }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Link2 size={14} style={{ color: "#A855F7" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>Add links</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--color-muted-foreground)", margin: "0 0 10px", lineHeight: 1.5 }}>
              Pitch deck links, LinkedIn profiles, websites — up to 20
            </p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {links.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="url"
                    value={l}
                    onChange={(e) => updateLink(i, e.target.value)}
                    placeholder="https://…"
                    style={{ flex: 1, background: "var(--color-muted)", border: "1px solid var(--color-border)", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "var(--color-foreground)", outline: "none" }}
                  />
                  {links.length > 1 && (
                    <button onClick={() => removeLink(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: 2, flexShrink: 0 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              {links.length < 20 && (
                <button
                  onClick={addLink}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(124,58,237,0.7)", padding: "4px 0", textAlign: "left" as const, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Plus size={11} /> Add another link
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 — What we extract */}
      <div style={{ marginBottom: 16, padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)", borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 10 }}>
          What we extract
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginBottom: 12 }}>
          {[
            ["Founder name and email", "Sector and geography"],
            ["Company name and description", "Funding amount being raised"],
            ["Funding stage (Pre-seed, Seed, Series A+)", "LinkedIn and website URLs"],
          ].map(([left, right]) => (
            <React.Fragment key={left}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "var(--color-foreground)", lineHeight: 1.5 }}>
                <CheckCircle2 size={12} style={{ color: "#10B981", flexShrink: 0, marginTop: 2 }} />
                {left}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "var(--color-foreground)", lineHeight: 1.5 }}>
                <CheckCircle2 size={12} style={{ color: "#10B981", flexShrink: 0, marginTop: 2 }} />
                {right}
              </div>
            </React.Fragment>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--color-muted-foreground)", margin: 0, lineHeight: 1.6 }}>
          Image-based and scanned PDFs are processed using AI vision (pages 1–3 and last 2 pages). Word documents, PowerPoint files, and images cannot be parsed — paste their content instead.
        </p>
      </div>

      {/* Parse button */}
      {parseError && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#ef4444", display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          We couldn't parse that. Try pasting smaller chunks or check the formatting.
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={parsing || !hasInput}
        style={{
          background: parsing || !hasInput ? "var(--hs-bg-secondary)" : "#7C3AED",
          color: parsing || !hasInput ? "var(--hs-text-muted)" : "#fff",
          border: "none",
          borderRadius: 10,
          padding: "13px 24px",
          fontSize: 14,
          fontWeight: 600,
          cursor: parsing || !hasInput ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          justifyContent: "center",
          marginBottom: 32,
        }}
      >
        {parsing ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Extracting founders and scoring against your thesis…
          </>
        ) : (
          <>
            <Sparkles size={15} />
            Parse and score →
          </>
        )}
      </button>

      {/* Per-file extraction status panel */}
      {fileResults.length > 0 && fileResults.some((r) => r.status !== "ok") && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            File processing results
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fileResults.map((r) => (
              <div
                key={r.file}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 14px", borderRadius: 8,
                  background: r.status === "ok"
                    ? "rgba(16,185,129,0.06)"
                    : r.status === "rejected"
                    ? "rgba(239,68,68,0.06)"
                    : "rgba(245,158,11,0.06)",
                  border: `1px solid ${r.status === "ok" ? "rgba(16,185,129,0.2)" : r.status === "rejected" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                }}
              >
                {r.status === "ok"
                  ? <CheckCircle2 size={13} style={{ color: "#10b981", flexShrink: 0, marginTop: 1 }} />
                  : r.status === "rejected"
                  ? <X size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                  : <AlertTriangle size={13} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.file}
                  </div>
                  {r.reason && (
                    <div style={{ fontSize: 11, color: r.status === "rejected" ? "#ef4444" : "#f59e0b", marginTop: 2, lineHeight: 1.4 }}>
                      {r.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {currentCandidates.length > 0 && (
        <div style={{ marginTop: 32 }}>
          {/* Summary bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-foreground)" }}>
              Found <span style={{ color: "#a78bfa" }}>{currentCandidates.length}</span> potential lead{currentCandidates.length !== 1 ? "s" : ""} from this batch
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["all", "strong", "on_platform", "off_platform"] as Filter[]).map((f) => {
                const labels: Record<Filter, string> = {
                  all: `All (${currentCandidates.length})`,
                  strong: `Strong fit (${strongCount})`,
                  on_platform: `On Hockystick (${onPlatformCount})`,
                  off_platform: `Not yet on Hockystick (${currentCandidates.length - onPlatformCount})`,
                };
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "5px 12px",
                      borderRadius: 99,
                      border: "1px solid",
                      cursor: "pointer",
                      background: activeFilter === f ? "rgba(124,58,237,0.15)" : "transparent",
                      borderColor: activeFilter === f ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.1)",
                      color: activeFilter === f ? "#a78bfa" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--color-muted-foreground)", fontSize: 14 }}>
              No results match this filter.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                watchlistNames={watchlistNames}
                onMarkReviewed={() => markReviewed(c.id)}
                onAddToWatchlist={() => addToWatchlist(c)}
                investorId={user?.id}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Candidate card ─────────────────────────────────────────────────────────────

// Fuzzy match: checks if a candidate company name is similar to any watchlist entry.
// Uses simple substring / token overlap (no external library needed).
function findWatchlistMatch(companyName: string, watchlistNames: string[]): string | null {
  if (!companyName || watchlistNames.length === 0) return null;
  const norm = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const wl of watchlistNames) {
    const wlNorm = wl.replace(/[^a-z0-9]/g, "");
    if (!wlNorm || !norm) continue;
    // Exact or substring match
    if (wlNorm.includes(norm) || norm.includes(wlNorm)) return wl;
    // Token overlap: any word >= 4 chars that appears in both
    const aTokens = norm.match(/[a-z0-9]{4,}/g) ?? [];
    const bTokens = new Set(wlNorm.match(/[a-z0-9]{4,}/g) ?? []);
    if (aTokens.some((t) => bTokens.has(t))) return wl;
  }
  return null;
}

function CandidateCard({
  candidate: c,
  watchlistNames = [],
  onMarkReviewed,
  onAddToWatchlist,
  investorId,
  compact = false,
}: {
  candidate: CandidateRow;
  watchlistNames?: string[];
  onMarkReviewed?: () => void;
  onAddToWatchlist?: () => void;
  investorId?: string;
  compact?: boolean;
}) {
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [addedToWatchlist, setAddedToWatchlist] = useState(false);
  const [briefResult, setBriefResult] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [alreadyInPipeline, setAlreadyInPipeline] = useState<string | null>(null);
  const color = fitColor(c.thesis_fit_score);

  // One-line "why" from thesis_fit_reasons[0]
  const whyLine = c.thesis_fit_reasons?.[0] ?? null;

  // Fuzzy duplicate detection against watchlist
  const dupMatch = findWatchlistMatch(c.company_name ?? "", watchlistNames);

  // Check if already in pipeline (matched_startup_id set — check via watchlist query on mount)
  const { data: pipelineStatus } = useQuery({
    queryKey: ["candidate-pipeline", c.matched_startup_id, investorId],
    enabled: !!c.matched_startup_id && !!investorId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("status")
        .eq("investor_id", investorId!)
        .ilike("company_name", `%${c.company_name ?? ""}%`)
        .limit(1)
        .maybeSingle();
      return data?.status ?? null;
    },
  });

  async function runFullAnalysis() {
    if (!c.matched_startup_id || !investorId || briefLoading) return;
    setBriefLoading(true);
    try {
      const { generateDealBrief } = await import("@/lib/deal-brief-fn");
      // generateDealBrief requires a dealRoomId — but for intake we use a synthetic call
      // by fetching from deal_briefs cache first (startup_id match)
      const { data: cached } = await supabase
        .from("deal_briefs")
        .select("*")
        .eq("startup_id", c.matched_startup_id)
        .eq("investor_id", investorId)
        .maybeSingle();
      if (cached) {
        setBriefResult(cached);
        setBriefLoading(false);
        return;
      }
      // No cache — fetch startup data and build a lightweight brief
      const { data: startup } = await supabase
        .from("startups")
        .select("id, company_name, tagline, product_description, funding_stage, website_url")
        .eq("id", c.matched_startup_id)
        .maybeSingle();
      if (startup) {
        // Minimal brief from available data (no extra AI call — just structured display)
        setBriefResult({
          headline: startup.tagline ?? startup.company_name,
          investment_thesis: startup.product_description ?? null,
          match_score: c.thesis_fit_score,
          strengths: c.thesis_fit_reasons ?? [],
        });
      }
    } catch {
      toast.error("Could not load analysis");
    } finally {
      setBriefLoading(false);
    }
  }

  return (
    <div
      className="bg-card border border-border/60 rounded-xl"
      style={{ padding: compact ? "14px 16px" : "20px", opacity: c.status === "reviewed" ? 0.6 : 1 }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span className="text-base font-semibold text-foreground">
              {c.company_name || "Unknown company"}
            </span>
            {c.founder_name && (
              <span style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>
                · {c.founder_name}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={badge(color)}>
              {color === "green" && <CheckCircle2 size={10} />}
              {color === "amber" && <AlertTriangle size={10} />}
              {fitLabel(c.thesis_fit_score)} · {c.thesis_fit_score}
            </span>
            {/* Already in pipeline badge (Part 2.3) */}
            {pipelineStatus ? (
              <span style={badge("green")}>
                <CheckCircle2 size={10} /> Already in pipeline — {pipelineStatus}
              </span>
            ) : c.matched_startup_id ? (
              <span style={badge("green")}>
                <CheckCircle2 size={10} /> On Hockystick — verified profile
              </span>
            ) : (
              <span style={badge("muted")}>Not on Hockystick yet</span>
            )}
          </div>
        </div>

        {/* Score circle */}
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: color === "green" ? "rgba(16,185,129,0.1)" : color === "amber" ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${color === "green" ? "rgba(16,185,129,0.25)" : color === "amber" ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.1)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700,
          color: color === "green" ? "#10b981" : color === "amber" ? "#f59e0b" : "rgba(255,255,255,0.3)",
        }}>
          {c.thesis_fit_score}
        </div>
      </div>

      {/* Why-line (Part 2.1) — first reason as a prominent single line */}
      {whyLine && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "flex-start" }}>
          <BookOpen size={11} style={{ color: "#a78bfa", marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{whyLine}</span>
        </div>
      )}

      {/* Remaining reasons (collapsible in compact mode) */}
      {!compact && c.thesis_fit_reasons && c.thesis_fit_reasons.length > 1 && (
        <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
          {c.thesis_fit_reasons.slice(1).map((r, i) => (
            <li key={i} style={{ fontSize: 12, color: "var(--color-muted-foreground)", display: "flex", gap: 6 }}>
              <span style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }}>·</span>
              {r}
            </li>
          ))}
        </ul>
      )}

      {/* Duplicate detection warning (Part 2.2) */}
      {dupMatch && !pipelineStatus && (
        <div style={{
          marginTop: 8, padding: "7px 12px",
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 7,
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <AlertCircle size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#f59e0b" }}>
            Similar to a company already in your pipeline
          </span>
          <a href="/app/investor/connections" style={{ fontSize: 11, color: "#f59e0b", textDecoration: "underline", marginLeft: "auto", flexShrink: 0 }}>
            View pipeline →
          </a>
        </div>
      )}

      {/* Contact info */}
      {(c.contact_email || c.contact_link) && (
        <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {c.contact_email && (
            <a href={`mailto:${c.contact_email}`} style={{ fontSize: 12, color: "#a78bfa", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              <ExternalLink size={11} /> {c.contact_email}
            </a>
          )}
          {c.contact_link && (
            <a href={c.contact_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#a78bfa", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              <ExternalLink size={11} /> {c.contact_link.replace(/^https?:\/\//, "").slice(0, 50)}
            </a>
          )}
        </div>
      )}

      {/* Actions */}
      {!compact && (
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {c.matched_startup_id && c.profile_slug && (
            <a
              href={`/p/${c.profile_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12, fontWeight: 600, color: "var(--color-foreground)",
                background: "#7C3AED", border: "none", borderRadius: 7,
                padding: "6px 14px", cursor: "pointer", textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              View profile <ExternalLink size={11} />
            </a>
          )}
          {/* Run full analysis (Part 2.4) — only when matched_startup_id exists */}
          {c.matched_startup_id && !briefResult && (
            <button
              onClick={runFullAnalysis}
              disabled={briefLoading}
              style={{
                fontSize: 12, fontWeight: 600, color: "#A855F7",
                background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.3)",
                borderRadius: 7, padding: "6px 14px", cursor: briefLoading ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 5, opacity: briefLoading ? 0.7 : 1,
              }}
            >
              {briefLoading ? <Loader2 size={11} className="animate-spin" /> : <FlaskConical size={11} />}
              Run full analysis
            </button>
          )}
          {onAddToWatchlist && !addedToWatchlist && !pipelineStatus && (
            <button
              onClick={() => { onAddToWatchlist(); setAddedToWatchlist(true); }}
              style={{
                fontSize: 12, fontWeight: 600, color: "#A855F7",
                background: "rgba(124,58,237,0.10)",
                border: "1px solid rgba(124,58,237,0.3)",
                borderRadius: 7,
                padding: "6px 14px", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              + Add to watchlist
            </button>
          )}
          {addedToWatchlist && (
            <span style={{ fontSize: 12, color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={11} /> Added to watchlist
            </span>
          )}
          {!c.matched_startup_id && c.status !== "reviewed" && onMarkReviewed && (
            <button
              onClick={onMarkReviewed}
              style={{
                fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: 7,
                padding: "6px 14px", cursor: "pointer",
              }}
            >
              Track this lead
            </button>
          )}
          {c.status === "reviewed" && (
            <span style={{ fontSize: 12, color: "var(--color-muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={11} /> Tracked
            </span>
          )}
          {c.raw_snippet && (
            <button
              onClick={() => setSnippetOpen((v) => !v)}
              style={{
                fontSize: 12, color: "var(--color-muted-foreground)",
                background: "transparent", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0,
              }}
            >
              {snippetOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {snippetOpen ? "Hide" : "Show"} original text
            </button>
          )}
        </div>
      )}

      {/* Run full analysis result card (Part 2.4) */}
      {briefResult && (
        <div style={{
          marginTop: 12, padding: "14px 16px",
          background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <FlaskConical size={12} style={{ color: "#a78bfa" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>Analysis</span>
            {briefResult.match_score != null && (
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: briefResult.match_score >= 70 ? "#10b981" : "#f59e0b" }}>
                {briefResult.match_score}% match
              </span>
            )}
          </div>
          {briefResult.headline && (
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)", margin: "0 0 6px", lineHeight: 1.4 }}>{briefResult.headline}</p>
          )}
          {briefResult.investment_thesis && (
            <p style={{ fontSize: 12, color: "var(--color-foreground)", margin: "0 0 8px", lineHeight: 1.5 }}>{briefResult.investment_thesis.slice(0, 200)}{briefResult.investment_thesis.length > 200 ? "…" : ""}</p>
          )}
          {briefResult.strengths?.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
              {briefResult.strengths.slice(0, 3).map((s: string, i: number) => (
                <li key={i} style={{ fontSize: 11, color: "#10b981", display: "flex", gap: 5 }}>
                  <CheckCircle2 size={10} style={{ marginTop: 2, flexShrink: 0 }} /> {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Snippet */}
      {snippetOpen && c.raw_snippet && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          background: "var(--color-muted)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--color-muted-foreground)",
          fontFamily: "monospace",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap" as const,
          wordBreak: "break-word" as const,
        }}>
          {c.raw_snippet}
        </div>
      )}
    </div>
  );
}
