import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

function YouTubeEmbed({ url, label }: { url: string; label: string }) {
  const videoId = getYouTubeId(url);
  if (!videoId) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-brand hover:text-brand">
        Watch {label} →
      </a>
    );
  }
  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <a href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank" rel="noopener noreferrer"
      className="relative block w-full aspect-video rounded-lg overflow-hidden group cursor-pointer">
      <img src={thumbnail} alt={label} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[16px] border-l-white ml-1" />
        </div>
      </div>
    </a>
  );
}

type DiscoveryStatus = "pending" | "approved" | "declined" | "withdrawn";

type FounderProfilePanelProps = {
  startup: any | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  currentUserId?: string;
  roomId?: string;
  requestStatus?: DiscoveryStatus;
  requestDetailPackRequested?: boolean;
  requestDetailPackApproved?: boolean;
  onConnect: (startupId: string) => void;
  onCancel: (startupId: string) => void;
  onDetailPackRequested?: () => void;
};

function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
    /youtube\.com\/([^?/]+)$/,
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function formatMoney(value?: string | number | null): string | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

export function FounderProfilePanel({
  startup,
  isOpen,
  onClose,
  currentUserRole,
  currentUserId,
  roomId,
  requestStatus,
  requestDetailPackRequested,
  requestDetailPackApproved,
  onConnect,
  onCancel,
  onDetailPackRequested,
}: FounderProfilePanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!startup) {
    return null;
  }

  const introVideoId = getYouTubeId(startup.intro_video_url);
  const productVideoId = getYouTubeId(startup.product_video_url ?? startup.video_url ?? startup.videoUrl);
  const metrics = [
    { label: "Raising", value: formatMoney(startup.funding_target) },
    { label: "Valuation", value: formatMoney(startup.valuation) },
    { label: "Revenue", value: formatMoney(startup.revenue) },
    { label: "Growth", value: startup.growth_rate ?? null },
  ].filter((metric) => metric.value);

  const isConnected = requestStatus === "approved" || requestStatus === "connected";
  const [detailPackRequested, setDetailPackRequested] = useState<boolean>(requestDetailPackRequested ?? false);
  const [detailPackApproved] = useState<boolean>(requestDetailPackApproved ?? false);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const { data: dealBrief, refetch: refetchBrief } = useQuery({
    queryKey: ["deal-brief", startup?.id, currentUserId],
    enabled: !!startup?.id && !!currentUserId && currentUserRole === "investor",
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_briefs")
        .select("*")
        .eq("investor_id", currentUserId!)
        .eq("startup_id", startup.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  async function generateBrief() {
    if (!startup?.id) return;
    setGeneratingBrief(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-deal-brief`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ startup_id: startup.id }),
        }
      );
      const data = await res.json();
      if (data.success) refetchBrief();
    } catch (e) {
      console.error("[generate-deal-brief]", e);
    } finally {
      setGeneratingBrief(false);
    }
  }

  const renderNextStepSection = () => {
    if (requestStatus === "pending") {
      return (
        <div className="rounded-3xl border border-border bg-accent p-4 text-sm text-muted-foreground">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">YOUR NEXT STEP</div>
          <div className="font-semibold text-foreground">Waiting for founder to accept your connection.</div>
          <div className="mt-3 text-muted-foreground">You’ll be notified when they accept and you can request the next pack.</div>
        </div>
      );
    }

    if (isConnected) {
      return (
        <div className="rounded-3xl border border-border bg-accent p-4 text-sm text-muted-foreground">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">YOUR NEXT STEP</div>
          <div className="font-semibold text-foreground">You're connected — detail pack available</div>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <div>✓ Financial metrics</div>
            <div>✓ Competitive analysis</div>
            <div>✓ Full team details</div>
            <div>✓ Use of funds</div>
          </div>
          <div className="mt-4">
            {detailPackApproved ? (
              <a
                href={startup.profile_slug ? `/p/${startup.profile_slug}` : "/app/directory"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-success text-success-foreground px-4 py-3 text-sm font-semibold hover:bg-success/90 transition-colors"
              >
                Detail pack approved — view full profile →
              </a>
            ) : detailPackRequested ? (
              <div className="rounded-2xl border border-border bg-accent px-4 py-3 text-sm text-muted-foreground">
                Detail pack requested — awaiting founder approval
              </div>
            ) : (
              <button
                onClick={handleRequestDetailPack}
                className="inline-flex items-center justify-center rounded-xl hs-gradient text-foreground px-4 py-3 text-sm font-semibold hover:bg-[#6d28d9] transition-colors"
              >
                Request detail pack →
              </button>
            )}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Then → request a deal room for full DD.</div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-border bg-accent p-4 text-sm text-muted-foreground">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">YOUR NEXT STEP</div>
        <div className="font-semibold text-foreground">Connect to unlock</div>
        <div className="mt-3 grid gap-2 text-muted-foreground">
          <div>✓ Full traction data</div>
          <div>✓ Business model</div>
          <div>✓ Team backgrounds</div>
          <div>✓ Market analysis</div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">After founder accepts → request the detail pack.</div>
      </div>
    );
  };

  async function handleRequestDetailPack() {
    if (!currentUserId) return;
    const { error, count } = await supabase
      .from('discovery_requests')
      .update({
        detail_pack_requested: true,
        detail_pack_requested_at: new Date().toISOString(),
      }, { count: 'exact' })
      .eq('investor_id', currentUserId)
      .eq('startup_id', startup.id)
      .eq('status', 'connected');

    if (error) {
      console.error('Detail pack request failed:', error);
      return;
    }
    if (count === 0) {
      console.warn('Detail pack update matched 0 rows — RLS or filter issue');
      return;
    }
    console.log('Detail pack requested successfully');
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: startup.founder_id,
      kind: 'deal',
      title: 'Detail pack requested',
      body: `An investor wants to see your full profile — traction, team, and business model details.`,
      read: false,
      action_url: '/app/connections',
    });
    if (notifErr) console.error('[detail-pack] notification failed:', notifErr);
    setDetailPackRequested(true);
    onDetailPackRequested?.();
  }

  const renderConnectButton = () => {
    if (currentUserRole === "founder" && startup.founder_id === currentUserId) {
      return (
        <button
          onClick={onClose}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl hs-gradient text-foreground px-4 py-3 text-sm font-semibold hover:bg-[#6d28d9] transition-colors"
        >
          Edit Profile →
        </button>
      );
    }

    if (!requestStatus) {
      return (
        <button
          onClick={() => onConnect(startup.id)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl hs-gradient text-foreground px-4 py-3 text-sm font-semibold hover:bg-[#6d28d9] transition-colors"
        >
          Connect
        </button>
      );
    }

    if (requestStatus === "pending") {
      return (
        <div className="flex gap-2">
          <button disabled className="flex-1 rounded-xl border border-border/60 bg-accent px-4 py-3 text-sm font-semibold text-muted-foreground opacity-80 cursor-not-allowed">
            Pending →
          </button>
          <button
            onClick={() => onCancel(startup.id)}
            className="px-4 py-3 rounded-xl text-sm bg-accent text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      );
    }

    if (requestStatus === "approved") {
      return roomId ? (
        <Link
          to="/app/deal-room/$id"
          params={{ id: roomId }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl hs-gradient text-foreground px-4 py-3 text-sm font-semibold hover:bg-[#6d28d9] transition-colors"
        >
          View Deal Room
        </Link>
      ) : (
        <button disabled className="w-full rounded-xl border border-border/60 bg-accent px-4 py-3 text-sm font-semibold text-muted-foreground opacity-80 cursor-not-allowed">
          Approved
        </button>
      );
    }

    return (
      <button disabled className="w-full rounded-xl border border-border/60 bg-accent px-4 py-3 text-sm font-semibold text-muted-foreground opacity-80 cursor-not-allowed">
        {requestStatus}
      </button>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />
      <div className={`absolute inset-y-0 right-0 w-full max-w-full sm:w-[560px] bg-[#0D0D14] shadow-2xl transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Founder profile</div>
              <h2 className="mt-2 text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>{startup.company_name}</h2>
            </div>
            <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-muted-foreground hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5">

            {/* Deal Brief — investors only */}
            {currentUserRole === "investor" && (
              <div className="mb-5 rounded-xl p-4" style={{ background: '#1a1035', border: '1px solid #4c1d95' }}>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#a78bfa' }}>✦</span>
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>Deal Brief</p>
                      {dealBrief?.match_score && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{
                          background: dealBrief.match_score >= 80 ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)',
                          color: dealBrief.match_score >= 80 ? '#22c55e' : '#a78bfa',
                        }}>
                          {dealBrief.match_score}% match
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#7c6baa' }}>AI analysis for your thesis</p>
                  </div>
                  <button
                    onClick={generateBrief}
                    disabled={generatingBrief}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                  >
                    {generatingBrief ? <><Loader2 className="h-3 w-3 animate-spin" />Generating…</> : dealBrief ? 'Regenerate' : '✦ Generate brief'}
                  </button>
                </div>

                {!dealBrief && !generatingBrief && (
                  <p className="text-xs" style={{ color: '#7c6baa' }}>
                    Generate an AI deal brief tailored to your investment thesis — key metrics, strengths, red flags, and DD questions.
                  </p>
                )}

                {generatingBrief && (
                  <div className="space-y-2">
                    {[60, 80, 40].map((w, i) => (
                      <div key={i} className="h-3 rounded animate-pulse" style={{ background: 'rgba(124,58,237,0.15)', width: `${w}%` }} />
                    ))}
                  </div>
                )}

                {dealBrief && !generatingBrief && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-snug">"{dealBrief.headline}"</p>
                      {dealBrief.investment_thesis && (
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#c4b5fd' }}>{dealBrief.investment_thesis}</p>
                      )}
                    </div>

                    {dealBrief.key_metrics && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {Object.entries(dealBrief.key_metrics as Record<string, string>)
                          .filter(([, v]) => v && v !== 'unknown')
                          .slice(0, 6)
                          .map(([k, v]) => (
                            <div key={k} className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'var(--accent)' }}>
                              <p className="text-[9px] uppercase" style={{ color: '#7c6baa' }}>{k.replace(/_/g, ' ')}</p>
                              <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{v}</p>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {(dealBrief.strengths as string[])?.length > 0 && (
                        <div className="rounded-lg p-2.5" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)' }}>
                          <p className="text-[10px] font-semibold mb-1.5" style={{ color: '#22c55e' }}>✓ Strengths</p>
                          {(dealBrief.strengths as string[]).slice(0, 3).map((s, i) => (
                            <p key={i} className="text-[10px] mb-0.5" style={{ color: 'var(--muted-foreground)' }}>· {s}</p>
                          ))}
                        </div>
                      )}
                      {(dealBrief.red_flags as string[])?.length > 0 && (
                        <div className="rounded-lg p-2.5" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <p className="text-[10px] font-semibold mb-1.5" style={{ color: '#ef4444' }}>⚠ Red flags</p>
                          {(dealBrief.red_flags as string[]).slice(0, 3).map((r, i) => (
                            <p key={i} className="text-[10px] mb-0.5" style={{ color: 'var(--muted-foreground)' }}>· {r}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {(dealBrief.suggested_questions as string[])?.length > 0 && (
                      <div className="rounded-lg p-2.5" style={{ background: 'var(--accent)', border: '1px solid var(--border)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--faint)' }}>DD questions</p>
                        {(dealBrief.suggested_questions as string[]).slice(0, 3).map((q, i) => (
                          <p key={i} className="text-[10px] mb-1.5 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{i + 1}. "{q}"</p>
                        ))}
                      </div>
                    )}

                    {dealBrief.overall_verdict && (
                      <div className="rounded-lg p-2.5" style={{
                        background: dealBrief.verdict_signal === 'strong' ? 'rgba(34,197,94,0.07)' : dealBrief.verdict_signal === 'weak' ? 'rgba(239,68,68,0.07)' : 'rgba(124,58,237,0.07)',
                        border: `1px solid ${dealBrief.verdict_signal === 'strong' ? 'rgba(34,197,94,0.2)' : dealBrief.verdict_signal === 'weak' ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.2)'}`,
                      }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--faint)' }}>Verdict</p>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{dealBrief.overall_verdict}</p>
                      </div>
                    )}

                    <p className="text-[9px]" style={{ color: 'var(--faint)' }}>
                      Generated {new Date(dealBrief.generated_at).toLocaleDateString()} · Refreshes every 24h
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 rounded-3xl border border-border bg-[#111118] p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-900 text-lg font-semibold text-white overflow-hidden shrink-0">
                {startup.logo_url ? (
                  <img src={startup.logo_url} alt={startup.company_name ?? "Logo"} className="h-full w-full object-cover" />
                ) : (
                  (startup.company_name || "?")[0]
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-base font-semibold text-foreground truncate" style={{ fontFamily: "Syne, sans-serif" }}>{startup.company_name}</div>
                <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{startup.sector || "—"}</div>
                <div className="text-xs text-muted-foreground">{startup.stage || "—"} · {startup.country || "—"}</div>
                <div className="text-xs text-muted-foreground">{startup.founded_year || "—"} · {startup.team_size ? `${startup.team_size} people` : "—"}</div>
              </div>
            </div>

            {(startup.social_links ?? []).length > 0 && (
              <div className="mt-6">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Connect</div>
                <div className="flex flex-wrap gap-2">
                  {(startup.social_links ?? []).map((link: { platform: string; url: string }, i: number) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md text-xs bg-accent border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      {link.platform} →
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">FOUNDER INTRO</div>
              {startup.intro_video_url ? (
                <>
                  <YouTubeEmbed url={startup.intro_video_url} label="founder intro" />
                  <a href={startup.intro_video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors mt-1 inline-block">Open video link →</a>
                </>
              ) : (
                <div className="w-full aspect-video rounded-lg bg-accent border border-border flex items-center justify-center">
                  <p className="text-faint text-sm">Intro video not yet added</p>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <section>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">About</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{startup.description || startup.tagline || "No description available."}</p>
              </section>

              {metrics.length > 0 && (
                <section>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Key metrics</div>
                  <div className="grid grid-cols-2 gap-3">
                    {metrics.map((metric) => (
                      <div key={metric.label} className="rounded-3xl border border-border bg-[#111118] p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-2">{metric.label}</div>
                        <div className="text-sm font-semibold text-brand">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(startup.key_metric || startup.customer_count || startup.traction) && (
                <section>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Traction</div>
                  <div className="rounded-3xl border border-border bg-[#111118] p-4 space-y-2">
                    {startup.key_metric && <div className="text-sm font-semibold text-brand-foreground">{startup.key_metric}</div>}
                    {startup.customer_count && <div className="text-sm text-muted-foreground">{startup.customer_count}</div>}
                    {startup.traction && <div className="text-sm leading-relaxed text-muted-foreground">{startup.traction}</div>}
                  </div>
                </section>
              )}

              {startup.product_video_url && (
                <section>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">PRODUCT DEMO</div>
                  <YouTubeEmbed url={startup.product_video_url} label="product demo" />
                  <a href={startup.product_video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors mt-1 inline-block">Open video link →</a>
                </section>
              )}

              {startup.use_of_funds && (
                <section>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Use of funds</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{startup.use_of_funds}</p>
                </section>
              )}

              <section>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Team</div>
                <div className="rounded-3xl border border-border bg-[#111118] p-4 space-y-2 text-sm text-muted-foreground">
                  <div>Founder: {startup.founder_name || "Unknown"}</div>
                  {startup.cofounder_name && <div>Co-founder: {startup.cofounder_name}</div>}
                </div>
              </section>

              {startup.current_investors && (
                <section>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Current investors</div>
                  <div className="rounded-3xl border border-border bg-[#111118] p-4 text-sm leading-relaxed text-muted-foreground">
                    {startup.current_investors}
                  </div>
                </section>
              )}
            </div>

            <div className="mt-4">
              {renderNextStepSection()}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-[#0D0D14]/95 px-5 py-4 backdrop-blur">
            {renderConnectButton()}
          </div>
        </div>
      </div>
    </div>
  );
}
