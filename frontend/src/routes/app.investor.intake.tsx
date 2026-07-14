import React from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Loader2, AlertTriangle, CheckCircle2, ExternalLink,
  ChevronDown, ChevronUp, FileInput, Upload, Link2,
  Plus, X, Download, Target, ArrowRight, Mail, History,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
// intake-fn contains createServerFn — static import causes TDZ crash in client bundle.
// Use dynamic import inside the async handler instead.
import type { IntakeCandidate } from "@/lib/intake-fn";
import type { IntakeFileResult } from "@/lib/document-extractor";
import { PageGuide } from "@/components/app/PageGuide";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

export const Route = createFileRoute("/app/investor/intake")({
  // P5: consolidated into the deal-flow steps — old links keep resolving.
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/source", hash: "intake", replace: true });
  },
  component: IntakePage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type IntakeRun = {
  id: string;
  created_at: string;
  input_summary: string;
  total_items: number;
  extracted_count: number;
  failed_count: number;
  results_json: CandidateRow[];
};

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
    background: "var(--accent)",
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

export function IntakePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { markStep, setCurrentStep } = useOnboardingProgress();

  const [rawInput, setRawInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<string[]>([""]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-file extraction results (shown even if no candidates extracted)
  const [fileResults, setFileResults] = useState<IntakeFileResult[]>([]);

  // Cards dismissed by the investor (local only — row stays in DB)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Current parse result state
  const [currentCandidates, setCurrentCandidates] = useState<CandidateRow[]>([]);
  // Which past run is currently loaded into the results panel (null = fresh parse or none)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Fetch investor profile (id + thesis fields + invite fields)
  const { data: investorProfile } = useQuery({
    queryKey: ["investor-profile-intake", user?.id],
    enabled: !!user?.id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("id, sectors, stages, geography, your_name, fund_name, invite_token")
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
      return data
        ? {
            ...data,
            sectors: toArr(data.sectors),
            stages: toArr(data.stages),
          } as {
            id: string;
            sectors: string[];
            stages: string[];
            geography: string | null;
            your_name: string | null;
            fund_name: string | null;
            invite_token: string | null;
          }
        : null;
    },
  });

  // Fetch past intake runs (last 5, newest first)
  const { data: intakeRuns = [], refetch: refetchRuns } = useQuery<IntakeRun[]>({
    queryKey: ["intake-runs", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("intake_runs")
        .select("id, created_at, input_summary, total_items, extracted_count, failed_count, results_json")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as IntakeRun[];
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
    setSelectedRunId(null);
    setFileResults([]);
    setDismissedIds(new Set());

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

    // Build input_summary for intake_runs: "N files, N paste, N links"
    const filePart = hasFiles ? `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? "s" : ""}` : "0 files";
    const pastePart = trimmed ? "1 paste" : "0 paste";
    const linkPart = hasLinks ? `${links.filter((l) => l.trim()).length} link${links.filter((l) => l.trim()).length !== 1 ? "s" : ""}` : "0 links";
    const inputSummary = `${filePart}, ${pastePart}, ${linkPart}`;

    // 1. Create legacy batch row (kept for backwards compat with existing DB rows)
    const { data: batch } = await supabase
      .from("investor_intake_batches")
      .insert({
        investor_profile_id: user!.id,
        raw_input: combinedInput,
        status: "processing",
      })
      .select("id")
      .single();

    // 2. Call AI parse server function
    try {
      const { parseIntakeBatch } = await import("@/lib/intake-fn");
      const result = await parseIntakeBatch({
        data: {
          batchId: batch?.id ?? "",
          investorProfileId: user!.id,
          rawInput: combinedInput,
        },
      });

      const failedCount = fileResults.filter((r) => r.status !== "ok").length;

      if (result.error) {
        setParseError(result.error);
        toast.error("We couldn't parse that. Try pasting smaller chunks or check the formatting.");
      } else if (result.candidates.length === 0) {
        toast.info("No identifiable founders or companies found in that text.");
        setCurrentCandidates([]);
        // Still save the run so the investor can see it in history
        const { error: runErr } = await supabase.from("intake_runs").insert({
          investor_id: user!.id,
          input_summary: inputSummary,
          total_items: 0,
          extracted_count: 0,
          failed_count: failedCount,
          results_json: [],
        });
      } else {
        // Re-fetch candidates from DB so we have IDs
        const { data: dbCandidates } = await supabase
          .from("investor_intake_candidates")
          .select("*")
          .eq("batch_id", batch?.id ?? "")
          .order("thesis_fit_score", { ascending: false });
        const candidates = (dbCandidates ?? []) as CandidateRow[];
        setCurrentCandidates(candidates);
        toast.success(`Found ${result.candidates.length} lead${result.candidates.length !== 1 ? "s" : ""}`);
        setRawInput("");
        setUploadedFiles([]);

        try {
          await markStep("intake_used", true);
          await setCurrentStep("done");
        } catch {
          // Non-fatal — onboarding progress is best-effort, never blocks intake results.
        }

        // Save intake run with full results_json for history restore
        const { error: runErr2 } = await supabase.from("intake_runs").insert({
          investor_id: user!.id,
          input_summary: inputSummary,
          total_items: result.candidates.length + failedCount,
          extracted_count: result.candidates.length,
          failed_count: failedCount,
          results_json: candidates,
        });
      }
    } catch (err: any) {
      setParseError(err.message);
      toast.error("We couldn't parse that. Try pasting smaller chunks or check the formatting.");
    } finally {
      setParsing(false);
      refetchRuns();
    }
  }

  // ── Load past run into results panel ──────────────────────────────────────

  function loadRun(run: IntakeRun) {
    if (selectedRunId === run.id) {
      // Toggle off: clear results panel
      setSelectedRunId(null);
      setCurrentCandidates([]);
      setFileResults([]);
      setDismissedIds(new Set());
      return;
    }
    setSelectedRunId(run.id);
    setCurrentCandidates(run.results_json);
    setFileResults([]);
    setDismissedIds(new Set());
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

  const hasInput = rawInput.trim() || uploadedFiles.length > 0 || links.some((l) => l.trim());

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8">

      {/* Header */}
      <div data-tour="intake-header" className="mb-7 flex items-start gap-3">
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

      {/* ── Past intake runs ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }} data-testid="past-runs-section">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <History size={13} style={{ color: "var(--color-muted-foreground)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Past intake runs
          </span>
        </div>
        {intakeRuns.length === 0 ? (
          <div className="rounded-none border border-border/60 bg-card px-5 py-4 text-sm text-muted-foreground">
            No intake runs
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {intakeRuns.map((run) => {
              const isActive = selectedRunId === run.id;
              const dateLabel = new Date(run.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              });
              return (
                <button
                  key={run.id}
                  data-testid="past-run-row"
                  onClick={() => loadRun(run)}
                  style={{
                    width: "100%", border: "none", cursor: "pointer",
                    padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
                    borderRadius: 12, textAlign: "left",
                    background: isActive ? "var(--accent)" : "var(--card)",
                    outline: isActive ? "1px solid var(--brand)" : "1px solid var(--border)",
                    transition: "background 0.15s, outline 0.15s",
                  }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: isActive ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <History size={13} style={{ color: "#a78bfa" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>
                      {dateLabel}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", marginTop: 2 }}>
                      {run.input_summary}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {run.extracted_count > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 99, padding: "2px 8px" }}>
                        {run.extracted_count} extracted
                      </span>
                    )}
                    {run.failed_count > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 99, padding: "2px 8px" }}>
                        {run.failed_count} failed
                      </span>
                    )}
                    {isActive
                      ? <ChevronUp size={13} style={{ color: "var(--color-muted-foreground)" }} />
                      : <ChevronDown size={13} style={{ color: "var(--color-muted-foreground)" }} />
                    }
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

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
                style={{ width: "100%", background: "var(--color-muted)", border: "1px dashed var(--border)", borderRadius: 8, padding: "10px", fontSize: 12, color: "var(--color-muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
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
      <div style={{ marginBottom: 16, padding: "14px 18px", background: "var(--accent)", border: "1px solid var(--color-border)", borderRadius: 10 }}>
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
          background: parsing || !hasInput ? "var(--hs-bg-secondary)" : "var(--brand)",
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

      {/* ── Results panel ──────────────────────────────────────────────── */}
      {(currentCandidates.length > 0 || fileResults.some((r) => r.status !== "ok")) && (
        <div style={{ marginTop: 32 }} data-testid="intake-results-panel">

          {/* Extracted candidates */}
          {currentCandidates.filter((c) => !dismissedIds.has(c.id)).length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                Extracted ({currentCandidates.filter((c) => !dismissedIds.has(c.id)).length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentCandidates
                  .filter((c) => !dismissedIds.has(c.id))
                  .map((c) => (
                    <ExtractedCard
                      key={c.id}
                      candidate={c}
                      investorProfile={investorProfile}
                      onDismiss={() => setDismissedIds((prev) => new Set([...prev, c.id]))}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Could not extract — failed/rejected files */}
          {fileResults.filter((r) => r.status !== "ok").length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                Could not extract ({fileResults.filter((r) => r.status !== "ok").length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fileResults
                  .filter((r) => r.status !== "ok")
                  .map((r) => (
                    <FailedCard key={r.file} result={r} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Extracted candidate card ───────────────────────────────────────────────────

function ExtractedCard({
  candidate: c,
  investorProfile,
  onDismiss,
}: {
  candidate: CandidateRow;
  investorProfile: { your_name: string | null; fund_name: string | null; invite_token: string | null } | null;
  onDismiss: () => void;
}) {
  const [addedToPipeline, setAddedToPipeline] = useState(false);
  const [addingToPipeline, setAddingToPipeline] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const color = fitColor(c.thesis_fit_score);

  async function handleAddToPipeline() {
    if (addedToPipeline || addingToPipeline) return;
    setAddingToPipeline(true);
    const { error } = await supabase
      .from("investor_intake_candidates")
      .update({ status: "identified" })
      .eq("id", c.id);
    setAddingToPipeline(false);
    if (error) {
      toast.error("Could not add to pipeline");
    } else {
      setAddedToPipeline(true);
      toast.success(`${c.company_name || "Lead"} added to pipeline`);
    }
  }

  function handleInvite() {
    const name = c.founder_name || "there";
    const company = c.company_name || "your work";
    const token = investorProfile?.invite_token ?? "";
    const inviterName = investorProfile?.your_name ?? "";
    const fundName = investorProfile?.fund_name ?? "";

    const subject = encodeURIComponent("Invitation to connect on Hockystick");
    const bodyLines = [
      `Hi ${name},`,
      "",
      `I came across ${company} and wanted to reach out.`,
      "",
      "I use Hockystick to manage my deal flow and review pitches — it gives founders a structured way to share materials with investors.",
      "",
      "I'd like to invite you to create a profile. It takes about 10 minutes:",
      `https://hockystick.app/join/investor/${token}`,
      "",
      inviterName,
      fundName,
    ].filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");

    const mailto = `mailto:${c.contact_email ?? ""}?subject=${subject}&body=${encodeURIComponent(bodyLines)}`;
    window.open(mailto, "_blank");
    setInviteSent(true);
  }

  // Metadata pills — only show fields that were actually extracted
  const pills: { label: string; value: string }[] = [];
  if ((c as any).funding_stage) pills.push({ label: "Stage", value: (c as any).funding_stage });
  if ((c as any).sector) pills.push({ label: "Sector", value: (c as any).sector });
  if ((c as any).geography) pills.push({ label: "Location", value: (c as any).geography });

  const btnBase: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "5px 12px",
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
    border: "1px solid", flexShrink: 0,
  };

  return (
    <div
      className="bg-card border border-border/60 rounded-none"
      style={{ padding: "16px 20px" }}
      data-testid="extracted-card"
    >
      {/* Source badge */}
      <div style={{ marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, color: "var(--color-muted-foreground)",
          background: "var(--accent)", border: "1px solid var(--color-border)",
          borderRadius: 4, padding: "2px 7px", textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          Pasted text
        </span>
      </div>

      {/* Name / company row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {c.founder_name && (
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-foreground)", lineHeight: 1.3 }}>
              {c.founder_name}
            </div>
          )}
          {c.company_name && (
            <div style={{ fontSize: 13, color: c.founder_name ? "var(--color-muted-foreground)" : "var(--color-foreground)", fontWeight: c.founder_name ? 400 : 600, marginTop: c.founder_name ? 2 : 0 }}>
              {c.company_name}
            </div>
          )}
          {c.contact_email && (
            <div style={{ fontSize: 12, color: "#a78bfa", fontFamily: "monospace", marginTop: 4 }}>
              {c.contact_email}
            </div>
          )}
          {c.contact_link && (
            <a
              href={c.contact_link} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#a78bfa", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}
            >
              <ExternalLink size={10} /> {c.contact_link.replace(/^https?:\/\//, "").slice(0, 45)}
            </a>
          )}
        </div>

        {/* Fit score */}
        <div style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          background: color === "green" ? "rgba(16,185,129,0.1)" : color === "amber" ? "rgba(245,158,11,0.1)" : "var(--faint)",
          border: `1px solid ${color === "green" ? "rgba(16,185,129,0.25)" : color === "amber" ? "rgba(245,158,11,0.25)" : "var(--faint)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700,
          color: color === "green" ? "#10b981" : color === "amber" ? "#f59e0b" : "var(--faint)",
        }}>
          {c.thesis_fit_score}
        </div>
      </div>

      {/* Metadata pills */}
      {pills.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {pills.map((p) => (
            <span key={p.label} style={{
              fontSize: 11, color: "var(--color-muted-foreground)",
              background: "var(--accent)", border: "1px solid var(--color-border)",
              borderRadius: 4, padding: "2px 8px",
            }}>
              {p.label}: {p.value}
            </span>
          ))}
        </div>
      )}

      {/* Fit reason */}
      {c.thesis_fit_reasons?.[0] && (
        <p style={{ fontSize: 11, color: "var(--color-muted-foreground)", margin: "8px 0 0", lineHeight: 1.5 }}>
          {c.thesis_fit_reasons[0]}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        {/* Add to pipeline */}
        <button
          onClick={handleAddToPipeline}
          disabled={addedToPipeline || addingToPipeline}
          data-testid="btn-add-to-pipeline"
          style={{
            ...btnBase,
            background: addedToPipeline ? "rgba(16,185,129,0.1)" : "rgba(124,58,237,0.1)",
            borderColor: addedToPipeline ? "rgba(16,185,129,0.3)" : "rgba(124,58,237,0.3)",
            color: addedToPipeline ? "var(--color-success, #10b981)" : "#a78bfa",
            opacity: (addedToPipeline || addingToPipeline) ? 0.7 : 1,
            cursor: (addedToPipeline || addingToPipeline) ? "default" : "pointer",
          }}
        >
          {addingToPipeline
            ? <><Loader2 size={10} className="animate-spin" /> Adding…</>
            : addedToPipeline
            ? <><CheckCircle2 size={10} /> Added to pipeline</>
            : <>+ Add to pipeline</>}
        </button>

        {/* Invite via mailto */}
        {c.contact_email && (
          <button
            onClick={handleInvite}
            data-testid="btn-invite"
            style={{
              ...btnBase,
              background: inviteSent ? "rgba(16,185,129,0.06)" : "transparent",
              borderColor: inviteSent ? "rgba(16,185,129,0.2)" : "var(--color-border)",
              color: inviteSent ? "var(--color-success, #10b981)" : "var(--color-muted-foreground)",
            }}
          >
            {inviteSent ? <><CheckCircle2 size={10} /> Invite sent</> : <><Mail size={10} /> Invite</>}
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          data-testid="btn-dismiss"
          style={{
            ...btnBase,
            background: "transparent",
            borderColor: "transparent",
            color: "var(--color-muted-foreground)",
            opacity: 0.6,
            marginLeft: "auto",
          }}
        >
          <X size={10} /> Dismiss
        </button>
      </div>
    </div>
  );
}

// ── Failed / rejected file card ────────────────────────────────────────────────

function FailedCard({ result: r }: { result: IntakeFileResult }) {
  const [removed, setRemoved] = useState(false);
  if (removed) return null;
  return (
    <div
      className="bg-card border border-border/60 rounded-none"
      style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}
      data-testid="failed-card"
    >
      <AlertTriangle size={14} style={{ color: "var(--color-muted-foreground)", flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.file}
        </div>
        {r.reason && (
          <div style={{ fontSize: 12, color: "var(--color-muted-foreground)", marginTop: 3, lineHeight: 1.5 }}>
            {r.reason}
          </div>
        )}
      </div>
      <button
        onClick={() => setRemoved(true)}
        style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted-foreground)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", flexShrink: 0 }}
      >
        Remove
      </button>
    </div>
  );
}
