import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, MessageCircle, Sparkles, Send, Loader2, User,
  Check, AlertTriangle, Plus, X, ChevronRight, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { extractDocumentText, extractForIntake } from "@/lib/document-extractor";
import {
  extractProfileFromDocument,
  extractProfileFromInterview,
  getNextInterviewQuestion,
  detectAndExtractDocument,
  type TypedExtraction,
} from "@/lib/profile-builder-fn";
import { seedFounderPlaybook } from "@/lib/desk-fn";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { OnboardingTour } from "@/components/app/OnboardingTour";

export const Route = createFileRoute("/app/profile-builder")({
  component: ProfileBuilder,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type Screen = "select" | "upload" | "interview" | "extracting" | "confirm";

interface ExtractedProfile {
  company_name: string | null;
  tagline: string | null;
  sector: string | null;
  stage: string | null;
  problem: string | null;
  solution: string | null;
  business_model: string | null;
  market_size: string | null;
  traction: string | null;
  team: Array<{ name: string; role: string }>;
  funding_target: string | null;
  use_of_funds: string | null;
  competitive_advantage: string | null;
  // v3 — investor-ready output
  one_liner: string | null;
  investor_narrative: string | null;
  fundraising_instrument: string | null;
  fundraising_target_close: string | null;
  fundraising_committed_amount: string | null;
  // v3 — key metrics card
  mrr_usd: string | null;
  growth_rate: string | null;
  runway_months: string | null;
  team_size: string | null;
  founded_year: string | null;
  // v3 — cap table + legal (from document extraction)
  founder_ownership_pct: string | null;
  total_shareholders: string | null;
  has_options_pool: boolean | null;
  legal_entity_name: string | null;
  registration_number: string | null;
  incorporated_in: string | null;
  incorporated_at: string | null;
}

const V3_EMPTY = {
  one_liner: null, investor_narrative: null,
  fundraising_instrument: null, fundraising_target_close: null, fundraising_committed_amount: null,
  mrr_usd: null, growth_rate: null, runway_months: null, team_size: null, founded_year: null,
  founder_ownership_pct: null, total_shareholders: null, has_options_pool: null,
  legal_entity_name: null, registration_number: null, incorporated_in: null, incorporated_at: null,
} as const;

interface ChatMsg {
  id: string;
  role: "ai" | "founder";
  content: string;
}

const STAGES = ["Pre-idea", "Pre-revenue", "Pre-seed", "Seed", "Series A", "Series B", "Growth", "Profitable"];

const FIELD_LABELS: Record<string, string> = {
  company_name: "Company name",
  tagline: "Tagline",
  sector: "Sector",
  stage: "Stage",
  problem: "Problem",
  solution: "Solution",
  business_model: "Business model",
  market_size: "Market size",
  traction: "Traction",
  team: "Team",
  funding_target: "Funding target",
  use_of_funds: "Use of funds",
  competitive_advantage: "Competitive advantage",
  // v3
  one_liner: "One-liner (max 25 words)",
  investor_narrative: "Investor narrative",
  fundraising_instrument: "Instrument",
  fundraising_target_close: "Target close",
  fundraising_committed_amount: "Committed so far (USD)",
  mrr_usd: "MRR (USD)",
  growth_rate: "Growth rate",
  runway_months: "Runway (months)",
  team_size: "Team size",
  founded_year: "Founded year",
  founder_ownership_pct: "Founder ownership %",
  total_shareholders: "Shareholders",
  has_options_pool: "Options pool",
  legal_entity_name: "Legal name",
  registration_number: "Registration number",
  incorporated_in: "Jurisdiction",
  incorporated_at: "Incorporation date",
};

const TEXTAREA_FIELDS = new Set(["problem", "solution", "business_model", "traction", "use_of_funds", "competitive_advantage", "investor_narrative"]);

// ── Styles ─────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#111114",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  padding: 28,
};

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const missingBorder: React.CSSProperties = {
  ...inputBase,
  border: "1px solid rgba(245,158,11,0.4)",
  background: "rgba(245,158,11,0.04)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(255,255,255,0.4)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: 5,
};

// ── Main component ──────────────────────────────────────────────────────────────

function ProfileBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { progress, markStep, setCurrentStep } = useOnboardingProgress();

  const [screen, setScreen] = useState<Screen>("select");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Path A state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  /** Per-file detection results: shown in the UI, drives typed merging */
  const [docResults, setDocResults] = useState<Array<{ fileName: string; result: TypedExtraction }>>([]);
  /** v3 typed payloads merged across documents (financial/cap/legal/team) */
  const [extraV3, setExtraV3] = useState<{
    financial?: NonNullable<TypedExtraction["financial"]>;
    cap_table?: NonNullable<TypedExtraction["cap_table"]>;
    legal?: NonNullable<TypedExtraction["legal"]>;
    team?: NonNullable<TypedExtraction["team"]>;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Path B state
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [interviewDone, setInterviewDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Confirmation screen state
  const [form, setForm] = useState<ExtractedProfile>({
    company_name: null, tagline: null, sector: null, stage: null,
    problem: null, solution: null, business_model: null, market_size: null,
    traction: null, team: [], funding_target: null, use_of_funds: null,
    competitive_advantage: null,
    ...V3_EMPTY,
  });
  const [saving, setSaving] = useState(false);

  // Get current startup
  const { data: startup } = useQuery({
    queryKey: ["profile-builder-startup", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Check if already confirmed — redirect to dashboard if so
  useEffect(() => {
    if (!startup?.id) return;
    supabase
      .from("profile_builder_sessions")
      .select("id, status")
      .eq("startup_id", startup.id)
      .eq("status", "confirmed")
      .maybeSingle()
      .then(({ data }) => {
        if (data) navigate({ to: "/app" as any });
      });
  }, [startup?.id]);

  // Scroll chat to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, aiThinking]);

  // ── Session helpers ────────────────────────────────────────────────────────

  async function createSession(path: "upload" | "interview") {
    if (!startup?.id) { toast.error("No startup found — please complete your profile setup first."); return null; }
    const { data, error } = await supabase
      .from("profile_builder_sessions")
      .insert({ startup_id: startup.id, path, status: "in_progress" })
      .select("id")
      .single();
    if (error) { toast.error("Could not start session"); return null; }
    setSessionId(data.id);
    return data.id;
  }

  async function patchSession(id: string, patch: Record<string, unknown>) {
    await supabase
      .from("profile_builder_sessions")
      .update({ ...patch, updated_at: new Date().toISOString(), last_active_at: new Date().toISOString() })
      .eq("id", id);
  }

  // ── Path A — Upload flow ───────────────────────────────────────────────────

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const allowed = ["pdf", "pptx", "ppt", "docx", "doc", "xlsx", "xls", "csv"];
    const valid = Array.from(incoming).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return allowed.includes(ext);
    });
    if (valid.length < incoming.length) toast.warning("Some files skipped — only PDF, PPTX, DOCX, XLSX, CSV allowed.");
    setUploadedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  async function handleExtractFromDocuments() {
    if (!uploadedFiles.length) { toast.error("Add at least one file"); return; }
    setUploading(true);
    const sid = await createSession("upload");
    if (!sid) { setUploading(false); return; }

    try {
      setScreen("extracting");

      // Per-file: extract text (PDFs get the vision fallback for image-based
      // decks — same pattern as the intake parser), then detect the document
      // type and run the type-specific extraction.
      const docIds: string[] = [];
      const results: Array<{ fileName: string; result: TypedExtraction }> = [];

      for (const file of uploadedFiles) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        let text = "";
        if (ext === "pdf") {
          const intakeResult = await extractForIntake(file);
          text = intakeResult.status === "ok" ? (intakeResult.text ?? "") : "";
        }
        if (!text) {
          text = await extractDocumentText(file, file.name).catch(() => "");
        }

        const detection = await detectAndExtractDocument({
          data: { userId: user!.id, fileName: file.name, documentText: text },
        });
        results.push({ fileName: file.name, result: detection });

        // Store in founder_documents (same pattern as app.documents.tsx)
        if (startup?.id) {
          const filePath = `founder-docs/${startup.id}/profile-builder/${file.name}`;
          const { error: storageErr } = await supabase.storage
            .from("documents")
            .upload(filePath, file, { upsert: true });
          if (!storageErr) {
            const { data: docRow } = await supabase
              .from("founder_documents")
              .upsert({
                startup_id: startup.id,
                template_slug: "profile-builder-source",
                title: file.name,
                status: "complete",
                file_path: filePath,
                file_name: file.name,
                file_size: file.size,
                content: {},
                completeness_score: 100,
                updated_at: new Date().toISOString(),
              }, { onConflict: "startup_id,template_slug" })
              .select("id")
              .maybeSingle();
            if (docRow?.id) docIds.push(docRow.id);
          }
        }
      }

      if (docIds.length) {
        await patchSession(sid, { source_document_ids: docIds });
      }

      setDocResults(results);

      // Merge typed extractions across all documents
      const detected = results.filter((r) => r.result.document_type !== "unknown");
      if (detected.length === 0) {
        setExtractionError("Could not detect document type — please review manually. None of the uploaded files look like a pitch deck, financial model, cap table, legal document, or team roster.");
        await patchSession(sid, { status: "error" });
      } else {
        const merged: typeof extraV3 = {};
        let pitchData: Record<string, unknown> | null = null;
        const allMissing: string[] = [];
        for (const { result } of results) {
          if (result.pitch && !pitchData) pitchData = result.pitch;
          if (result.financial) merged.financial = { ...merged.financial, ...result.financial };
          if (result.cap_table) merged.cap_table = { ...merged.cap_table, ...result.cap_table };
          if (result.legal) merged.legal = { ...merged.legal, ...result.legal };
          if (result.team?.length) merged.team = [...(merged.team ?? []), ...result.team];
          allMissing.push(...result.missing_fields);
        }
        setExtraV3(merged);

        await patchSession(sid, {
          extracted_data: {
            pitch: pitchData,
            financial: merged.financial ?? null,
            cap_table: merged.cap_table ?? null,
            legal: merged.legal ?? null,
            team: merged.team ?? null,
            detections: results.map((r) => ({ file: r.fileName, type: r.result.document_type, confidence: r.result.confidence })),
          },
          missing_fields: allMissing,
          status: "extracted",
        });
        setMissingFields(pitchData ? (Array.isArray((pitchData as any).missing_fields) ? (pitchData as any).missing_fields : []) : []);
        if (pitchData) populateForm(pitchData);
        // Team roster from documents feeds the form's team editor
        if (merged.team?.length) {
          setForm((prev) => ({
            ...prev,
            team: [
              ...prev.team,
              ...merged.team!.filter((t) => !prev.team.some((p) => p.name === t.name))
                .map((t) => ({ name: t.name, role: t.title })),
            ],
          }));
        }
        // Metrics from documents + AI-drafted one-liner/narrative
        await enrichV3(pitchData ?? {}, undefined, merged);
      }
    } catch (err: any) {
      setExtractionError(err.message);
    } finally {
      setUploading(false);
      setScreen("confirm");
    }
  }

  // ── Path B — Interview flow ────────────────────────────────────────────────

  async function startInterview() {
    const sid = await createSession("interview");
    if (!sid) return;
    setScreen("interview");
    setQuestionIndex(0);
    setInterviewDone(false);
    setMsgs([]);
    // Fire first question
    await advanceInterview(sid, [], 0);
  }

  async function advanceInterview(sid: string, history: ChatMsg[], qIdx: number) {
    setAiThinking(true);
    try {
      const result = await getNextInterviewQuestion({
        data: {
          userId: user!.id,
          history: history.map((m) => ({ role: m.role, content: m.content })),
          questionIndex: qIdx,
          companyName: startup?.company_name ?? undefined,
        },
      });

      if (result.isDone) {
        setInterviewDone(true);
        const doneMsg: ChatMsg = { id: `ai-done`, role: "ai", content: result.question };
        setMsgs((prev) => [...prev, doneMsg]);
      } else {
        const aiMsg: ChatMsg = { id: `ai-${Date.now()}`, role: "ai", content: result.question };
        setMsgs((prev) => [...prev, aiMsg]);
        if (!result.isFollowUp) setQuestionIndex(qIdx + 1);
      }
    } catch {
      const fallback = qIdx < 10
        ? `Let's continue — what else can you tell me about that?`
        : "Thanks — I have enough to build your profile.";
      setMsgs((prev) => [...prev, { id: `ai-err-${Date.now()}`, role: "ai", content: fallback }]);
    } finally {
      setAiThinking(false);
    }
  }

  async function sendInterviewAnswer() {
    const text = chatInput.trim();
    if (!text || aiThinking || !sessionId) return;
    setChatInput("");

    const founderMsg: ChatMsg = { id: `f-${Date.now()}`, role: "founder", content: text };
    const updatedMsgs = [...msgs, founderMsg];
    setMsgs(updatedMsgs);

    // Persist transcript
    await patchSession(sessionId, { messages: updatedMsgs.map((m) => ({ role: m.role, content: m.content })) });

    if (interviewDone) return;
    await advanceInterview(sessionId, updatedMsgs, questionIndex);
  }

  async function finishInterview() {
    if (!sessionId) return;
    setScreen("extracting");

    const transcript = msgs
      .map((m) => `${m.role === "ai" ? "Interviewer" : "Founder"}: ${m.content}`)
      .join("\n\n");

    const result = (await extractProfileFromInterview({
      data: { userId: user!.id, transcript },
    })) as { data: Record<string, unknown> | null; missing_fields: string[]; error?: string };

    if (result.error || !result.data) {
      setExtractionError(result.error ?? "Extraction failed");
    } else {
      await patchSession(sessionId, {
        extracted_data: result.data,
        missing_fields: result.missing_fields,
        status: "extracted",
      });
      setMissingFields(result.missing_fields);
      populateForm(result.data);
      // AI-drafted one-liner, narrative, fundraising terms from the transcript
      await enrichV3(result.data, transcript);
    }
    setScreen("confirm");
  }

  // ── Confirmation helpers ───────────────────────────────────────────────────

  function populateForm(data: Record<string, unknown>) {
    setForm((prev) => ({
      ...prev,
      company_name: (data.company_name as string) ?? null,
      tagline: (data.tagline as string) ?? null,
      sector: (data.sector as string) ?? null,
      stage: (data.stage as string) ?? null,
      problem: (data.problem as string) ?? null,
      solution: (data.solution as string) ?? null,
      business_model: (data.business_model as string) ?? null,
      market_size: (data.market_size as string) ?? null,
      traction: (data.traction as string) ?? null,
      team: Array.isArray(data.team) ? (data.team as Array<{ name: string; role: string }>) : [],
      funding_target: (data.funding_target as string) ?? null,
      use_of_funds: (data.use_of_funds as string) ?? null,
      competitive_advantage: (data.competitive_advantage as string) ?? null,
    }));
  }

  /** Merge v3 typed document extractions + generate the investor-ready copy. */
  async function enrichV3(profileData: Record<string, unknown>, transcript?: string, extras?: typeof extraV3) {
    // Numbers from documents flow straight into the metrics fields
    if (extras) {
      setForm((prev) => ({
        ...prev,
        mrr_usd: extras.financial?.mrr_usd != null ? String(extras.financial.mrr_usd) : prev.mrr_usd,
        growth_rate: extras.financial?.growth_rate_3mo ?? prev.growth_rate,
        runway_months: extras.financial?.runway_months != null ? String(extras.financial.runway_months) : prev.runway_months,
        team_size: extras.financial?.headcount != null ? String(extras.financial.headcount) : prev.team_size,
        founder_ownership_pct: extras.cap_table?.founder_ownership_pct != null ? String(extras.cap_table.founder_ownership_pct) : prev.founder_ownership_pct,
        total_shareholders: extras.cap_table?.total_shareholders != null ? String(extras.cap_table.total_shareholders) : prev.total_shareholders,
        has_options_pool: extras.cap_table?.has_options_pool ?? prev.has_options_pool,
        legal_entity_name: extras.legal?.legal_name ?? prev.legal_entity_name,
        registration_number: extras.legal?.registration_number ?? prev.registration_number,
        incorporated_in: extras.legal?.jurisdiction ?? prev.incorporated_in,
        incorporated_at: extras.legal?.incorporated_at ?? prev.incorporated_at,
      }));
    }

    // AI-drafted one-liner, narrative, and fundraising terms — founder edits before saving
    try {
      const { generateProfileNarrative } = await import("@/lib/profile-builder-fn");
      const narrative = await generateProfileNarrative({
        data: { userId: user!.id, profile: profileData, transcript, extras: extras as Record<string, unknown> | undefined },
      });
      if (!narrative.error) {
        setForm((prev) => ({
          ...prev,
          one_liner: narrative.one_liner ?? prev.one_liner,
          investor_narrative: narrative.investor_narrative ?? prev.investor_narrative,
          fundraising_instrument: narrative.fundraising_instrument ?? prev.fundraising_instrument,
          fundraising_target_close: narrative.fundraising_target_close ?? prev.fundraising_target_close,
          fundraising_committed_amount: narrative.fundraising_committed_amount != null ? String(narrative.fundraising_committed_amount) : prev.fundraising_committed_amount,
        }));
      }
    } catch {
      // Narrative is an enhancement — never blocks the confirm screen.
    }
  }

  function field<K extends keyof ExtractedProfile>(key: K) {
    return (val: ExtractedProfile[K]) => setForm((prev) => ({ ...prev, [key]: val }));
  }

  const isMissing = (key: string) => missingFields.includes(key) || !(form as any)[key];

  async function handleSave() {
    if (!startup?.id || !user?.id) return;
    setSaving(true);
    try {
      const num = (v: string | null): number | undefined => {
        if (!v) return undefined;
        const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
        return Number.isFinite(n) ? n : undefined;
      };

      const { error } = await supabase
        .from("startups")
        .update({
          company_name: form.company_name ?? undefined,
          tagline: form.tagline ?? undefined,
          sector: form.sector ?? undefined,
          stage: form.stage ?? undefined,
          problem: form.problem ?? undefined,
          solution: form.solution ?? undefined,
          business_model: form.business_model ?? undefined,
          market_size: form.market_size ?? undefined,
          traction: form.traction ?? undefined,
          funding_target: form.funding_target ?? undefined,
          use_of_funds: form.use_of_funds ?? undefined,
          competitive_advantage: form.competitive_advantage ?? undefined,
          // v3 — investor-ready output
          one_liner: form.one_liner ?? undefined,
          investor_narrative: form.investor_narrative ?? undefined,
          fundraising_instrument: form.fundraising_instrument ?? undefined,
          fundraising_target_close: form.fundraising_target_close ?? undefined,
          fundraising_committed_amount: num(form.fundraising_committed_amount),
          // v3 — metrics card
          mrr_usd: num(form.mrr_usd),
          growth_rate: form.growth_rate ?? undefined,
          runway_months: num(form.runway_months),
          team_size: num(form.team_size),
          founded_year: num(form.founded_year),
          // v3 — cap table + legal
          founder_ownership_pct: num(form.founder_ownership_pct),
          total_shareholders: num(form.total_shareholders),
          has_options_pool: form.has_options_pool ?? undefined,
          legal_entity_name: form.legal_entity_name ?? undefined,
          registration_number: form.registration_number ?? undefined,
          incorporated_in: form.incorporated_in ?? undefined,
          incorporated_at: form.incorporated_at ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", startup.id);

      if (error) throw error;

      // Persist team to team_members (previously collected but never saved)
      const teamRows = form.team.filter((t) => t.name.trim());
      if (teamRows.length) {
        const { data: existingMembers } = await supabase
          .from("team_members")
          .select("name")
          .eq("startup_id", startup.id);
        const existingNames = new Set((existingMembers ?? []).map((m) => m.name));
        const newMembers = teamRows
          .filter((t) => !existingNames.has(t.name.trim()))
          .map((t, i) => ({
            startup_id: startup.id,
            name: t.name.trim(),
            title: t.role?.trim() || null,
            display_order: existingNames.size + i,
          }));
        if (newMembers.length) {
          await supabase.from("team_members").insert(newMembers);
        }
      }

      if (sessionId) {
        await patchSession(sessionId, {
          status: "confirmed",
          completed_at: new Date().toISOString(),
        });
      }

      // Seed playbook immediately so /app/desk has real content on first visit.
      // Blocking — prevents a race condition where the founder lands on the desk
      // before the task exists. A failure here must never block the founder.
      if (startup?.id && user?.id) {
        try {
          await seedFounderPlaybook({ data: { founderId: user.id, startupId: startup.id } });
        } catch {
          // Non-fatal — daily cron will catch it. Don't surface to user.
        }
      }

      queryClient.invalidateQueries({ queryKey: ["profile-builder-startup"] });

      try {
        await markStep("profile_completed", true);
        await setCurrentStep("publish");
      } catch {
        // Non-fatal — onboarding progress is best-effort, never blocks the founder.
      }

      toast.success("Profile saved!");
      navigate({ to: "/app" as any });
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (screen === "select") return <SelectScreen
    showIntro={!!progress && !progress.steps?.tour_viewed}
    onDismissIntro={() => markStep("tour_viewed", true)}
    onSelect={async (path) => {
      if (path === "upload") { setScreen("upload"); }
      else { await startInterview(); }
    }}
    onSkip={() => {
      localStorage.setItem("pb_skipped", "1");
      navigate({ to: "/app" as any });
    }}
  />;

  if (screen === "upload") return (
    <UploadScreen
      files={uploadedFiles}
      dragOver={dragOver}
      dropRef={dropRef}
      fileInputRef={fileInputRef}
      uploading={uploading}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onFiles={addFiles}
      onRemove={(name) => setUploadedFiles((prev) => prev.filter((f) => f.name !== name))}
      onSubmit={handleExtractFromDocuments}
    />
  );

  if (screen === "interview") return (
    <InterviewScreen
      msgs={msgs}
      input={chatInput}
      thinking={aiThinking}
      done={interviewDone}
      endRef={endRef}
      onInput={setChatInput}
      onSend={sendInterviewAnswer}
      onFinish={finishInterview}
    />
  );

  if (screen === "extracting") return <ExtractingScreen />;

  // confirm
  return (
    <ConfirmScreen
      form={form}
      missingFields={missingFields}
      extractionError={extractionError}
      saving={saving}
      isMissing={isMissing}
      onField={field}
      onSave={handleSave}
      docResults={docResults}
    />
  );
}

// ── SELECT ─────────────────────────────────────────────────────────────────────

function SelectScreen({
  onSelect,
  onSkip,
  showIntro,
  onDismissIntro,
}: {
  onSelect: (path: "upload" | "interview") => void;
  onSkip: () => void;
  showIntro?: boolean;
  onDismissIntro?: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      {showIntro && onDismissIntro && (
        <OnboardingTour
          steps={[{
            id: "intro",
            title: "Welcome to Hockystick",
            body: "Let's build your founder profile, then publish it and connect with investors. This first step takes about 10-15 minutes.",
          }]}
          activeIndex={0}
          onSkip={onDismissIntro}
          onNext={onDismissIntro}
          onFinish={onDismissIntro}
        />
      )}
      <div style={{ maxWidth: 660, width: "100%" }}>
        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: "rgba(124,58,237,0.8)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Profile Builder
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
          Let's build your profile
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", marginBottom: 40, lineHeight: 1.6 }}>
          Two ways to do this. Pick whichever is faster for you.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Card A — Documents */}
          <PathCard
            icon={<Upload size={24} style={{ color: "#a78bfa" }} />}
            title="I have documents"
            description="Upload your pitch deck, financials, or any materials you already have. We'll extract what we can and ask you to confirm or fill gaps."
            time="~10 minutes"
            cta="Upload documents →"
            onClick={() => onSelect("upload")}
          />
          {/* Card B — Interview */}
          <PathCard
            icon={<MessageCircle size={24} style={{ color: "#34d399" }} />}
            title="Start from scratch"
            description="No documents yet? We'll walk you through a structured conversation and build your profile from your answers."
            time="~15 minutes"
            cta="Start interview →"
            onClick={() => onSelect("interview")}
          />
        </div>

        {/* Skip — clearly visible, below the main paths, not buried */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            onClick={onSkip}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              padding: "8px 16px",
              borderRadius: 8,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            Skip for now — explore first
          </button>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
            You can always come back to this from your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function PathCard({ icon, title, description, time, cta, onClick }: {
  icon: React.ReactNode; title: string; description: string;
  time: string; cta: string; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#111114",
        border: `1px solid ${hover ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16,
        padding: 28,
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.12s",
        transform: hover ? "translateY(-2px)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{title}</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>{description}</p>
      </div>
      <div style={{ marginTop: "auto" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>{time}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>
          {cta} <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

// ── UPLOAD ─────────────────────────────────────────────────────────────────────

function UploadScreen({
  files, dragOver, dropRef, fileInputRef, uploading,
  onDrop, onDragOver, onDragLeave, onFiles, onRemove, onSubmit,
}: {
  files: File[]; dragOver: boolean;
  dropRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  uploading: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFiles: (f: FileList) => void;
  onRemove: (name: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 600, color: "rgba(124,58,237,0.8)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Step 1 of 2
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>
          Upload your documents
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>
          PDF, PPTX, DOCX, or XLSX. Add as many as you like — we'll extract from all of them.
        </p>

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "rgba(124,58,237,0.04)" : "transparent",
            transition: "all 0.15s",
            marginBottom: 16,
          }}
        >
          <Upload size={28} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
            Drop files here or click to browse
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            Pitch deck · Financials · Any document you have
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ""; }}
        />

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map((f) => (
              <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 10, background: "#111114", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px" }}>
                <FileText size={14} style={{ color: "#a78bfa", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>
                <button onClick={(e) => { e.stopPropagation(); onRemove(f.name); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 2, display: "flex" }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={!files.length || uploading}
          style={{
            width: "100%", background: files.length && !uploading ? "#7C3AED" : "rgba(255,255,255,0.06)",
            color: files.length && !uploading ? "#fff" : "rgba(255,255,255,0.3)",
            border: "none", borderRadius: 10, padding: "13px 24px",
            fontSize: 14, fontWeight: 600, cursor: files.length && !uploading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {uploading ? <><Loader2 size={15} className="animate-spin" /> Reading documents…</> : "Extract profile from documents →"}
        </button>
      </div>
    </div>
  );
}

// ── INTERVIEW ──────────────────────────────────────────────────────────────────

function InterviewScreen({
  msgs, input, thinking, done, endRef,
  onInput, onSend, onFinish,
}: {
  msgs: ChatMsg[]; input: string; thinking: boolean; done: boolean;
  endRef: React.RefObject<HTMLDivElement>;
  onInput: (v: string) => void;
  onSend: () => void;
  onFinish: () => void;
}) {
  return (
    <div style={{ height: "100vh", background: "#0A0A0B", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={16} style={{ color: "#a78bfa" }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Profile Interview</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Answer freely — we'll structure it for you</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {msgs.map((m) => (
            <div key={m.id} style={{ display: "flex", gap: 12, flexDirection: m.role === "founder" ? "row-reverse" : "row" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: m.role === "founder" ? "linear-gradient(135deg, #7C3AED, #a78bfa)" : "rgba(255,255,255,0.06)",
                border: m.role === "ai" ? "1px solid rgba(255,255,255,0.1)" : "none",
              }}>
                {m.role === "founder" ? <User size={14} style={{ color: "#fff" }} /> : <Sparkles size={14} style={{ color: "#a78bfa" }} />}
              </div>
              <div style={{
                maxWidth: "78%", padding: "12px 16px", borderRadius: 16, fontSize: 14, lineHeight: 1.6,
                background: m.role === "founder" ? "linear-gradient(135deg, #7C3AED, #6D28D9)" : "#111114",
                border: m.role === "ai" ? "1px solid rgba(255,255,255,0.07)" : "none",
                color: "#fff",
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {thinking && (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Sparkles size={14} style={{ color: "#a78bfa" }} />
              </div>
              <div style={{ padding: "12px 16px", borderRadius: 16, background: "#111114", border: "1px solid rgba(255,255,255,0.07)", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                <Loader2 size={13} className="animate-spin" /> Thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input or Finish */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "16px 24px", flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {done ? (
            <button
              onClick={onFinish}
              style={{ width: "100%", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 10, padding: "13px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Sparkles size={15} /> Build my profile from this conversation →
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#111114", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 10 }}>
              <textarea
                value={input}
                onChange={(e) => onInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                rows={1}
                placeholder="Type your answer…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, color: "#fff", padding: "4px 6px", maxHeight: 120 }}
              />
              <button
                onClick={onSend}
                disabled={!input.trim() || thinking}
                style={{ width: 34, height: 34, borderRadius: 8, background: input.trim() && !thinking ? "#7C3AED" : "rgba(255,255,255,0.06)", border: "none", cursor: input.trim() && !thinking ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <Send size={14} style={{ color: input.trim() && !thinking ? "#fff" : "rgba(255,255,255,0.3)" }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EXTRACTING ─────────────────────────────────────────────────────────────────

function ExtractingScreen() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0B", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Sparkles size={22} style={{ color: "#a78bfa" }} className="animate-pulse" />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 6 }}>Reading your documents…</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>This usually takes 10–20 seconds</div>
      </div>
      <div style={{ width: 200, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #7C3AED, #a78bfa)", borderRadius: 99, animation: "extractProgress 2s ease-in-out infinite" }} />
      </div>
      <style>{`@keyframes extractProgress { 0%{width:0%} 50%{width:80%} 100%{width:100%} }`}</style>
    </div>
  );
}

// ── CONFIRM ────────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  pitch_deck: "Pitch deck",
  financial_model: "Financial model",
  cap_table: "Cap table",
  legal_document: "Legal document",
  team_document: "Team document",
  unknown: "Not recognized",
};

// Human-readable summary of what a typed extraction actually pulled out,
// so the founder can see per-document what came from where.
function extractionSummary(r: TypedExtraction): string[] {
  const out: string[] = [];
  const push = (label: string, v: unknown) => {
    if (v !== null && v !== undefined && v !== "") out.push(`${label}: ${v}`);
  };
  if (r.pitch) {
    const filled = Object.entries(r.pitch).filter(([k, v]) => k !== "missing_fields" && v !== null && v !== "").length;
    out.push(`${filled} profile fields extracted`);
  }
  if (r.financial) {
    push("MRR", r.financial.mrr_usd != null ? `$${r.financial.mrr_usd.toLocaleString()}` : null);
    push("ARR", r.financial.arr_usd != null ? `$${r.financial.arr_usd.toLocaleString()}` : null);
    push("Growth (3mo)", r.financial.growth_rate_3mo);
    push("Runway", r.financial.runway_months != null ? `${r.financial.runway_months} months` : null);
    push("Monthly burn", r.financial.burn_rate_monthly_usd != null ? `$${r.financial.burn_rate_monthly_usd.toLocaleString()}` : null);
    push("Headcount", r.financial.headcount);
  }
  if (r.cap_table) {
    push("Founder ownership", r.cap_table.founder_ownership_pct != null ? `${r.cap_table.founder_ownership_pct}%` : null);
    push("Shareholders", r.cap_table.total_shareholders);
    push("Options pool", r.cap_table.has_options_pool == null ? null : r.cap_table.has_options_pool ? "yes" : "no");
    push("Shares issued", r.cap_table.total_shares_issued?.toLocaleString());
  }
  if (r.legal) {
    push("Legal name", r.legal.legal_name);
    push("Registration #", r.legal.registration_number);
    push("Jurisdiction", r.legal.jurisdiction);
    push("Incorporated", r.legal.incorporated_at);
  }
  if (r.team?.length) out.push(`${r.team.length} team member${r.team.length !== 1 ? "s" : ""} found`);
  return out;
}

// Module-scope so its identity is stable across ConfirmScreen re-renders —
// defining it inside the component remounted the input on every keystroke,
// dropping focus (and all but the first character of typed text).
function FieldRow({ fieldKey, optional, form, isMissing, onField }: {
  fieldKey: keyof ExtractedProfile;
  optional?: boolean;
  form: ExtractedProfile;
  isMissing: (key: string) => boolean;
  onField: <K extends keyof ExtractedProfile>(key: K) => (val: ExtractedProfile[K]) => void;
}) {
    if (fieldKey === "team") return null; // handled separately
    const val = (form[fieldKey] as string) ?? "";
    const missing = !optional && isMissing(fieldKey as string);
    const style = missing ? missingBorder : inputBase;
    const isTA = TEXTAREA_FIELDS.has(fieldKey as string);

    return (
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>{FIELD_LABELS[fieldKey as string]}</label>
        {missing && (
          <div style={{ fontSize: 11, color: "#F59E0B", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={11} /> We couldn't find this — please fill it in.
          </div>
        )}
        {!missing && !optional && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>
            AI-extracted — review and edit
          </div>
        )}
        {fieldKey === "stage" ? (
          <select
            value={val}
            onChange={(e) => (onField("stage") as (v: string | null) => void)(e.target.value)}
            style={{ ...style, appearance: "none" }}
          >
            <option value="">Select stage…</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : fieldKey === "fundraising_instrument" ? (
          <select
            value={val}
            onChange={(e) => (onField("fundraising_instrument") as (v: string | null) => void)(e.target.value || null)}
            style={{ ...style, appearance: "none" }}
          >
            <option value="">TBD</option>
            {["SAFE", "Equity", "Convertible Note"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : isTA ? (
          <textarea
            value={val}
            onChange={(e) => (onField(fieldKey) as (v: string | null) => void)(e.target.value)}
            rows={fieldKey === "investor_narrative" ? 9 : 3}
            style={{ ...style, resize: "vertical" }}
          />
        ) : (
          <input
            type="text"
            value={val}
            onChange={(e) => (onField(fieldKey) as (v: string | null) => void)(e.target.value)}
            style={style}
          />
        )}
      </div>
    );
}

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ margin: "26px 0 14px", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function ConfirmScreen({
  form, missingFields, extractionError, saving, isMissing, onField, onSave, docResults,
}: {
  form: ExtractedProfile;
  missingFields: string[];
  extractionError: string | null;
  saving: boolean;
  isMissing: (key: string) => boolean;
  onField: <K extends keyof ExtractedProfile>(key: K) => (val: ExtractedProfile[K]) => void;
  onSave: () => void;
  docResults?: Array<{ fileName: string; result: TypedExtraction }>;
}) {
  const fr = (fieldKey: keyof ExtractedProfile, optional?: boolean) => (
    <FieldRow key={fieldKey} fieldKey={fieldKey} optional={optional} form={form} isMissing={isMissing} onField={onField} />
  );

  const textFields: Array<keyof ExtractedProfile> = [
    "company_name", "tagline", "sector", "stage",
    "problem", "solution", "business_model", "market_size",
    "traction", "funding_target", "use_of_funds", "competitive_advantage",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0B", padding: "40px 16px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 600, color: "rgba(124,58,237,0.8)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Step 2 of 2
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
          Here's what we found. Confirm or fix anything that's off.
        </h2>
        {missingFields.length > 0 && (
          <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 24, fontSize: 12, color: "#F59E0B", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} />
            {missingFields.length} field{missingFields.length !== 1 ? "s" : ""} couldn't be found in your documents — please fill them in below.
          </div>
        )}
        {extractionError && (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 24, fontSize: 12, color: "#EF4444", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} />
            We had trouble processing that. You can still fill in the details manually below.
          </div>
        )}

        {/* Per-document detection results */}
        {docResults && docResults.length > 0 && (
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Documents we read</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
              What each file was detected as, and what we pulled from it.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {docResults.map(({ fileName, result }) => {
                const unknown = result.document_type === "unknown";
                const lowConf = result.confidence !== "high";
                const summary = extractionSummary(result);
                return (
                  <div key={fileName} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <FileText size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, wordBreak: "break-all" }}>{fileName}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                        background: unknown ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)",
                        color: unknown ? "#F59E0B" : "#10B981",
                      }}>
                        {DOC_TYPE_LABELS[result.document_type]}
                      </span>
                      {!unknown && (
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 999,
                          background: lowConf ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
                          color: lowConf ? "#F59E0B" : "rgba(255,255,255,0.4)",
                        }}>
                          {lowConf ? "Low confidence — double-check below" : "High confidence"}
                        </span>
                      )}
                    </div>
                    {unknown ? (
                      <div style={{ fontSize: 12, color: "#F59E0B", marginTop: 6 }}>
                        Could not detect document type — please review manually.{result.detail ? ` ${result.detail}` : ""}
                      </div>
                    ) : summary.length > 0 ? (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
                        {summary.map((s) => <span key={s}>{s}</span>)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                        Detected, but no structured fields could be extracted.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={card}>
          {textFields.map((k) => fr(k))}

          {/* Team */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Team</label>
            {!isMissing("team") && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>AI-extracted — review and edit</div>
            )}
            {isMissing("team") && (
              <div style={{ fontSize: 11, color: "#F59E0B", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={11} /> We couldn't find this — please fill it in.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.team.map((member, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => {
                      const updated = [...form.team];
                      updated[i] = { ...updated[i], name: e.target.value };
                      onField("team")(updated);
                    }}
                    style={{ ...inputBase, flex: 1 }}
                  />
                  <input
                    placeholder="Role / title"
                    value={member.role}
                    onChange={(e) => {
                      const updated = [...form.team];
                      updated[i] = { ...updated[i], role: e.target.value };
                      onField("team")(updated);
                    }}
                    style={{ ...inputBase, flex: 1 }}
                  />
                  <button
                    onClick={() => onField("team")(form.team.filter((_, j) => j !== i))}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: "0 4px", display: "flex", alignItems: "center" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => onField("team")([...form.team, { name: "", role: "" }])}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "rgba(255,255,255,0.4)", cursor: "pointer", width: "fit-content" }}
              >
                <Plus size={12} /> Add team member
              </button>
            </div>
          </div>

          {/* v3 — Investor-ready profile */}
          <SectionHeader
            title="Investor-ready profile"
            hint="AI-drafted from your answers and documents. Edit anything before publishing."
          />
          {fr("one_liner", true)}
          {fr("investor_narrative", true)}

          <SectionHeader
            title="Key metrics"
            hint="Shown as a metrics card on your profile. Leave blank what doesn't apply."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", columnGap: 12 }}>
            {fr("mrr_usd", true)}
            {fr("growth_rate", true)}
            {fr("runway_months", true)}
            {fr("team_size", true)}
            {fr("founded_year", true)}
          </div>

          <SectionHeader
            title="Fundraising status"
            hint="What you're raising, on what instrument, and how much is committed."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", columnGap: 12 }}>
            {fr("fundraising_instrument", true)}
            {fr("fundraising_target_close", true)}
            {fr("fundraising_committed_amount", true)}
          </div>

          <SectionHeader
            title="Legal & ownership"
            hint="From your cap table and incorporation documents, if provided."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", columnGap: 12 }}>
            {fr("legal_entity_name", true)}
            {fr("registration_number", true)}
            {fr("incorporated_in", true)}
            {fr("incorporated_at", true)}
            {fr("founder_ownership_pct", true)}
            {fr("total_shareholders", true)}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{FIELD_LABELS.has_options_pool}</label>
              <select
                value={form.has_options_pool === true ? "yes" : form.has_options_pool === false ? "no" : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  (onField("has_options_pool") as (v: boolean | null) => void)(v === "yes" ? true : v === "no" ? false : null);
                }}
                style={{ ...inputBase, appearance: "none" }}
              >
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          style={{
            marginTop: 24, width: "100%", background: saving ? "rgba(255,255,255,0.06)" : "#7C3AED",
            color: saving ? "rgba(255,255,255,0.3)" : "#fff",
            border: "none", borderRadius: 10, padding: "14px 24px",
            fontSize: 15, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Check size={15} /> Save and continue →</>}
        </button>
      </div>
    </div>
  );
}
