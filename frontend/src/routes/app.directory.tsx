import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FounderProfilePanel } from "@/components/directory/FounderProfilePanel";
import { InvestorOnboardingModal } from "@/components/directory/InvestorOnboardingModal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Search, Building2, Users, ArrowRight, Globe, X, Loader2 } from "lucide-react";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/directory")({
  head: () => ({ meta: [{ title: "Directory — Hockystick" }] }),
  component: Directory,
});

type DiscoveryStatus = "pending" | "approved" | "declined" | "withdrawn";

function formatFundingTarget(value?: number | string | null) {
  if (value == null) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  return `$${amount.toLocaleString()}`;
}

function useDirectoryData() {
  const { user } = useAuth();

  const { data: myRoomIds = [] } = useQuery<string[]>({
    queryKey: ["my-room-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_members").select("deal_room_id").eq("user_id", user!.id);
      return (data ?? []).map((r: any) => r.deal_room_id);
    },
  });

  const { data: startups = [], isLoading: startupsLoading } = useQuery({
    queryKey: ["directory-startups"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select(`
          id,
          company_name,
          tagline,
          description,
          sector,
          stage,
          country,
          funding_target,
          valuation,
          revenue,
          growth_rate,
          customer_count,
          use_of_funds,
          traction,
          current_investors,
          founder_id,
          founder_name,
          cofounder_name,
          founded_year,
          team_size,
          website,
          logo_url,
          intro_video_url,
          product_video_url,
          profile_slug,
          social_links,
          users!startups_founder_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["directory-rooms-map", myRoomIds],
    enabled: myRoomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("deal_rooms").select("id, startup_id").in("id", myRoomIds);
      return data ?? [];
    },
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["directory-discovery-requests", user?.id],
    enabled: !!user?.id && user?.role === "investor",
    queryFn: async () => {
      const { data } = await supabase
        .from("discovery_requests")
        .select("startup_id, status, detail_pack_requested, detail_pack_approved")
        .eq("investor_id", user!.id);
      return data ?? [];
    },
  });

  const { data: investors = [], isLoading: investorsLoading } = useQuery({
    queryKey: ["directory-investors", myRoomIds],
    enabled: myRoomIds.length > 0,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("deal_room_members").select("user_id").in("deal_room_id", myRoomIds).neq("user_id", user?.id ?? "");
      const userIds = [...new Set((members ?? []).map((m: any) => m.user_id))];
      if (!userIds.length) return [];
      const { data } = await supabase
        .from("investor_profiles")
        .select("id, user_id, fund_name, sectors, stages, check_size_min, check_size_max, geography, thesis, website, verification_tier, users(id, full_name, avatar_url)")
        .in("user_id", userIds);
      return data ?? [];
    },
  });

  return { startups, rooms, myRequests, investors, startupsLoading, investorsLoading };
}

function StartupCard({
  s,
  founder,
  roomId,
  requestStatus,
  currentUserId,
  currentUserRole,
  alert,
  onConnect,
  onCancel,
  onEditProfile,
  onOpen,
}: {
  s: any;
  founder?: any;
  roomId?: string;
  requestStatus?: DiscoveryStatus;
  currentUserId?: string;
  currentUserRole?: string;
  alert?: { match_score: number; match_reasons: any } | null;
  onConnect: (startupId: string) => void;
  onCancel: (startupId: string) => void;
  onEditProfile: () => void;
  onOpen: () => void;
}) {
  const initials = s.company_name?.slice(0, 2).toUpperCase() ?? "?";
  const targetM = formatFundingTarget(s.funding_target);
  const description = s.description || s.tagline;
  const renderAction = () => {
    if (currentUserRole === "founder") {
      if (s.founder_id === currentUserId) {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditProfile();
            }}
            className="flex-1 text-xs py-1.5 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 transition-colors"
          >
            Edit Profile
          </button>
        );
      }
      return null;
    }

    if (!requestStatus) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConnect(s.id);
          }}
          className="flex-1 text-xs py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          Connect
        </button>
      );
    }

    if (requestStatus === "pending") {
      return (
        <div className="flex gap-2 flex-1">
          <button disabled className="flex-1 text-xs py-1.5 rounded-lg border border-border/60 text-muted-foreground opacity-70 cursor-not-allowed">
            Pending →
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(s.id); }}
            className="px-3 py-1.5 rounded-md text-xs bg-white/5 text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center text-xs py-1.5 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 transition-colors"
        >
          View Deal Room
        </Link>
      ) : (
        <button disabled className="flex-1 text-xs py-1.5 rounded-lg border border-border/60 text-muted-foreground opacity-70 cursor-not-allowed">
          Approved
        </button>
      );
    }

    return (
      <button disabled className="flex-1 text-xs py-1.5 rounded-lg border border-border/60 text-muted-foreground opacity-70 cursor-not-allowed">
        {requestStatus.charAt(0).toUpperCase() + requestStatus.slice(1)}
      </button>
    );
  };
  const action = renderAction();

  return (
    <div
      onClick={onOpen}
      className="rounded-xl border border-border/60 bg-card p-5 min-h-[200px] hover:border-brand/70 hover:bg-accent/20 transition-all flex flex-col cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center text-brand-foreground font-bold text-sm shrink-0">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold truncate">{s.company_name}</div>
          </div>
          {founder && <div className="text-xs text-muted-foreground truncate">{founder.full_name}</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {s.sector && <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border/60">{s.sector}</span>}
        {s.stage && <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">{s.stage}</span>}
        {alert && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            alert.match_score >= 80
              ? "bg-green-500/15 text-green-400"
              : alert.match_score >= 60
              ? "bg-[#7C3AED]/15 text-[#7C3AED]"
              : "bg-white/8 text-white/40"
          }`}>
            {alert.match_score}% match
          </span>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">{description}</p>}
      <div className="space-y-1 mb-4">
        {targetM && <div className="text-xs text-success font-medium">Raising {targetM}</div>}
        {s.country && <div className="text-xs text-muted-foreground">📍 {s.country}</div>}
      </div>
      <div className="flex gap-2 pt-3 border-t border-border/60 mt-auto">
        {s.website ? (
          <a
            href={s.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="h-3 w-3" /> Website
          </a>
        ) : <div className="flex-1" />}
        {action}
      </div>
    </div>
  );
}

function InvestorCard({ inv }: { inv: any }) {
  const u = (inv.users as any) ?? {};
  const initials = u.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const sectors: string[] = Array.isArray(inv.sectors) ? inv.sectors
    : typeof inv.sectors === "string" ? inv.sectors.split(",").map((s: string) => s.trim()) : [];
  const checkRange = [inv.check_size_min, inv.check_size_max].filter(Boolean).join(" – ");
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 min-h-[200px] hover:border-brand/30 hover:bg-accent/20 transition-all flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-foreground font-bold text-sm shrink-0 overflow-hidden">
          {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{u.full_name ?? "Investor"}</div>
          <div className="text-xs text-muted-foreground truncate">{inv.fund_name || "Independent"}</div>
          {inv.verification_tier && inv.verification_tier !== "none" && (
            <div className="mt-1">
              <VerificationBadge tier={inv.verification_tier} size="sm" />
            </div>
          )}
        </div>
      </div>
      {inv.thesis && <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">{inv.thesis}</p>}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {checkRange && <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">💰 {checkRange}</span>}
        {sectors.slice(0, 2).map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">{s}</span>
        ))}
      </div>
      <div className="space-y-1 mb-4">
        {inv.geography && <div className="text-xs text-muted-foreground">🌍 {inv.geography}</div>}
        {inv.stages && <div className="text-xs text-muted-foreground">Stages: {inv.stages}</div>}
      </div>
      <div className="pt-3 border-t border-border/60 mt-auto">
        <button className="w-full text-xs py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-blue-500/40 transition-colors">
          Request Introduction
        </button>
      </div>
    </div>
  );
}

function WaitlistModal({ onClose, defaultRole }: { onClose: () => void; defaultRole?: string }) {
  const [form, setForm] = useState({ email: "", role: defaultRole ?? "", company: "", problem: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("waitlist_entries").insert({
        email: form.email,
        role: form.role || null,
        company: form.company || null,
        problem: form.problem || null,
        type: "directory",
      });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to join waitlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/60 shadow-elev overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="text-sm font-semibold">Join early access</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {done ? (
          <div className="px-5 py-10 text-center">
            <div className="text-4xl mb-3">✓</div>
            <div className="font-semibold mb-1">You're on the list.</div>
            <p className="text-sm text-muted-foreground">We'll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">I am a…</div>
              <div className="flex gap-2">
                {(["founder", "investor"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => set("role", r)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${form.role === r ? "bg-brand text-brand-foreground border-brand" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Company / Fund name</label>
              <input value={form.company} onChange={(e) => set("company", e.target.value)}
                placeholder="Acme Inc. (optional)"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">What are you trying to solve?</label>
              <input value={form.problem} onChange={(e) => set("problem", e.target.value)}
                placeholder="e.g. raising a seed round in UAE"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-semibold hover:bg-brand/90 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Submitting…" : "Get early access →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Directory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { startups, rooms, myRequests, investors, startupsLoading, investorsLoading } = useDirectoryData();
  const [type, setType] = useState<"founders" | "investors">("founders");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [selectedStartup, setSelectedStartup] = useState<any | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const isInvestor = user?.role === "investor";
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [pendingConnectStartupId, setPendingConnectStartupId] = useState<string | null>(null);

  const { data: myAlerts } = useQuery({
    queryKey: ["thesis-alerts", user?.id],
    enabled: !!user?.id && isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("thesis_alerts")
        .select("startup_id, match_score, match_reasons")
        .eq("investor_id", user!.id);
      return data ?? [];
    },
  });

  const alertsByStartup = Object.fromEntries(
    (myAlerts ?? []).map((a: any) => [a.startup_id, a])
  );

  const roomByStartup = Object.fromEntries((rooms as any[]).map((r) => [r.startup_id, r.id]));
  const closePanel = () => setSelectedStartup(null);
  const requestByStartup = Object.fromEntries((myRequests as any[]).map((r) => [r.startup_id, r.status as DiscoveryStatus]));
  const requestDetailsByStartup = Object.fromEntries((myRequests as any[]).map((r) => [r.startup_id, r]));
  const currentStartup = startups.find((s: any) => s.founder_id === user?.id);
  const isIncomplete = !!currentStartup && user?.role === "founder" &&
    (!currentStartup.description || !currentStartup.sector || !currentStartup.stage || !currentStartup.funding_target);

  const checkInvestorProfileComplete = async (): Promise<boolean> => {
    const { data } = await supabase
      .from("investor_profiles")
      .select("your_name, fund_name, role, check_size_min, sectors, stages")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (!data) return false;
    return !!(
      data.your_name?.trim() &&
      data.fund_name?.trim() &&
      data.role?.trim() &&
      data.check_size_min?.trim() &&
      data.sectors?.trim() &&
      data.stages?.trim()
    );
  };

  const handleConnect = async (startupId: string) => {
    if (!user?.id) return;
    const isComplete = await checkInvestorProfileComplete();
    if (!isComplete) {
      setPendingConnectStartupId(startupId);
      setShowOnboardingModal(true);
      return;
    }
    await doConnect(startupId);
  };

  const doConnect = async (startupId: string) => {
    if (!user?.id) return;

    // 1) Insert discovery_request and get its id
    const { data: requestData, error: reqError } = await supabase
      .from("discovery_requests")
      .insert({
        investor_id: user.id,
        startup_id: startupId,
        status: "pending",
        stage: 1,
      })
      .select("id")
      .maybeSingle();

    if (reqError || !requestData) {
      console.error("Connect failed:", reqError);
      toast.error("Could not send request");
      return;
    }

    const requestId = (requestData as any).id;

    // 2) Fetch startup and investor profile for populating vc_leads
    const { data: startup } = await supabase
      .from("startups")
      .select("founder_id, company_name, sector, stage, country, website")
      .eq("id", startupId)
      .maybeSingle();

    const { data: investorProfile } = await supabase
      .from("investor_profiles")
      .select("fund_name, your_name, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!startup) {
      toast.error("Startup not found");
      return;
    }

    // 3) Auto-create vc_lead on the founder's side
    try {
      const investorDisplayName = investorProfile?.your_name ?? (user as any)?.full_name ?? user?.email ?? "Investor";
      const { data: lead, error: leadError } = await supabase
        .from("vc_leads")
        .insert({
          founder_id: startup.founder_id,
          investor_name: investorDisplayName,
          firm_name: investorProfile?.fund_name ?? null,
          sector: startup.sector,
          stage: startup.stage,
          geography: startup.country,
          status: "New",
          source: "Hockystick",
          discovery_request_id: requestId,
        })
        .select("id")
        .maybeSingle();

      if (!leadError && lead) {
        // 4) Link the vc_lead back to the discovery_request
        await supabase
          .from("discovery_requests")
          .update({ vc_lead_id: (lead as any).id })
          .eq("id", requestId);
      }
    } catch (e) {
      // non-fatal: continue
      console.error("vc_lead creation failed", e);
    }

    // 5) Create in-app notification for founder
    try {
      await supabase.from("notifications").insert({
        user_id: startup.founder_id,
        kind: "deal",
        title: "New connection request",
        body: `${investorProfile?.your_name ?? "An investor"} from ${investorProfile?.fund_name ?? "a fund"} wants to connect with ${startup.company_name}.`,
        read: false,
        action_url: "/app/vc-leads",
      });
    } catch (e) {
      console.error("notification insert failed", e);
    }

    // 6) Optimistic UI update — mark as pending in directory requests cache
    queryClient.setQueryData(["directory-discovery-requests", user.id], (old: any[] = []) => [
      ...old.filter((r) => r.startup_id !== startupId),
      { startup_id: startupId, status: "pending" },
    ]);
    toast.success("Connection request sent");
  };

  const handleCancel = async (startupId: string) => {
    if (!user?.id) return;
    const { data: request } = await supabase
      .from("discovery_requests")
      .select("id, vc_lead_id")
      .eq("investor_id", user.id)
      .eq("startup_id", startupId)
      .eq("status", "pending")
      .single();
    if (!request) return;
    if ((request as any).vc_lead_id) {
      const { error: leadError } = await supabase.from("vc_leads").delete().eq("id", (request as any).vc_lead_id);
      if (leadError) console.error("Cancel vc_lead failed:", leadError);
    }
    const { error: drError } = await supabase.from("discovery_requests").delete().eq("id", request.id);
    if (drError) { console.error("Cancel discovery_request failed:", drError); toast.error("Could not cancel request"); return; }
    queryClient.setQueryData(["directory-discovery-requests", user.id], (old: any[] = []) =>
      old.filter((r) => r.startup_id !== startupId)
    );
    queryClient.invalidateQueries({ queryKey: ["directory-discovery-requests", user.id] });
    toast.success("Request cancelled");
  };

  const filteredStartups = startups.filter((s: any) => {
    const q = search.toLowerCase();
    const founder = Array.isArray(s.users) ? s.users[0] : s.users;
    const description = s.description || s.tagline;
    return (
      (!q ||
        s.company_name?.toLowerCase().includes(q) ||
        founder?.full_name?.toLowerCase().includes(q) ||
        s.sector?.toLowerCase().includes(q) ||
        description?.toLowerCase().includes(q)) &&
      (!stage || s.stage === stage)
    );
  });

  const filteredInvestors = investors.filter((inv: any) => {
    const q = search.toLowerCase();
    const u = (inv.users as any) ?? {};
    return !q || u.full_name?.toLowerCase().includes(q) || inv.fund_name?.toLowerCase().includes(q) || inv.sectors?.toString().toLowerCase().includes(q);
  });

  const isLoading = type === "founders" ? startupsLoading : investorsLoading;
  const count = type === "founders" ? filteredStartups.length : filteredInvestors.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">Founders and investors from your deal room network.</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search founders, companies, investors…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border/60 bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" />
        </div>
        <div className="flex rounded-lg border border-border/60 overflow-hidden shrink-0">
          <button onClick={() => setType("founders")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${type === "founders" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Founders ({startups.length})
          </button>
          <button onClick={() => setType("investors")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-border/60 ${type === "investors" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Investors ({investors.length})
          </button>
        </div>
        {type === "founders" && (
          <select value={stage} onChange={(e) => setStage(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border/60 bg-background text-sm text-muted-foreground focus:outline-none focus:border-brand/50 shrink-0">
            <option value="">All stages</option>
            {["Pre-seed", "Seed", "Series A", "Series B", "Series C+"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="mb-4 px-4 py-3 rounded-xl bg-brand/10 border border-brand/20 text-sm text-brand">
        🚀 Full features and founder discovery across VC circles available after public launch.
        <button onClick={() => setWaitlistOpen(true)} className="underline ml-1 hover:opacity-80">
          {isInvestor ? "Join early access →" : "Get early access →"}
        </button>
      </div>

      {isIncomplete && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20 text-sm text-warning">
          <span>Your profile is incomplete — investors can see it but missing fields reduce visibility.</span>
          <button
            onClick={() => navigate({ to: "/app/profile" })}
            className="shrink-0 rounded-lg bg-warning text-warning-foreground px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Complete profile →
          </button>
        </div>
      )}

      {/* Thesis matches banner — investors only */}
      {isInvestor && myAlerts && myAlerts.length > 0 && type === "founders" && (
        <div className="mb-6 p-4 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#7C3AED]">✦</span>
            <p className="text-sm font-semibold text-white">
              {myAlerts.length} thesis {myAlerts.length === 1 ? "match" : "matches"} found
            </p>
          </div>
          <p className="text-xs text-white/40">
            Based on your investment thesis — sector, stage, and geography.
          </p>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-xl border border-border/60 bg-card p-5 animate-pulse h-48" />)}
        </div>
      ) : count === 0 ? (
        <div className="text-center py-20">
          {type === "founders" ? <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" /> : <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />}
          <p className="text-sm text-muted-foreground">
            {search || stage ? `No ${type} match your filters.` : type === "founders" ? "No founders yet." : `No ${type} in your network yet.`}
          </p>
        </div>
      ) : type === "founders" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStartups.map((s: any) => {
            const founder = Array.isArray(s.users) ? s.users[0] : s.users;
            return (
              <StartupCard
                key={s.id}
                s={s}
                founder={founder}
                roomId={roomByStartup[s.id]}
                requestStatus={requestByStartup[s.id]}
                currentUserId={user?.id}
                currentUserRole={user?.role}
                alert={isInvestor ? alertsByStartup[s.id] ?? null : null}
                onConnect={handleConnect}
                onCancel={handleCancel}
                onEditProfile={() => navigate({ to: "/app/profile" })}
                onOpen={() => setSelectedStartup(s)}
              />
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredInvestors.map((inv: any) => <InvestorCard key={inv.id} inv={inv} />)}
        </div>
      )}

      <FounderProfilePanel
        key={selectedStartup?.id}
        startup={selectedStartup}
        isOpen={selectedStartup !== null}
        onClose={closePanel}
        currentUserRole={user?.role}
        currentUserId={user?.id}
        roomId={selectedStartup ? roomByStartup[selectedStartup.id] : undefined}
        requestStatus={selectedStartup ? requestByStartup[selectedStartup.id] : undefined}
        requestDetailPackRequested={selectedStartup ? requestDetailsByStartup[selectedStartup.id]?.detail_pack_requested : false}
        requestDetailPackApproved={selectedStartup ? requestDetailsByStartup[selectedStartup.id]?.detail_pack_approved : false}
        onConnect={handleConnect}
        onCancel={handleCancel}
        onDetailPackRequested={() => queryClient.invalidateQueries({ queryKey: ["directory-discovery-requests", user?.id] })}
      />

      <InvestorOnboardingModal
        isOpen={showOnboardingModal}
        userId={user?.id ?? ""}
        onComplete={async () => {
          setShowOnboardingModal(false);
          if (pendingConnectStartupId) {
            await doConnect(pendingConnectStartupId);
            setPendingConnectStartupId(null);
          }
        }}
        onCancel={() => {
          setShowOnboardingModal(false);
          setPendingConnectStartupId(null);
        }}
      />

      <div className="mt-10 rounded-2xl border border-brand/20 bg-gradient-to-br from-purple-950/10 to-indigo-950/10 p-8 text-center">
        {isInvestor ? (
          <>
            <h2 className="text-lg font-bold mb-2" style={{ fontFamily: "Syne, sans-serif" }}>Verified founder profiles, launching soon</h2>
            <p className="text-sm text-muted-foreground mb-5">Get notified when verified MENA founders go live — with traction, team, and financials already checked.</p>
            <button onClick={() => setWaitlistOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-5 py-2.5 text-sm font-semibold hover:bg-brand/90 transition-colors">
              Join early access <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-2" style={{ fontFamily: "Syne, sans-serif" }}>Get your verified founder profile</h2>
            <p className="text-sm text-muted-foreground mb-5">A structured profile that replaces your pitch deck. Shared directly with investors. No cold outreach needed.</p>
            <button onClick={() => setWaitlistOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-5 py-2.5 text-sm font-semibold hover:bg-brand/90 transition-colors">
              Get early access <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {waitlistOpen && (
        <WaitlistModal
          onClose={() => setWaitlistOpen(false)}
          defaultRole={user?.role}
        />
      )}
    </div>
  );
}
