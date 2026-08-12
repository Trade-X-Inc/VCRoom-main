import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield, CheckCircle2, Download, X, Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ProfileChecklist } from "@/components/app/ProfileChecklist";
import { fetchNdaDocument, type NdaDocument } from "@/lib/nda-fn";
import { UI_STAGE_ORDER, stageRank, workflowStageLabel, type DealRoomStageKey } from "@/lib/deal-room-stages";
import { useDealRoom } from "@/hooks/useDealRoom";
import { ReferenceLine, StatusLabel, V2Button, V2Skeleton, V2EmptyState } from "@/components/v2";

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
  const { room: dealRoom, roomLoading, startup, investorProfile, userId: currentUserId, pendingTransition, stageRequesting, doRequestNextStage: onRequestNextStage } = ctx;
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

  // Deal Brief section removed 12 Aug 2026 — CLAUDE.md §19c/§19d. This
  // displayed dealBrief.match_score (a 0-100 AI score, color-banded) and
  // called runDealBrief -> the generate-deal-brief edge function, which was
  // already stubbed to 410 as a §15/§25 scoring violation earlier this
  // session. Leaving the display live on a freshly-rebuilt page would have
  // presented a closed violation as a working feature. This closes the
  // frontend half of that removal; fetchDealBrief/markBriefViewed remain
  // available in lib/deal-brief-fn.ts for any future legitimate use, only
  // this route's consumption of them is removed.

  const [ndaModalOpen, setNdaModalOpen] = useState(false);

  const { data: ndaDoc } = useQuery<NdaDocument | null>({
    queryKey: ["nda-document", dealRoom?.id],
    enabled: !!dealRoom?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return fetchNdaDocument({ data: { dealRoomId: dealRoom.id, accessToken: session?.access_token ?? "" } });
    },
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

  // Fix 6: room/startup are undefined until this resolves — render a loading
  // skeleton instead of the page with "Unknown"/"—" fallbacks (the empty-on-
  // first-load bug: hard-navigating straight to /overview showed empty content
  // because nothing gated on this).
  if (roomLoading) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-8 font-v2-ui">
        <V2Skeleton style={{ height: "96px" }} />
        <V2Skeleton style={{ height: "64px", marginTop: "16px" }} />
        <V2Skeleton style={{ height: "160px", marginTop: "16px" }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8 font-v2-ui text-v2-ink">
      {/* Fix 7 — dual company cards: founder's startup (left) + investor's fund
          (right), each with logo/name/tagline and a compact team-photo strip.
          Stats that used to live in the single-company header (days open,
          workflow) move into a slim strip below the cards so they still read
          at a glance without competing with either card. */}
      <ReferenceLine
        refNo={(dealRoom as any)?.reference_no}
        caption={dealRoom?.created_at ? `Deal room · opened ${format(new Date(dealRoom.created_at), "d MMMM yyyy")}` : null}
        className="mb-4"
      />
      <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Founder card */}
        <div className="bg-v2-panel border border-v2-rule p-4">
          <div className="mb-3 text-v2-accent uppercase font-medium" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>Founder</div>
          <div className="flex items-start gap-3">
            {startup?.logo_url ? (
              <img src={startup.logo_url} alt="" className="h-12 w-12 shrink-0 border border-v2-rule object-cover" style={{ borderRadius: "var(--v2-radius)" }} />
            ) : (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center bg-v2-accent text-white font-semibold"
                style={{ borderRadius: "var(--v2-radius)", fontSize: "13px" }}
              >
                {companyInitial}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-v2-ink font-semibold" style={{ fontSize: "15px" }}>{companyName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {startup?.stage && (
                  <span className="bg-v2-accent-wash text-v2-accent px-2 py-0.5 font-medium" style={{ borderRadius: "var(--v2-radius)", fontSize: "11.5px" }}>{startup.stage}</span>
                )}
                {startup?.sector && <span className="text-v2-ink-secondary" style={{ fontSize: "12.5px" }}>{startup.sector}</span>}
              </div>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-v2-ink-secondary" style={{ fontSize: "13px" }}>
            {startup?.tagline || startup?.description || "No tagline yet"}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-v2-ink-secondary" style={{ fontSize: "12.5px" }}>
            {startup?.country && <span>{startup.country}</span>}
            <span>Founded: {formatValue(startup?.founded_year)}</span>
            <span>Team: {formatValue(startup?.team_size)}</span>
          </div>
          {founderKeyPeople.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 border-t border-v2-rule-light pt-3">
              {(founderKeyPeople as any[]).map((person) => (
                <div key={person.id} className="flex items-center gap-2 min-w-[140px]">
                  {person.photo_url ? (
                    <img src={person.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-v2-accent text-white flex items-center justify-center font-semibold shrink-0" style={{ fontSize: "11px" }}>
                      {initials(person.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-v2-ink font-medium truncate" style={{ fontSize: "13px" }}>{person.name ?? "Team member"}</div>
                    {person.title && <div className="text-v2-ink-muted truncate" style={{ fontSize: "11.5px" }}>{person.title}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Investor card */}
        <div className="bg-v2-panel border border-v2-rule p-4">
          <div className="mb-3 text-v2-accent uppercase font-medium" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>Investor</div>
          {dealRoom?.investor_name ? (
            <>
              <div className="flex items-start gap-3">
                {investorProfile?.avatar_url ? (
                  <img src={investorProfile.avatar_url} alt="" className="h-12 w-12 shrink-0 border border-v2-rule object-cover" style={{ borderRadius: "var(--v2-radius)" }} />
                ) : (
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center bg-v2-accent text-white font-semibold"
                    style={{ borderRadius: "var(--v2-radius)", fontSize: "13px" }}
                  >
                    {initials(dealRoom.investor_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-v2-ink font-semibold" style={{ fontSize: "15px" }}>{dealRoom.investor_name}</h2>
                  {dealRoom?.investor_company && <div className="text-v2-ink-secondary" style={{ fontSize: "12.5px" }}>{dealRoom.investor_company}</div>}
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-v2-ink-secondary" style={{ fontSize: "13px" }}>
                {investorProfile?.thesis || investorProfile?.thesis_statement || "No thesis shared yet"}
              </p>
              {sectors && <div className="mt-2 text-v2-ink-secondary" style={{ fontSize: "12.5px" }}>{sectors}</div>}
              {investorKeyPeople.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 border-t border-v2-rule-light pt-3">
                  {(investorKeyPeople as any[]).map((person) => (
                    <div key={person.id} className="flex items-center gap-2 min-w-[140px]">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-v2-accent text-white flex items-center justify-center font-semibold shrink-0" style={{ fontSize: "11px" }}>
                          {initials(person.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-v2-ink font-medium truncate" style={{ fontSize: "13px" }}>{person.name ?? "Team member"}</div>
                        {person.designation && <div className="text-v2-ink-muted truncate" style={{ fontSize: "11.5px" }}>{person.designation}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-v2-ink-secondary" style={{ fontSize: "13px" }}>Investor not assigned</p>
          )}
        </div>
      </section>

      {/* Slim stats strip — was previously part of the single-company header */}
      <section className="bg-v2-panel border border-v2-rule p-4 mb-4">
        <div className="flex flex-wrap gap-6">
          {[
            ["Days open", daysOpen],
            ["Workflow", workflowStageLabel(dealRoom?.workflow_stage)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-[92px]">
              <div className="text-v2-ink-muted" style={{ fontSize: "11px" }}>{label}</div>
              <div className="mt-1 text-v2-ink font-semibold" style={{ fontSize: "15px" }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      {startup?.id && (
        <section className="mb-4">
          <ProfileChecklist startupId={startup.id} compact canRegenerate={false} />
        </section>
      )}

      <section className="bg-v2-panel border border-v2-rule p-4 mb-4">
        <h3 className="text-v2-ink-muted uppercase font-medium mb-2" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>Traction metrics</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Revenue", formatValue(startup?.revenue)],
            ["Burn rate", formatMoney(startup?.burn_rate)],
            ["Runway", formatValue(startup?.runway_months, "mo")],
            ["Team size", formatValue(startup?.team_size)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-v2-ink-muted" style={{ fontSize: "11px" }}>{label}</div>
              <div className="mt-1 text-v2-ink font-semibold font-v2-data" style={{ fontSize: "22px" }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="text-v2-ink-muted uppercase font-medium mb-2" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>NDA and confidentiality</h3>
        <div className="bg-v2-panel border border-v2-rule p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center border border-v2-rule" style={{ borderRadius: "var(--v2-radius)" }}>
                <Shield className="h-4 w-4 text-v2-satisfied" />
              </div>
              <div>
                <div className="text-sm font-semibold text-v2-ink">NDA and confidentiality agreement</div>
                {ndaDoc ? (
                  <div className="mt-1">
                    <StatusLabel tone="satisfied">
                      Signed by {ndaSigners.length} {ndaSigners.length === 1 ? "party" : "parties"}
                    </StatusLabel>
                    <span className="text-v2-ink-muted ml-2" style={{ fontSize: "11px" }}>
                      v{ndaDoc.version} · updated {formatDistanceToNow(new Date(ndaDoc.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1">
                    <StatusLabel tone="attention">Pending</StatusLabel>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {ndaDoc && (
                <>
                  <V2Button variant="quiet" onClick={() => setNdaModalOpen(true)}>
                    View full NDA
                  </V2Button>
                  <V2Button variant="secondary" onClick={handlePrintNda}>
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </V2Button>
                </>
              )}
            </div>
          </div>

          {ndaSigners.length > 0 && (
            <div className="mt-4 border-t border-v2-rule-light pt-4 space-y-2">
              {(ndaSigners as any[]).map((signer, i) => (
                <div key={i} className="flex items-center justify-between" style={{ fontSize: "12px" }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-v2-satisfied shrink-0" />
                    <span className="font-medium text-v2-ink">{signer.signer_full_name || "—"}</span>
                    {signer.signer_company && (
                      <span className="text-v2-ink-muted">· {signer.signer_company}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-v2-ink-muted">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 print:hidden"
          onClick={() => setNdaModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-v2-panel border border-v2-rule overflow-hidden flex flex-col"
            style={{ borderRadius: "var(--v2-radius)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-v2-rule shrink-0">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-v2-satisfied" />
                <div>
                  <div className="font-semibold text-sm text-v2-ink">Non-disclosure agreement</div>
                  <div className="text-v2-ink-muted" style={{ fontSize: "11.5px" }}>
                    {companyName} · v{ndaDoc.version} · {ndaSigners.length} {ndaSigners.length === 1 ? "party" : "parties"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <V2Button variant="secondary" onClick={handlePrintNda}>
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </V2Button>
                <button
                  onClick={() => setNdaModalOpen(false)}
                  className="p-1.5 hover:bg-v2-accent-wash transition-colors text-v2-ink-muted"
                  style={{ borderRadius: "var(--v2-radius)" }}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <pre className="text-xs leading-relaxed text-v2-ink-secondary whitespace-pre-wrap font-v2-doc">
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

      <section className="bg-v2-panel border border-v2-rule p-4 mb-4">
        <h3 className="text-v2-ink-muted uppercase font-medium mb-4" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>Recent activity</h3>
        {recentActivity.length === 0 ? (
          <V2EmptyState text="No activity recorded for this room yet." />
        ) : (
          <div className="space-y-3">
            {(recentActivity as any[]).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-v2-accent mt-1.5 flex-shrink-0" style={{ borderRadius: "50%" }} />
                <div className="min-w-0 text-sm text-v2-ink-secondary">
                  <span className="font-semibold text-v2-ink">{activity.actor_name ?? "Someone"}</span>
                  <span> · {activity.action_type ?? activity.target_label ?? "Activity"}</span>
                </div>
                <div className="ml-auto whitespace-nowrap text-v2-ink-muted" style={{ fontSize: "11px" }}>
                  {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-v2-panel border border-v2-rule p-4" data-testid="stage-progress-bar">
        <div className="flex items-start">
          {progressStages.map((stage, index) => {
            const rank = UI_STAGE_ORDER.indexOf(stage.key);
            const isCurrent = rank === workflowRank;
            const isComplete = rank < workflowRank;
            const dotColor = isCurrent
              ? "var(--v2-accent)"
              : isComplete
                ? "var(--v2-satisfied)"
                : "var(--v2-rule)";
            const lineColor = rank < workflowRank ? "var(--v2-satisfied)" : "var(--v2-rule-light)";
            return (
              <div key={stage.key} className="flex flex-1 items-start last:flex-none">
                <div className="flex min-w-[64px] flex-col items-center gap-2">
                  <div
                    className="h-3.5 w-3.5"
                    style={{ borderRadius: "50%", background: dotColor }}
                    data-testid={`stage-progress-dot-${stage.key}`}
                  />
                  <div className="text-center text-v2-ink-muted" style={{ fontSize: "11px" }}>{stage.label}</div>
                </div>
                {index < progressStages.length - 1 && <div className="mt-1.5 h-px flex-1" style={{ background: lineColor }} />}
              </div>
            );
          })}
        </div>
        {stageRank(dealRoom?.workflow_stage) !== stageRank("closing") && (
          <div className="mt-5 flex justify-end">
            {pendingTransition ? (
              <span className="text-v2-attention px-3 py-2" style={{ fontSize: "12px" }}>Stage advance pending approval</span>
            ) : (
              <V2Button
                variant="primary"
                onClick={onRequestNextStage}
                disabled={stageRequesting}
                data-testid="request-next-stage"
              >
                {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Request next stage
              </V2Button>
            )}
          </div>
        )}
      </section>
      <span className="sr-only">Overview loaded for {currentUserId}</span>
    </div>
  );
}
