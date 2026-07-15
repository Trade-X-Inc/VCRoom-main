import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { syncContactToHubSpot } from "@/lib/hubspot";
import { Briefcase, ArrowUpRight, Plus, X, Loader2, Search, MoreHorizontal, Trash2, CheckCircle2, Copy, Check, Users, ChevronDown, ChevronUp } from "lucide-react";
import { PageGuide } from "@/components/app/PageGuide";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { sendInviteEmail } from "@/lib/invite-fn";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/deal-rooms/")({
  component: DealRooms,
});

// ── Helpers ────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  new: "bg-accent text-brand",
  pending: "bg-warning/15 text-warning",
  active: "bg-success/15 text-success",
  closed: "bg-muted/60 text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive",
};

function statusLabel(s: string | null) {
  if (!s) return "New";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Component ──────────────────────────────────────────────────────

function DealRooms() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "closed">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "active">("newest");
  const [deleteModal, setDeleteModal] = useState<{ id: string; step: 2 | 3 } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [teamPanelId, setTeamPanelId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as { create?: string };
  const { markStep: markOnboardingStep } = useOnboardingProgress();

  useEffect(() => {
    if (search.create === "1") setOpen(true);
  }, [search.create]);

  const { data: startup } = useQuery({
    queryKey: ["dr-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, profile_slug, profile_published")
        .eq("founder_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data as { id: string; company_name: string; profile_slug: string | null; profile_published: boolean | null } | null;
    },
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["deal-rooms", user?.id, startup?.id],
    enabled: !!user?.id && !!startup?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("id, status, created_at, updated_at, investor_name, investor_email, investor_company")
        .eq("startup_id", startup!.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Deal rooms query failed:", error);
        return [];
      }
      return (data ?? []) as any[];
    },
  });

  const roomIds = (rooms as any[]).map((r: any) => r.id);
  const { data: docViews = [] } = useQuery({
    queryKey: ["doc-view-counts", user?.id, roomIds.join(",")],
    enabled: !!user?.id && roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_views")
        .select("deal_room_id, viewer_name, created_at")
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: teamAssignments = [] } = useQuery({
    queryKey: ["dr-team-assignments-list", user?.id, roomIds.join(",")],
    enabled: !!user?.id && roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_team_assignments")
        .select(`
          deal_room_id,
          team_account_id,
          startup_team_accounts!inner(
            role,
            users(full_name, avatar_url),
            team_member_profiles(first_name, last_name, avatar_url)
          )
        `)
        .in("deal_room_id", roomIds);
      return (data ?? []) as any[];
    },
  });

  const handleDelete = async (roomId: string) => {
    setDeletingId(roomId);
    try {
      // Child rows must actually delete before the room — a silent failure
      // here would leave orphaned data while the UI reports success.
      for (const table of ["invites", "deal_room_members", "activities", "messages", "deal_tasks", "notes", "documents"] as const) {
        const { error: childErr } = await supabase.from(table).delete().eq("deal_room_id", roomId);
        if (childErr) throw childErr;
      }
      const { error } = await supabase.from("deal_rooms").delete().eq("id", roomId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["deal-rooms", user?.id, startup?.id] });
      toast.success("Deal room deleted");
    } catch {
      toast.error("Failed to delete deal room");
    } finally {
      setDeletingId(null);
      setDeleteModal(null);
      setDeleteConfirmText("");
      setMenuOpenId(null);
    }
  };

  const isLoading = roomsLoading || (!!user?.id && startup === undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoadError(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const filteredRooms = rooms.filter((r: any) => {
    const s = r.status ?? "new";
    if (filter === "active") return s === "active";
    if (filter === "pending") return s === "new" || s === "pending" || !s;
    if (filter === "closed") return s === "closed" || s === "rejected";
    return true;
  });
  const sortedRooms = [...filteredRooms].sort((a: any, b: any) => {
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === "active") return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loadError) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted-foreground)' }}>
        <p style={{ color: '#ffffff', marginBottom: 8 }}>Failed to load</p>
        <p style={{ fontSize: 14, marginBottom: 24 }}>There was a problem connecting. Please refresh the page.</p>
        <button onClick={() => window.location.reload()}
          style={{ background: 'var(--gradient-brand)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <EmptyState kind="loading" title="Loading" />;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Deal Rooms</h1>
          <div className="text-sm text-muted-foreground">{rooms.length} room{rooms.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          <PageGuide pageId="deal-rooms" />
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
          >
            <Plus className="h-4 w-4" /> Create new deal room
          </button>
        </div>
      </div>

      {/* Filter + Sort bar */}
      <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1">
          {(["all", "active", "pending", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                filter === f ? "hs-gradient text-brand-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand/50"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="active">Last active</option>
        </select>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {sortedRooms.map((r: any) => {
          const investorName = r.investor_name ?? "Pending invite";
          const investorCompany = r.investor_company ?? startup?.company_name ?? "";
          const daysOpen = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
          const lastActivity = r.updated_at
            ? formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })
            : "—";
          const status = r.status ?? "new";
          const initials = investorName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

          const roomViews = (docViews as any[]).filter((v: any) => v.deal_room_id === r.id);
          const roomTeam = (teamAssignments as any[]).filter((a: any) => a.deal_room_id === r.id);
          const teamPanelOpen = teamPanelId === r.id;
          return (
            <div
              key={r.id}
              className="rounded-none border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow flex flex-col gap-4"
              onClick={() => { if (menuOpenId === r.id) setMenuOpenId(null); }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground text-xs font-semibold shrink-0">
                    {initials || "DR"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{investorName}</div>
                    <div className="text-xs text-muted-foreground truncate">{investorCompany}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_COLOR[status] ?? "bg-muted/60 text-muted-foreground")}>
                    {statusLabel(status)}
                  </span>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === r.id ? null : r.id); }}
                      className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {menuOpenId === r.id && (
                      <div className="absolute right-0 top-7 z-20 min-w-[160px] rounded-lg border border-border/60 bg-card shadow-elev py-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteModal({ id: r.id, step: 2 }); setMenuOpenId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete deal room
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/30 p-2">
                  <div className="text-base font-semibold tabular-nums">{daysOpen}</div>
                  <div className="text-[10px] text-muted-foreground">days open</div>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <div className="text-[11px] text-muted-foreground truncate">{lastActivity}</div>
                  <div className="text-[10px] text-muted-foreground">last activity</div>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <div className="text-base font-semibold tabular-nums">{roomViews.length}</div>
                  <div className="text-[10px] text-muted-foreground">doc views</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  {r.investor_email ? (
                    <span className="truncate max-w-[160px] inline-block align-bottom">{r.investor_email}</span>
                  ) : "No email on file"}
                </div>
                <Link
                  to={"/app/deal-rooms/$id" as any}
                  params={{ id: r.id } as any}
                  className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-2.5 py-1.5 text-xs shadow-glow hover:opacity-90 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Team section */}
              {roomTeam.length > 0 && (
                <div className="border-t border-border/60 pt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setTeamPanelId(teamPanelOpen ? null : r.id); }}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    {/* Stacked avatars */}
                    <div className="flex items-center -space-x-2">
                      {roomTeam.slice(0, 4).map((a: any, i: number) => {
                        const prof = a.startup_team_accounts?.team_member_profiles;
                        const usr = a.startup_team_accounts?.users;
                        const avatarUrl = prof?.avatar_url ?? usr?.avatar_url ?? null;
                        const name = prof?.first_name
                          ? `${prof.first_name} ${prof.last_name ?? ""}`.trim()
                          : (usr?.full_name ?? "?");
                        const initials = name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
                        return (
                          <div
                            key={a.team_account_id}
                            className="h-6 w-6 rounded-full border-2 border-card bg-accent flex items-center justify-center text-[9px] font-semibold text-foreground overflow-hidden"
                            style={{ zIndex: 4 - i }}
                            title={name}
                          >
                            {avatarUrl
                              ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                              : initials}
                          </div>
                        );
                      })}
                      {roomTeam.length > 4 && (
                        <div className="h-6 w-6 rounded-full border-2 border-card bg-muted/50 flex items-center justify-center text-[9px] font-semibold text-muted-foreground" style={{ zIndex: 0 }}>
                          +{roomTeam.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground flex-1">
                      {roomTeam.length} team member{roomTeam.length !== 1 ? "s" : ""} assigned
                    </span>
                    {teamPanelOpen
                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>

                  {/* Expanded panel */}
                  {teamPanelOpen && (
                    <div className="mt-3 space-y-2">
                      {roomTeam.map((a: any) => {
                        const prof = a.startup_team_accounts?.team_member_profiles;
                        const usr = a.startup_team_accounts?.users;
                        const avatarUrl = prof?.avatar_url ?? usr?.avatar_url ?? null;
                        const name = prof?.first_name
                          ? `${prof.first_name} ${prof.last_name ?? ""}`.trim()
                          : (usr?.full_name ?? "Unknown");
                        const initials = name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
                        const role = a.startup_team_accounts?.role ?? "member";
                        return (
                          <div key={a.team_account_id} className="flex items-center gap-2.5 rounded-lg bg-accent/40 px-3 py-2">
                            <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-semibold text-foreground overflow-hidden shrink-0">
                              {avatarUrl
                                ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                                : initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{name}</div>
                              <div className="text-[10px] text-muted-foreground capitalize">{role}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!!startup?.id && !roomsLoading && sortedRooms.length === 0 && (
          <div className="col-span-2">
            <EmptyState
              kind={filter === "all" ? "empty" : "no-results"}
              title={filter === "all" ? "No deal rooms" : `No ${filter} rooms`}
              action={
                filter === "all"
                  ? { label: "Create room", onClick: () => setOpen(true) }
                  : undefined
              }
            />
            {filter === "all" && startup?.profile_slug && (
              <div className="text-center -mt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://hockystick.app/p/${startup.profile_slug}`);
                    toast.success(startup.profile_published ? "Profile link copied" : "Link copied — publish your profile so investors can open it");
                  }}
                  className="hs-gradient-text text-sm font-medium hover:underline"
                >
                  Copy profile link
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {open && (
        <CreateRoomForm
          userId={user?.id ?? ""}
          startupId={startup?.id ?? ""}
          founderName={user?.fullName ?? user?.email ?? ""}
          onClose={() => setOpen(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["deal-rooms", user?.id, startup?.id] });
            markOnboardingStep("promote_dismissed", true);
          }}
        />
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-elev p-6 space-y-4">
            {deleteModal.step === 2 ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 shrink-0">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <div className="font-semibold">Delete deal room?</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      This permanently deletes the deal room and all its data — documents, messages, tasks, and notes. This cannot be undone.
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeleteModal(null)}
                    className="flex-1 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteModal({ id: deleteModal.id, step: 3 })}
                    className="flex-1 rounded-md bg-destructive/10 text-destructive border border-destructive/20 px-3 py-2 text-sm hover:bg-destructive/20"
                  >
                    I understand, continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="font-semibold text-destructive">Final confirmation</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Type <span className="font-mono font-semibold text-foreground">DELETE</span> to permanently delete this deal room.
                  </div>
                </div>
                <input
                  autoFocus
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-destructive/50 font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDeleteModal(null); setDeleteConfirmText(""); }}
                    className="flex-1 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteModal.id)}
                    disabled={deleteConfirmText !== "DELETE" || deletingId === deleteModal.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-destructive text-foreground px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {deletingId === deleteModal.id
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                      : "Delete permanently"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Room Form ───────────────────────────────────────────────

const DEAL_TYPES = ["Equity", "SAFE", "Convertible Note", "Other"] as const;

function CreateRoomForm({
  userId,
  startupId: initialStartupId,
  founderName,
  onClose,
  onCreated,
}: {
  userId: string;
  startupId: string;
  founderName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [investorFirm, setInvestorFirm] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [dealType, setDealType] = useState<(typeof DEAL_TYPES)[number]>("Equity");
  const [fundingTarget, setFundingTarget] = useState("");
  const [startupId, setStartupId] = useState(initialStartupId);
  const [createdRoom, setCreatedRoom] = useState<{ id: string; inviteLink?: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Autocomplete state
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: vcLeads = [] } = useQuery({
    queryKey: ["leads-search", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("vc_leads")
        .select("id, investor_name, firm_name, email")
        .eq("founder_id", userId)
        .order("investor_name");
      return (data ?? []) as { id: string; investor_name: string; firm_name: string | null; email: string | null }[];
    },
  });

  const filtered = vcLeads.filter((l) =>
    l.investor_name?.toLowerCase().includes(search.toLowerCase()) ||
    (l.firm_name?.toLowerCase() ?? "").includes(search.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: startups = [], isLoading: startupsLoading } = useQuery({
    queryKey: ["my-startups", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", userId);
      return (data ?? []) as { id: string; company_name: string }[];
    },
  });

  useEffect(() => {
    if (startups.length === 1 && !startupId) setStartupId(startups[0].id);
  }, [startups, startupId]);

  const selectedStartup = startups.find((s) => s.id === startupId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorName.trim() || !startupId || !userId) return;
    setSaving(true);
    setError("");
    try {
      // 1. Create deal room with investor details
      const { data: newRoom, error: roomErr } = await supabase
        .from("deal_rooms")
        .insert({
          startup_id: startupId,
          status: inviteEmail.trim() ? "pending" : "new",
          investor_name: investorName.trim(),
          investor_email: inviteEmail.trim() || null,
          investor_company: investorFirm.trim() || null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (roomErr) throw roomErr;
      if (!newRoom?.id) throw new Error("No room ID returned");

      // 2. Add founder as member — load-bearing: without membership the
      // founder can't access their own room
      const { error: memberErr } = await supabase.from("deal_room_members").insert({
        deal_room_id: newRoom.id,
        user_id: userId,
        role: "founder",
      });
      if (memberErr) throw memberErr;

      // 3. Log activity (background — log failures only)
      const { error: actErr } = await supabase.from("activities").insert({
        deal_room_id: newRoom.id,
        actor_id: userId,
        action: `Deal room created for ${investorName.trim()}${investorFirm.trim() ? ` · ${investorFirm.trim()}` : ""} · ${dealType}${fundingTarget ? ` · $${fundingTarget}` : ""}`,
      });
      if (actErr) console.error("[deal-rooms] activity log failed:", actErr);

      // Badge evaluation — fire-and-forget on this write event
      import("@/lib/badge-award-engine").then((m) => m.evaluateAndAwardBadges({ data: { startup_id: startupId } })).catch(() => {});

      // 4. Send invite email via server fn if email provided
      let inviteLink: string | undefined;
      if (inviteEmail.trim()) {
        const { data: { session } } = await supabase.auth.getSession();
        const result = await sendInviteEmail({
          data: {
            dealRoomId: newRoom.id,
            email: inviteEmail.trim(),
            role: "investor",
            invitedBy: userId,
            userAccessToken: session?.access_token ?? "",
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            appUrl: import.meta.env.VITE_APP_URL,
            dealRoomName: `${selectedStartup?.company_name ?? "Deal Room"} — Deal Room`,
            founderName: founderName || undefined,
            startupName: selectedStartup?.company_name,
            message: personalMessage.trim() || undefined,
          },
        });
        if (result.success) {
          inviteLink = result.inviteLink;
        } else {
          console.warn("Invite email failed:", result.error);
        }
      }

      onCreated();
      setCreatedRoom({ id: newRoom.id, inviteLink, email: inviteEmail.trim() });

      // Sync founder to HubSpot with deal room activity — fire and forget
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user?.email) {
        syncContactToHubSpot({
          data: {
            email: s.user.email,
            properties: {
              lifecyclestage: "marketingqualifiedlead",
              deal_room_created: "true",
            },
          },
        }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal room.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!createdRoom?.inviteLink) return;
    navigator.clipboard.writeText(createdRoom.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-elev p-6"
      >
        {createdRoom ? (
          /* ── Success state ── */
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Deal room created!</h3>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-success/10 border border-success/20 p-4">
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
              <div>
                <div className="text-sm font-medium text-success">
                  {createdRoom.email ? `Invite sent to ${createdRoom.email}` : "Deal room created"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {createdRoom.email
                    ? "They'll receive an email with a link to sign the NDA and enter the deal room."
                    : "You can invite investors from inside the deal room."}
                </div>
              </div>
            </div>

            {createdRoom.inviteLink && (
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Backup invite link</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={createdRoom.inviteLink}
                    className="flex-1 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground min-w-0"
                  />
                  <button
                    onClick={copyLink}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-border/60">
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
              >
                Close
              </button>
              <button
                onClick={() => navigate({ to: "/app/deal-rooms/$id" as any, params: { id: createdRoom.id } as any })}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
              >
                Go to deal room <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold inline-flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-brand" /> Create new deal room
              </h3>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Investor name search */}
            <div ref={dropdownRef}>
              <label className="text-xs text-muted-foreground">Investor name *</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  required
                  value={investorName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInvestorName(val);
                    setSearch(val);
                    setSelectedLead(null);
                    setShowDropdown(val.length > 0);
                  }}
                  onFocus={() => { if (investorName.length > 0 && !selectedLead) setShowDropdown(true); }}
                  placeholder="Search VC leads or type a name…"
                  className="w-full rounded-md border border-border/60 bg-background pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
                {selectedLead && (
                  <button
                    type="button"
                    onClick={() => { setSelectedLead(null); setSearch(""); setInvestorName(""); setInviteEmail(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {showDropdown && (
                  <div className="absolute z-20 w-full mt-1 rounded-lg border border-border/60 bg-card shadow-elev overflow-hidden">
                    {filtered.length > 0 ? (
                      filtered.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedLead(l);
                            setInvestorName(l.investor_name);
                            setSearch(l.investor_name);
                            setInvestorFirm(l.firm_name ?? "");
                            setInviteEmail(l.email ?? "");
                            setShowDropdown(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[10px] font-semibold shrink-0">
                            {l.investor_name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{l.investor_name}</div>
                            {l.firm_name && <div className="text-xs text-muted-foreground truncate">{l.firm_name}</div>}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2.5 text-xs text-muted-foreground">
                        No matching leads — fill in email below to invite.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Fund / Company</label>
                <input
                  value={investorFirm}
                  onChange={(e) => setInvestorFirm(e.target.value)}
                  placeholder="Sequoia Capital"
                  className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Deal type</label>
                <select
                  value={dealType}
                  onChange={(e) => setDealType(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                >
                  {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Investor email *</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="investor@sequoia.com"
                className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">We'll send them an NDA + deal room link.</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Personal message (optional)</label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={2}
                placeholder="Hi, I'd love to share our data room with you…"
                className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
              />
            </div>

            {startups.length > 1 && (
              <div>
                <label className="text-xs text-muted-foreground">Select startup *</label>
                {startupsLoading ? (
                  <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </div>
                ) : (
                  <select
                    required
                    value={startupId}
                    onChange={(e) => setStartupId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                  >
                    <option value="">Select a startup…</option>
                    {startups.map((s) => (
                      <option key={s.id} value={s.id}>{s.company_name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {startups.length === 0 && !startupsLoading && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                Set up your company profile first.{" "}
                <Link to="/app/profile" className="text-brand hover:underline" onClick={onClose}>
                  Go to profile →
                </Link>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !investorName.trim() || !inviteEmail.trim() || !startupId || startups.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm disabled:opacity-60"
              >
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</> : "Create & Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
