import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, ArrowUpRight, Plus, X, Loader2, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const { user } = useAuth();

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
        .select("id, status, created_at, updated_at")
        .eq("startup_id", startup!.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Deal rooms query failed:", error);
        return [];
      }
      return (data ?? []) as any[];
    },
  });

  const isLoading = roomsLoading || (!!user?.id && startup === undefined);

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

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {rooms.map((r: any) => {
          const members: any[] = r.deal_room_members ?? [];
          const investorName = "Investor";
          const docsCount: number = (r.documents ?? []).length;
          const daysOpen = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
          const lastActivity = r.updated_at
            ? formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })
            : "—";
          const status = r.status ?? "new";
          const initials = investorName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

          return (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground text-xs font-semibold shrink-0">
                    {initials || "DR"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{investorName}</div>
                    <div className="text-xs text-muted-foreground truncate">{startup?.company_name ?? "Deal Room"}</div>
                  </div>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0", STATUS_COLOR[status] ?? "bg-muted/60 text-muted-foreground")}>
                  {statusLabel(status)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/30 p-2">
                  <div className="text-base font-semibold tabular-nums">{docsCount}</div>
                  <div className="text-[10px] text-muted-foreground">docs</div>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <div className="text-base font-semibold tabular-nums">{daysOpen}</div>
                  <div className="text-[10px] text-muted-foreground">days open</div>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <div className="text-base font-semibold tabular-nums">{members.length}</div>
                  <div className="text-[10px] text-muted-foreground">members</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">Last activity {lastActivity}</div>
                <Link
                  to={"/app/deal-room/$id" as any}
                  params={{ id: r.id } as any}
                  className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-2.5 py-1.5 text-xs shadow-glow hover:opacity-90 transition-opacity"
                >
                  Open <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-border/60 p-12 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">No deal rooms yet</div>
            <div className="text-xs text-muted-foreground mt-1">Create your first deal room to start a structured investor review.</div>
            <button
              onClick={() => setOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
            >
              <Plus className="h-4 w-4" /> Create deal room
            </button>
          </div>
        )}
      </div>

      {open && <CreateRoomForm userId={user?.id ?? ""} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ── Create Room Form ───────────────────────────────────────────────

const DEAL_TYPES = ["Equity", "SAFE", "Convertible Note", "Other"] as const;

function CreateRoomForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [investorFirm, setInvestorFirm] = useState("");
  const [dealType, setDealType] = useState<(typeof DEAL_TYPES)[number]>("Equity");
  const [fundingTarget, setFundingTarget] = useState("");
  const [description, setDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [startupId, setStartupId] = useState("");

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
    if (startups.length === 1 && !startupId) {
      setStartupId(startups[0].id);
    }
  }, [startups, startupId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorName.trim() || !startupId || !userId) return;
    setSaving(true);
    setError("");
    try {
      const { data: newRoom, error: roomErr } = await supabase
        .from("deal_rooms")
        .insert({ startup_id: startupId, status: "new" })
        .select("id")
        .single();
      if (roomErr) throw roomErr;
      if (!newRoom?.id) throw new Error("No room ID returned");

      await supabase.from("deal_room_members").insert({
        deal_room_id: newRoom.id,
        user_id: userId,
        role: "founder",
        accepted_at: new Date().toISOString(),
      });

      await supabase.from("activities").insert({
        deal_room_id: newRoom.id,
        actor_id: userId,
        action: `Deal room created for ${investorName.trim()}${investorFirm.trim() ? ` (${investorFirm.trim()})` : ""} · ${dealType}${fundingTarget ? ` · $${fundingTarget}` : ""}`,
      });

      if (inviteEmail.trim()) {
        await supabase.from("invites").insert({
          email: inviteEmail.trim(),
          role: "investor",
          invited_by: userId,
          deal_room_id: newRoom.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["deal-rooms", userId] });
      onClose();
      navigate({ to: "/app/deal-room/$id" as any, params: { id: newRoom.id } as any });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal room.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-elev p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold inline-flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand" /> Create new deal room
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

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
                onClick={() => {
                  setSelectedLead(null);
                  setSearch("");
                  setInvestorName("");
                  setInviteEmail("");
                }}
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
                    No matching leads — type an email below to invite manually.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Investor firm</label>
          <input
            value={investorFirm}
            onChange={(e) => setInvestorFirm(e.target.value)}
            placeholder="Sequoia Capital"
            className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="text-xs text-muted-foreground">Funding target ($)</label>
            <input
              type="number"
              value={fundingTarget}
              onChange={(e) => setFundingTarget(e.target.value)}
              placeholder="500000"
              className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief notes on this investor relationship…"
            className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Invite investor email (optional)</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="investor@sequoia.com"
            className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">We'll create an invite link you can share with them.</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Select startup *</label>
          {startupsLoading ? (
            <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : startups.length === 0 ? (
            <div className="mt-1.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
              Set up your company profile first.{" "}
              <Link to="/app/profile" className="text-brand hover:underline" onClick={onClose}>
                Go to profile →
              </Link>
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
            disabled={saving || !investorName.trim() || !startupId || startups.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm disabled:opacity-60"
          >
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</> : "Create deal room"}
          </button>
        </div>
      </form>
    </div>
  );
}
