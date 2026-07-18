import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  FileText, Shield, Clock, CheckCircle2, Download, X, Sparkles, Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ProfileChecklist } from "@/components/app/ProfileChecklist";
import { useTimedAI, AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";
import { AITimeoutError } from "@/lib/with-timeout";
import { runDealBrief, fetchDealBrief, markBriefViewed, type AgentDealBrief } from "@/lib/deal-brief-fn";
import { fetchNdaDocument, type NdaDocument } from "@/lib/nda-fn";
import { UI_STAGE_ORDER, stageRank, workflowStageLabel, type DealRoomStageKey } from "@/lib/deal-room-stages";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/overview")({
  component: OverviewPage,
});

function initials(name?: string | null) {
  return (name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return `$${value.toLocaleString()}`;
  const text = String(value);
  return text.startsWith("$") ? text : `$${text}`;
}

function formatValue(value: unknown, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

function OverviewPage() {
  const ctx = useDealRoom();
  const { room: dealRoom, startup, investorProfile, userId: currentUserId, pendingTransition, stageRequesting, doRequestNextStage: onRequestNextStage } = ctx;
  const queryClient = useQueryClient();

  const companyName = startup?.company_name ?? "Unknown";
  const companyInitial = companyName[0]?.toUpperCase() ?? "D";
  const daysOpen = dealRoom?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(dealRoom.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : "—";

  // Key-person cards only, public fields only (name/title/photo) — visible
  // from room entry regardless of disclosure stage, per the founder's
  // decision that a faceless room undermines trust. Full detail (bio,
  // highlights, social links) is Information-stage content, rendered
  // separately and gated by RLS on team_member_details.
  const { data: founderKeyPeople = [] } = useQuery({
    queryKey: ["deal-room-overview-founder-key-people", startup?.id],
    enabled: !!startup?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, name, title, photo_url, display_order")
        .eq("startup_id", startup.id)
        .eq("key_person", true)
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  const { data: investorKeyPeople = [] } = useQuery({
    queryKey: ["deal-room-overview-investor-key-people", dealRoom?.investor_user_id],
    enabled: !!dealRoom?.investor_user_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("investor_profiles")
        .select("id")
        .eq("user_id", dealRoom.investor_user_id)
        .maybeSingle();
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("investor_team_members")
        .select("id, name, designation, avatar_url")
        .eq("investor_profile_id", profile.id)
        .eq("key_person", true);
      return data ?? [];
    },
  });

  const dealBriefQueryKey = ["deal-room-overview-brief", startup?.id, dealRoom?.investor_user_id];
  const { data: dealBrief } = useQuery<AgentDealBrief | null>({
    queryKey: dealBriefQueryKey,
    enabled: !!startup?.id && !!dealRoom?.investor_user_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => fetchDealBrief(dealRoom.investor_user_id, startup.id),
  });

  useEffect(() => {
    if (dealBrief && !dealBrief.viewed_at) markBriefViewed(dealBrief.id).catch(() => {});
  }, [dealBrief?.id]);

  const { isWorking: generatingBrief, stillWorking: briefStillWorking, run: runBriefTimed } = useTimedAI();

  const handleGenerateBrief = async () => {
    if (!startup?.id || !dealRoom?.investor_user_id) return;
    try {
      await runBriefTimed(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token ?? "";
        const result = await runDealBrief({
          startupId: startup.id,
          investorId: dealRoom.investor_user_id,
          userId: currentUserId ?? "",
          jwt,
        });
        queryClient.setQueryData(dealBriefQueryKey, result);
        toast.success("Deal brief generated");
      });
    } catch (err) {
      toast.error(err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : "Failed to generate brief. Please try again.");
    }
  };

  const [ndaModalOpen, setNdaModalOpen] = useState(false);

  const { data: ndaDoc } = useQuery<NdaDocument | null>({
    queryKey: ["nda-document", dealRoom?.id],
    enabled: !!dealRoom?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => fetchNdaDocument({ data: { dealRoomId: dealRoom.id } }),
  });

  const { data: ndaSigners = [] } = useQuery({
    queryKey: ["nda-acceptances-overview", dealRoom?.id],
    enabled: !!dealRoom?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("nda_acceptances")
        .select("signer_full_name, signer_company, role, accepted_at")
        .eq("deal_room_id", dealRoom.id)
        .order("accepted_at", { ascending: true });
      return data ?? [];
    },
  });

  // R12B — the counterparty accepting the NDA must appear in this session
  // live, without a reload.
  useEffect(() => {
    if (!dealRoom?.id) return;
    const channel = supabase
      .channel(`nda-acceptances-${dealRoom.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nda_acceptances", filter: `deal_room_id=eq.${dealRoom.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ["nda-acceptances-overview", dealRoom.id] }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealRoom?.id, queryClient]);

  const handlePrintNda = () => {
    window.print();
  };

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["deal-room-overview-activity", startup?.id, dealRoom?.id],
    enabled: !!startup?.id && !!dealRoom?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("id,actor_name,action_type,target_label,created_at")
        .or(`account_id.eq.${startup.id},target_id.eq.${dealRoom.id}`)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const sectors = Array.isArray(investorProfile?.sectors)
    ? investorProfile?.sectors.join(", ")
    : investorProfile?.sectors;
  const workflowRank = stageRank(dealRoom?.workflow_stage);
  const progressStages = [
    { key: "overview" as DealRoomStageKey, label: "Overview" },
    { key: "information_vault" as DealRoomStageKey, label: "Info Vault" },
    { key: "qa" as DealRoomStageKey, label: "Q&A" },
    { key: "due_diligence" as DealRoomStageKey, label: "Due Diligence" },
    { key: "term_sheet" as DealRoomStageKey, label: "Term Sheet" },
    { key: "closing" as DealRoomStageKey, label: "Closing" },
  ];

  return (
    <div className="w-full px-6 py-6">
      <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-4 mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hs-gradient text-sm font-bold text-foreground">
              {companyInitial}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-gray-900">{companyName.toUpperCase()}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {startup?.stage && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-brand">
                    {startup.stage}
                  </span>
                )}
                {startup?.sector && <span className="text-sm text-gray-500">{startup.sector}</span>}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <div className="flex flex-wrap gap-6">
              {[
                ["Days open", daysOpen],
                ["Workflow", workflowStageLabel(dealRoom?.workflow_stage)],
                ["Match score", dealBrief?.match_score ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-[92px]">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-gray-500">
              {[dealRoom?.investor_name, dealRoom?.investor_company].filter(Boolean).join(" · ") || "Investor not assigned"}
            </div>
          </div>
        </div>
      </section>

      {startup?.id && (
        <section className="mb-4">
          <ProfileChecklist startupId={startup.id} compact canRegenerate={false} />
        </section>
      )}

      <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-4 mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">TRACTION METRICS</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Revenue", formatValue(startup?.revenue)],
            ["Burn rate", formatMoney(startup?.burn_rate)],
            ["Runway", formatValue(startup?.runway_months, "mo")],
            ["Team size", formatValue(startup?.team_size)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="text-xs uppercase tracking-wider text-gray-500">DEAL BRIEF</h3>
          <button
            type="button"
            data-testid="generate-brief-btn"
            onClick={handleGenerateBrief}
            disabled={generatingBrief || !dealRoom?.investor_user_id}
            className="inline-flex items-center gap-1.5 rounded-lg hs-gradient px-3 py-1.5 text-xs font-medium text-foreground transition-colors disabled:cursor-not-allowed disabled:bg-accent"
          >
            {generatingBrief ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {briefStillWorking ? "Still working…" : "Generating…"}
              </>
            ) : dealBrief ? (
              <>
                <Sparkles className="h-3 w-3" /> Refresh brief
              </>
            ) : (
              <>
                <FileText className="h-3 w-3" /> Generate brief
              </>
            )}
          </button>
        </div>

        {!dealRoom?.investor_user_id ? (
          <p className="text-sm text-[#71717A]">No investor assigned</p>
        ) : !dealBrief ? (
          <p className="text-sm text-[#71717A]">No brief</p>
        ) : (
          <div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={
                  dealBrief.match_score >= 80
                    ? { background: "rgba(16,185,129,0.12)", color: "#10B981" }
                    : dealBrief.match_score >= 50
                    ? { background: "rgba(245,158,11,0.12)", color: "#F59E0B" }
                    : { background: "rgba(239,68,68,0.12)", color: "#EF4444" }
                }
              >
                {dealBrief.match_score}/100
              </span>
              {dealBrief.headline && (
                <span className="text-sm font-semibold text-gray-900">{dealBrief.headline}</span>
              )}
            </div>
            {dealBrief.investment_thesis && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{dealBrief.investment_thesis}</p>
            )}
            <p className="mt-3 text-xs text-[#71717A]">
              {dealBrief.generated_at
                ? `Generated ${formatDistanceToNow(new Date(dealBrief.generated_at), { addSuffix: true })}`
                : null}
            </p>
          </div>
        )}
      </section>

      <section className="mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">NDA &amp; CONFIDENTIALITY</h3>
        <div className="bg-card border border-border/60 rounded-none p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]">
                <Shield className="h-4 w-4 text-[#10B981]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">NDA &amp; Confidentiality Agreement</div>
                {ndaDoc ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.12)] text-[#10B981] text-[11px] font-semibold px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Signed by {ndaSigners.length} {ndaSigners.length === 1 ? "party" : "parties"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      · v{ndaDoc.version} · updated {formatDistanceToNow(new Date(ndaDoc.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent text-muted-foreground text-[11px] font-semibold px-2 py-0.5">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {ndaDoc && (
                <>
                  <button
                    onClick={() => setNdaModalOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    View full NDA
                  </button>
                  <button
                    onClick={handlePrintNda}
                    className="inline-flex items-center gap-1.5 text-xs border border-border/60 rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {ndaSigners.length > 0 && (
            <div className="mt-4 border-t border-border/60 pt-4 space-y-2">
              {(ndaSigners as any[]).map((signer, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                    <span className="font-medium text-foreground">{signer.signer_full_name || "—"}</span>
                    {signer.signer_company && (
                      <span className="text-muted-foreground">· {signer.signer_company}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="capitalize">{signer.role}</span>
                    <span>·</span>
                    <span>{signer.accepted_at ? format(new Date(signer.accepted_at), "MMM d, yyyy") : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {ndaModalOpen && ndaDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden"
          onClick={() => setNdaModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-[#10B981]" />
                <div>
                  <div className="font-semibold text-sm text-foreground">Non-Disclosure Agreement</div>
                  <div className="text-xs text-muted-foreground">
                    {companyName} · v{ndaDoc.version} · {ndaSigners.length} {ndaSigners.length === 1 ? "party" : "parties"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintNda}
                  className="inline-flex items-center gap-1.5 text-xs bg-accent hover:bg-accent text-brand border border-brand/20 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => setNdaModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans">
                {ndaDoc.nda_text}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="nda-print-content hidden print:block">
        <div style={{ fontFamily: "serif", maxWidth: "700px", margin: "0 auto", padding: "40px 0" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#6B7280", marginBottom: "4px" }}>Hockystick</div>
            <div style={{ fontSize: "18px", fontWeight: "700" }}>{companyName}</div>
            <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>
              Non-Disclosure Agreement · v{ndaDoc?.version ?? 1} · Generated {ndaDoc?.updated_at ? format(new Date(ndaDoc.updated_at), "MMMM d, yyyy") : ""}
            </div>
          </div>
          <pre style={{ fontSize: "11px", lineHeight: "1.7", whiteSpace: "pre-wrap", fontFamily: "serif", color: "#111827" }}>
            {ndaDoc?.nda_text ?? ""}
          </pre>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">FOUNDER</div>
          <div className="font-semibold text-gray-900">{companyName}</div>
          {startup?.country && <div className="mt-1 text-sm text-gray-500">{startup.country}</div>}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Founded: {formatValue(startup?.founded_year)}</span>
            <span>Team: {formatValue(startup?.team_size)}</span>
          </div>
          {startup?.description && <p className="mt-3 line-clamp-3 text-sm text-gray-600">{startup.description}</p>}

          {founderKeyPeople.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 border-t border-[rgba(0,0,0,0.08)] pt-3">
              {(founderKeyPeople as any[]).map((person) => (
                <div key={person.id} className="flex items-center gap-2 min-w-[140px]">
                  {person.photo_url ? (
                    <img src={person.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full hs-gradient text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(person.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{person.name ?? "Team member"}</div>
                    {person.title && <div className="text-xs text-gray-500 truncate">{person.title}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">INVESTOR</div>
          {dealRoom?.investor_name ? (
            <>
              <div className="font-semibold text-gray-900">{dealRoom.investor_name}</div>
              {dealRoom?.investor_company && <div className="mt-1 text-sm text-gray-500">{dealRoom.investor_company}</div>}
              {investorProfile?.thesis && <p className="mt-3 text-sm line-clamp-2 text-gray-600">{investorProfile.thesis}</p>}
              {investorProfile?.thesis_statement && !investorProfile?.thesis && (
                <p className="mt-3 text-sm line-clamp-2 text-gray-600">{investorProfile.thesis_statement}</p>
              )}
              {sectors && <div className="mt-3 text-sm text-gray-500">{sectors}</div>}
              {dealBrief?.match_score !== undefined && (
                <div className="mt-3 text-sm text-gray-500">
                  Match score: <span className="font-semibold text-gray-900">{dealBrief.match_score}</span>
                </div>
              )}

              {investorKeyPeople.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 border-t border-[rgba(0,0,0,0.08)] pt-3">
                  {(investorKeyPeople as any[]).map((person) => (
                    <div key={person.id} className="flex items-center gap-2 min-w-[140px]">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full hs-gradient text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(person.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{person.name ?? "Team member"}</div>
                        {person.designation && <div className="text-xs text-gray-500 truncate">{person.designation}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No investor</p>
          )}
        </div>
      </section>

      <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-4 mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-4">RECENT ACTIVITY</h3>
        {recentActivity.length === 0 ? (
          <p className="text-[#71717A] text-sm">No activity</p>
        ) : (
          <div className="space-y-3">
            {(recentActivity as any[]).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full hs-gradient mt-1.5 flex-shrink-0" />
                <div className="min-w-0 text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">{activity.actor_name ?? "Someone"}</span>
                  <span> · {activity.action_type ?? activity.target_label ?? "Activity"}</span>
                </div>
                <div className="ml-auto whitespace-nowrap text-xs text-[#71717A]">
                  {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-4" data-testid="stage-progress-bar">
        <div className="flex items-start">
          {progressStages.map((stage, index) => {
            const rank = UI_STAGE_ORDER.indexOf(stage.key);
            const isCurrent = rank === workflowRank;
            const isComplete = rank < workflowRank;
            const dotClass = isCurrent
              ? "hs-gradient text-white"
              : isComplete
                ? "bg-green-500 text-white"
                : "bg-gray-300 text-gray-500";
            const lineClass = rank < workflowRank ? "bg-green-500" : "bg-gray-200";
            return (
              <div key={stage.key} className="flex flex-1 items-start last:flex-none">
                <div className="flex min-w-[64px] flex-col items-center gap-2">
                  <div className={`h-4 w-4 rounded-full ${dotClass}`} data-testid={`stage-progress-dot-${stage.key}`} />
                  <div className="text-center text-xs text-gray-500">{stage.label}</div>
                </div>
                {index < progressStages.length - 1 && <div className={`mt-2 h-0.5 flex-1 ${lineClass}`} />}
              </div>
            );
          })}
        </div>
        {stageRank(dealRoom?.workflow_stage) !== stageRank("closing") && (
          <div className="mt-5 flex justify-end">
            {pendingTransition ? (
              <span className="text-xs text-amber-600 px-3 py-2">Stage advance pending approval…</span>
            ) : (
              <button
                onClick={onRequestNextStage}
                disabled={stageRequesting}
                className="inline-flex items-center gap-1.5 hs-gradient text-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                data-testid="request-next-stage"
              >
                {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Request next stage →
              </button>
            )}
          </div>
        )}
      </section>
      <span className="sr-only">Overview loaded for {currentUserId}</span>
    </div>
  );
}
