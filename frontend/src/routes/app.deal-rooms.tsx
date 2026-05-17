import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, ArrowUpRight, Plus, X, Loader2, Search, MoreHorizontal, Trash2, CheckCircle2, Copy, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/deal-rooms")({
  component: DealRooms,
});

// ── Helpers ────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  new: "bg-brand/15 text-brand",
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: startup } = useQuery({
    queryKey: ["dr-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data as { id: string; company_name: string } | null;
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

  const handleDelete = async (roomId: string) => {
    setDeletingId(roomId);
    try {
      const { error } = await supabase
        .from("deal_rooms")
        .delete()
        .eq("id", roomId)
        .eq("startup_id", startup!.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["deal-rooms", user?.id, startup?.id] });
      toast.success("Deal room deleted");
    } catch {
      toast.error("Failed to delete deal room");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
      setMenuOpenId(null);
    }
  };

  const isLoading = roomsLoading || (!!user?.id && startup === undefined);

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

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Rooms</h1>
          <div className="text-sm text-muted-foreground">{rooms.length} room{rooms.length !== 1 ? "s" : ""}</div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
        >
          <Plus className="h-4 w-4" /> Create new deal room
        </button>
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
                filter === f ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
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

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        {sortedRooms.map((r: any) => {
          const investorName = r.investor_name ?? "Pending invite";
          const investorCompany = r.investor_company ?? startup?.company_name ?? "";
          const daysOpen = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
          const lastActivity = r.updated_at
            ? formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })
            : "—";
          const status = r.status ?? "new";
          const initials = investorName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

          return (
            <div
              key={r.id}
              className="rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow flex flex-col gap-4"
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
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === r.id ? null : r.id); setConfirmDeleteId(null); }}
                      className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {menuOpenId === r.id && (
                      <div className="absolute right-0 top-7 z-20 min-w-[160px] rounded-lg border border-border/60 bg-card shadow-elev py-1">
                        {confirmDeleteId === r.id ? (
                          <div className="px-3 py-2 space-y-2">
                            <div className="text-xs text-destructive font-medium">Delete this room?</div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                                disabled={deletingId === r.id}
                                className="flex-1 rounded bg-destructive text-white text-xs py-1 disabled:opacity-50"
                              >
                                {deletingId === r.id ? "Deleting…" : "Yes, delete"}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); setMenuOpenId(null); }}
                                className="flex-1 rounded border border-border/60 text-xs py-1 hover:bg-accent"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(r.id); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/5"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete deal room
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-muted/30 p-2">
                  <div className="text-base font-semibold tabular-nums">{daysOpen}</div>
                  <div className="text-[10px] text-muted-foreground">days open</div>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <div className="text-[11px] text-muted-foreground truncate">{lastActivity}</div>
                  <div className="text-[10px] text-muted-foreground">last activity</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  {r.investor_email ? (
                    <span className="truncate max-w-[160px] inline-block align-bottom">{r.investor_email}</span>
                  ) : "No email on file"}
                </div>
                <Link
                  to={"/app/deal-room/$id" as any}
                  params={{ id: r.id } as any}
                  className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-2.5 py-1.5 text-xs shadow-glow hover:opacity-90 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}

        {sortedRooms.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-border/60 p-12 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">
              {filter === "all" ? "No deal rooms yet" : `No ${filter} deal rooms`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {filter === "all"
                ? "Create your first deal room to start a structured investor review."
                : `Try a different filter or create a new deal room.`}
            </div>
            {filter === "all" && (
              <button
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
              >
                <Plus className="h-4 w-4" /> Create deal room
              </button>
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
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["deal-rooms", user?.id, startup?.id] })}
        />
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

      // 2. Add founder as member
      await supabase.from("deal_room_members").insert({
        deal_room_id: newRoom.id,
        user_id: userId,
        role: "founder",
        accepted_at: new Date().toISOString(),
      });

      // 3. Log activity
      await supabase.from("activities").insert({
        deal_room_id: newRoom.id,
        actor_id: userId,
        action: `Deal room created for ${investorName.trim()}${investorFirm.trim() ? ` · ${investorFirm.trim()}` : ""} · ${dealType}${fundingTarget ? ` · $${fundingTarget}` : ""}`,
      });

      // 4. Send invite email via API if email provided
      let inviteLink: string | undefined;
      if (inviteEmail.trim()) {
        const res = await fetch("/api/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealRoomId: newRoom.id,
            email: inviteEmail.trim(),
            role: "investor",
            invitedBy: userId,
            dealRoomName: `${selectedStartup?.company_name ?? "Deal Room"} — Deal Room`,
            founderName: founderName || undefined,
            startupName: selectedStartup?.company_name,
            message: personalMessage.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          inviteLink = json.inviteLink;
        } else {
          console.warn("Invite email failed:", json.error);
        }
      }

      onCreated();
      setCreatedRoom({ id: newRoom.id, inviteLink, email: inviteEmail.trim() });
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
            <div className="flex items-center gap-3 rounded-xl bg-success/10 border border-success/20 p-4">
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
                onClick={() => navigate({ to: "/app/deal-room/$id" as any, params: { id: createdRoom.id } as any })}
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
