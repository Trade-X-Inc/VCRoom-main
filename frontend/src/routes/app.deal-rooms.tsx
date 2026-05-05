import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, ArrowUpRight, Plus, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/deal-rooms")({
  component: DealRooms,
});

function DealRooms() {
  const [open, setOpen] = useState(false);
  const { data: rooms = [] } = useQuery({
    queryKey: ["deal-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("id, status, created_at, startups(company_name), organizations(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Rooms</h1>
          <div className="text-sm text-muted-foreground">{rooms.length} active rooms</div>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow">
          <Plus className="h-4 w-4" /> Create new deal room
        </button>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {(rooms as any[]).map((r) => (
          <Link
            to={"/app/deal-room/$id" as any}
            params={{ id: r.id } as any}
            key={r.id}
            className="rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-soft border border-border/60 text-xs font-semibold">
                  {(r.organizations?.name || r.startups?.company_name || "DR").split(" ").map((s: string) => s[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold">{r.organizations?.name ?? r.startups?.company_name ?? "Deal Room"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.startups?.company_name ? `Startup: ${r.startups.company_name}` : "No startup linked"}
                  </div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${r.status === "closed" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>
                {r.status ?? "new"}
              </span>
              <span className="text-muted-foreground">Deal room</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">ID: {r.id.slice(0, 8)}</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{r.status === "new" ? "15%" : "65%"}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-brand" style={{ width: r.status === "new" ? "15%" : "65%" }} />
              </div>
            </div>
          </Link>
        ))}

        {rooms.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-border/60 p-12 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">No deal rooms yet</div>
            <div className="text-xs text-muted-foreground mt-1">Create your first deal room to start a structured investor review.</div>
            <button onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow">
              <Plus className="h-4 w-4" /> Create deal room
            </button>
          </div>
        )}
      </div>

      {open && <CreateRoomForm onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreateRoomForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [investorFirm, setInvestorFirm] = useState("");
  const [startupId, setStartupId] = useState("");

  const { data: startups = [], isLoading: startupsLoading } = useQuery({
    queryKey: ["my-startups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id);
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
    if (!investorName.trim() || !startupId || !user?.id) return;
    setSaving(true);
    setError("");
    try {
      // 1. INSERT deal room
      const { data: newRoom, error: roomErr } = await supabase
        .from("deal_rooms")
        .insert({ startup_id: startupId, status: "new" })
        .select("id")
        .single();
      if (roomErr) throw roomErr;
      if (!newRoom?.id) throw new Error("No room ID returned");

      // 2. INSERT deal_room_members
      await supabase.from("deal_room_members").insert({
        deal_room_id: newRoom.id,
        user_id: user.id,
        role: "founder",
        accepted_at: new Date().toISOString(),
      });

      // 3. INSERT activity
      await supabase.from("activities").insert({
        deal_room_id: newRoom.id,
        actor_id: user.id,
        action: `Deal room created for ${investorName.trim()}${investorFirm.trim() ? ` (${investorFirm.trim()})` : ""}`,
      });

      // 4. Invalidate + navigate
      queryClient.invalidateQueries({ queryKey: ["deal-rooms"] });
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

        <div>
          <label className="text-xs text-muted-foreground">Investor name *</label>
          <input
            required
            value={investorName}
            onChange={(e) => setInvestorName(e.target.value)}
            placeholder="Sarah Johnson"
            className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
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
