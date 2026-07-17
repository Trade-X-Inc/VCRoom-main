import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  BadgeCheck, CheckCircle2, XCircle, AlertTriangle, Clock, Loader2,
  Plus, Paperclip, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { StartupClaim, ClaimCategory, ClaimVerdict } from "@/lib/claims-fn";
import { useTimedAI, AITimeoutError, AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";
import { EmptyState, PageBreadcrumb } from "@/components/system";

export const Route = createFileRoute("/app/claims")({
  // R9 relocation: this URL's content moved — see nav-structure.ts.
  beforeLoad: () => {
    throw redirect({ to: "/app/prepare/workstation/claims" as any, replace: true });
  },
  component: ClaimsPage,
});

const CATEGORIES: { value: ClaimCategory; label: string }[] = [
  { value: "financial", label: "Financial" },
  { value: "legal", label: "Legal" },
  { value: "operational", label: "Operational" },
  { value: "team", label: "Team" },
];

const VERDICT_STYLE: Record<ClaimVerdict, { bg: string; border: string; color: string; label: string; Icon: typeof CheckCircle2 }> = {
  verified: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.2)", color: "#10B981", label: "Verified", Icon: CheckCircle2 },
  insufficient: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.2)", color: "#F59E0B", label: "Insufficient evidence", Icon: AlertTriangle },
  contradicted: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", color: "#EF4444", label: "Contradicted by evidence", Icon: XCircle },
};

export function ClaimsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<ClaimCategory>("financial");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<StartupClaim | null>(null);

  const { data: startup } = useQuery({
    queryKey: ["claims-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups").select("id, company_name").eq("founder_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: claims = [], refetch } = useQuery<StartupClaim[]>({
    queryKey: ["claims-list", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_claims")
        .select("*")
        .eq("startup_id", startup!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as StartupClaim[];
    },
  });

  const verifiedClaims = claims.filter((c) => c.ai_verdict === "verified");
  const verifiedFinancial = verifiedClaims.filter((c) => c.claim_category === "financial");
  const gateMet = verifiedClaims.length >= 3 && verifiedFinancial.length >= 1;

  const handleAdd = async () => {
    if (!startup?.id || adding) return;
    setAdding(true);
    try {
      const { addManualClaim } = await import("@/lib/claims-fn");
      const r = await addManualClaim({
        data: { startup_id: startup.id, claim_text: newText, claim_category: newCategory },
      });
      if (r.ok) {
        setNewText("");
        await refetch();
        toast.success("Claim added — now attach evidence to verify it");
      } else {
        toast.error(r.error ?? "Could not add claim");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (claim: StartupClaim) => {
    if (!startup?.id) return;
    const { deleteClaim } = await import("@/lib/claims-fn");
    await deleteClaim({ data: { startup_id: startup.id, claim_id: claim.id } });
    await refetch();
    qc.invalidateQueries({ queryKey: ["startup-claims", startup.id] });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 py-4 shrink-0">
        <PageBreadcrumb items={[{ label: "Your raise", to: "/app/prepare" }, { label: "Claims" }]} />
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground shrink-0">
            <BadgeCheck className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Claims</h1>
            <div className="text-xs text-muted-foreground">
              Tier 2 — every number you state, backed by a document our AI confirmed supports it.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="min-w-0 space-y-4">
        {/* Gate status */}
        <div className="bg-card border border-border/60 rounded-none px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm">
            <span className={gateMet ? "text-foreground font-medium" : "text-muted-foreground"}>
              {verifiedClaims.length} claim{verifiedClaims.length === 1 ? "" : "s"} verified
              {" · "}{verifiedFinancial.length} financial
            </span>
            <div className="text-xs text-muted-foreground mt-0.5">
              Claims Verified requires at least 3 verified claims, including at least 1 financial claim.
            </div>
          </div>
          {gateMet ? (
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}>
              ✓ Requirement met
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
              {Math.max(0, 3 - verifiedClaims.length)} more needed
            </span>
          )}
        </div>

        {/* Add claim */}
        <div className="bg-card border border-border/60 rounded-none p-5 space-y-3">
          <div className="text-sm font-semibold">Add a claim</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            State one specific, checkable fact — "$42K MRR as of June 2026", "DIFC registered entity",
            "3 signed enterprise contracts". You'll attach one document as evidence for each claim.
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder='e.g. "$42K MRR as of June 2026"'
              className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-brand/50"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as ClaimCategory)}
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={adding || newText.trim().length < 8 || !startup?.id}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-40"
              style={{ background: "var(--gradient-brand)" }}
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </button>
          </div>
        </div>

        {/* Claims list */}
        {claims.length === 0 ? (
          <EmptyState kind="empty" title="No claims" />
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => {
              const verdict = claim.ai_verdict ? VERDICT_STYLE[claim.ai_verdict] : null;
              return (
                <div key={claim.id} className="bg-card border border-border/60 rounded-none p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {claim.claim_type.startsWith("custom_") ? claim.claim_value : `${claim.claim_label}: ${claim.claim_value}`}
                        </span>
                        {claim.claim_category && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground">
                            {claim.claim_category}
                          </span>
                        )}
                      </div>
                      {verdict ? (
                        <div className="mt-2 rounded-lg px-3 py-2" style={{ background: verdict.bg, border: `1px solid ${verdict.border}` }}>
                          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: verdict.color }}>
                            <verdict.Icon className="h-3.5 w-3.5" /> {verdict.label}
                            {claim.ai_confidence && <span className="opacity-60">· {claim.ai_confidence} confidence</span>}
                          </div>
                          {claim.ai_reasoning && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{claim.ai_reasoning}</p>
                          )}
                          {claim.ai_checked_at && (
                            <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              Checked {new Date(claim.ai_checked_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Unverified — no evidence attached
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setVerifying(claim)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground"
                        style={{ background: "var(--gradient-brand)" }}
                      >
                        <Paperclip className="h-3 w-3" />
                        {claim.ai_verdict ? "Re-verify" : "Verify this claim"}
                      </button>
                      {claim.claim_type.startsWith("custom_") && (
                        <button
                          onClick={() => handleDelete(claim)}
                          title="Delete claim"
                          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-xs text-muted-foreground leading-relaxed pt-2">
          Claims synced from your <Link to={"/app/profile" as any} className="text-brand hover:underline">profile</Link> appear
          here automatically. The AI is conservative by instruction: a pitch deck never verifies a financial
          claim, and when in doubt it returns "insufficient" rather than guessing in your favor.
        </div>
        </div>

        {/* Right panel — example verified claims */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="bg-card border border-border/60 rounded-none p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              What good claims look like
            </div>
            <div className="space-y-2.5">
              {[
                { text: "$42K MRR as of June 2026", cat: "Financial", evidence: "Bank statement" },
                { text: "DIFC registered entity, license #4821", cat: "Legal", evidence: "Trade license" },
                { text: "3 signed enterprise contracts", cat: "Operational", evidence: "Signed contracts" },
              ].map((ex) => (
                <div key={ex.text} className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-medium leading-snug">{ex.text}</div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                      <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                    </span>
                  </div>
                  <div className="mt-1.5 text-[10px] text-muted-foreground">{ex.cat} · Evidence: {ex.evidence}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              One specific number or fact per claim, backed by one document that states it directly.
              Vague claims ("strong growth") can't be verified.
            </p>
          </div>
          <div className="rounded-lg p-5" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div className="text-sm font-semibold mb-1.5">Two minutes per claim</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Type the claim, attach the document, and the AI returns a verdict immediately.
              Three verified claims (one financial) earn the Claims Verified badge.
            </p>
          </div>
        </aside>
        </div>
      </div>

      {verifying && startup?.id && user?.id && (
        <VerifyClaimModal
          claim={verifying}
          startupId={startup.id}
          userId={user.id}
          onClose={() => setVerifying(null)}
          onDone={() => { refetch(); qc.invalidateQueries({ queryKey: ["startup-claims", startup.id] }); }}
        />
      )}
    </div>
  );
}

// ── Verify modal — extract text client-side, get the AI verdict ──────────────

function VerifyClaimModal({
  claim, startupId, userId, onClose, onDone,
}: {
  claim: StartupClaim;
  startupId: string;
  userId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ClaimCategory>(claim.claim_category ?? "financial");
  const { isWorking: running, stillWorking, run } = useTimedAI();
  const [result, setResult] = useState<{ verdict: ClaimVerdict; reasoning: string | null } | null>(null);

  const claimText = claim.claim_type.startsWith("custom_")
    ? claim.claim_value
    : `${claim.claim_label}: ${claim.claim_value}`;

  const handleVerify = async () => {
    if (!file || running) return;
    try {
      await run(async () => {
        const { extractDocumentText } = await import("@/lib/document-extractor");
        const text = await extractDocumentText(file, file.name);
        const { verifyClaim } = await import("@/lib/claims-fn");
        const r = await verifyClaim({
          data: {
            startup_id: startupId,
            claim_id: claim.id,
            claim_text: claimText,
            claim_category: category,
            document_text: text,
            document_name: file.name,
            user_id: userId,
          },
        });
        if (!r.ok || !r.verdict) {
          toast.error(r.error ?? "Verification failed — try again.");
          return;
        }
        setResult({ verdict: r.verdict, reasoning: r.reasoning });
        onDone();
      });
    } catch (err) {
      toast.error(err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : "Verification failed — try again.");
    }
  };

  const v = result ? VERDICT_STYLE[result.verdict] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>Verify claim</div>
            <div className="text-xs text-muted-foreground mt-1">{claimText}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {!result ? (
          <>
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1">Claim category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ClaimCategory)}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand/50"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 rounded-none border border-dashed border-border/60 px-4 py-6 cursor-pointer mb-4">
              <Paperclip className="h-5 w-5 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground text-center">
                {file ? file.name : "Select the ONE document that proves this claim — PDF, DOCX, XLSX, CSV"}
              </span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="rounded-lg px-3.5 py-2.5 mb-4 text-xs text-muted-foreground leading-relaxed" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
              The AI checks whether this document contains evidence for this exact claim. A pitch deck
              will not verify a financial claim. A contradicting document is recorded as contradicted —
              which investors can see.
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={handleVerify}
                disabled={!file || running}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-40"
                style={{ background: "var(--gradient-brand)" }}
              >
                {running
                  ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> {stillWorking ? "Still working…" : "Checking document…"}</span>
                  : "Run AI verification"}
              </button>
            </div>
          </>
        ) : v ? (
          <>
            <div className="rounded-lg px-4 py-3 mb-4" style={{ background: v.bg, border: `1px solid ${v.border}` }}>
              <div className="flex items-center gap-2 text-sm font-medium mb-1" style={{ color: v.color }}>
                <v.Icon className="h-4 w-4" /> {v.label}
              </div>
              {result.reasoning && <p className="text-xs text-muted-foreground leading-relaxed">{result.reasoning}</p>}
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-semibold text-foreground" style={{ background: "var(--gradient-brand)" }}>
                Done
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
