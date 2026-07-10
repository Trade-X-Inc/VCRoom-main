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
import { extractDocumentText } from "@/lib/document-extractor";
import {
  extractProfileFromDocument,
  extractProfileFromInterview,
  getNextInterviewQuestion,
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
}

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
};

const TEXTAREA_FIELDS = new Set(["problem", "solution", "business_model", "traction", "use_of_funds", "competitive_advantage"]);

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
    const allowed = ["pdf", "pptx", "ppt", "docx", "doc", "xlsx", "xls"];
    const valid = Array.from(incoming).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return allowed.includes(ext);
    });
    if (valid.length < incoming.length) toast.warning("Some files skipped — only PDF, PPTX, DOCX, XLSX allowed.");
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

      // Extract text from all uploaded files
      let combinedText = "";
      const docIds: string[] = [];

      for (const file of uploadedFiles) {
        const text = await extractDocumentText(file, file.name);
        combinedText += `\n\n=== ${file.name} ===\n${text}`;

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

      // Call extraction AI
      const result = await extractProfileFromDocument({
        data: { userId: user!.id, documentText: combinedText },
      });

      if (result.error || !result.data) {
        setExtractionError(result.error ?? "Extraction failed");
        await patchSession(sid, { status: "error" });
      } else {
        await patchSession(sid, {
          extracted_data: result.data,
          missing_fields: result.missing_fields,
          status: "extracted",
        });
        setMissingFields(result.missing_fields);
        populateForm(result.data);
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

    const result = await extractProfileFromInterview({
      data: { userId: user!.id, transcript },
    });

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
    }
    setScreen("confirm");
  }

  // ── Confirmation helpers ───────────────────────────────────────────────────

  function populateForm(data: Record<string, unknown>) {
    setForm({
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
    });
  }

  function field<K extends keyof ExtractedProfile>(key: K) {
    return (val: ExtractedProfile[K]) => setForm((prev) => ({ ...prev, [key]: val }));
  }

  const isMissing = (key: string) => missingFields.includes(key) || !(form as any)[key];

  async function handleSave() {
    if (!startup?.id || !user?.id) return;
    setSaving(true);
    try {
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", startup.id);

      if (error) throw error;

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
          accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls"
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

function ConfirmScreen({
  form, missingFields, extractionError, saving, isMissing, onField, onSave,
}: {
  form: ExtractedProfile;
  missingFields: string[];
  extractionError: string | null;
  saving: boolean;
  isMissing: (key: string) => boolean;
  onField: <K extends keyof ExtractedProfile>(key: K) => (val: ExtractedProfile[K]) => void;
  onSave: () => void;
}) {
  const textareaFields = TEXTAREA_FIELDS;

  function FieldRow({ fieldKey }: { fieldKey: keyof ExtractedProfile }) {
    if (fieldKey === "team") return null; // handled separately
    const val = (form[fieldKey] as string) ?? "";
    const missing = isMissing(fieldKey as string);
    const style = missing ? missingBorder : inputBase;
    const isTA = textareaFields.has(fieldKey as string);

    return (
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>{FIELD_LABELS[fieldKey as string]}</label>
        {missing && (
          <div style={{ fontSize: 11, color: "#F59E0B", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={11} /> We couldn't find this — please fill it in.
          </div>
        )}
        {!missing && (
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
        ) : isTA ? (
          <textarea
            value={val}
            onChange={(e) => (onField(fieldKey) as (v: string | null) => void)(e.target.value)}
            rows={3}
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

        <div style={card}>
          {textFields.map((k) => <FieldRow key={k} fieldKey={k} />)}

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
