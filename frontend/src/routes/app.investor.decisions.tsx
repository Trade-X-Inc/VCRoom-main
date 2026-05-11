import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, Pause, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/investor/decisions")({
  component: DecisionsPage,
});

function DecisionsPage() {
  const { user } = useAuth();

  // Fetch rooms user is a member of
  const { data: memberData } = useQuery({
    queryKey: ["my-room-ids-decisions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const roomIds = memberData?.map((r) => r.deal_room_id) ?? [];

  // Fetch decisions with company names
  const { data: decisions = [], isLoading, isError } = useQuery({
    queryKey: ["decisions-board", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decisions")
        .select(`
          id, status, notes, deal_room_id, created_at,
          deal_rooms(startups(company_name, sector))
        `)
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        company: d.deal_rooms?.startups?.company_name ?? "Deal",
        sector: d.deal_rooms?.startups?.sector,
      }));
    },
  });

  const cols = {
    invest: decisions.filter((d) => ["accept", "invest"].includes(String(d.status).toLowerCase())),
    hold: decisions.filter((d) => String(d.status).toLowerCase() === "hold"),
    pass: decisions.filter((d) => ["pass", "rejected"].includes(String(d.status).toLowerCase())),
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decision Board</h1>
        <div className="text-sm text-muted-foreground">Investment decisions across your active deals</div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          ["Total decisions", `${decisions.length}`],
          ["Invest", `${cols.invest.length}`],
          ["Hold", `${cols.hold.length}`],
          ["Pass rate", decisions.length > 0 ? `${Math.round((cols.pass.length / decisions.length) * 100)}%` : "—"],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card h-64 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
          Could not load data. Please refresh.
        </div>
      ) : (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {[
            { t: "Invest", c: "success" as const, Icon: Check, items: cols.invest },
            { t: "Hold",   c: "warning" as const, Icon: Pause, items: cols.hold },
            { t: "Pass",   c: "destructive" as const, Icon: X,   items: cols.pass },
          ].map((col) => (
            <div key={col.t} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className={`px-5 py-3 border-b border-border/60 flex items-center gap-2`}>
                <col.Icon className={`h-4 w-4 text-${col.c}`} />
                <span className="text-sm font-semibold">{col.t}</span>
                <span className="text-xs text-muted-foreground ml-auto">{col.items.length}</span>
              </div>
              <div className="p-3 space-y-2">
                {col.items.length === 0 ? (
                  <div className="py-8 text-sm text-muted-foreground text-center">
                    No {col.t.toLowerCase()} decisions yet
                  </div>
                ) : (
                  col.items.map((item: any) => (
                    <Link
                      key={item.id}
                      to="/app/deal-room/$id"
                      params={{ id: item.deal_room_id }}
                      className="block rounded-xl border border-border/60 bg-background/40 p-3 hover:shadow-card transition-shadow"
                    >
                      <div className="text-sm font-medium">{item.company}</div>
                      {item.sector && <div className="text-xs text-muted-foreground">{item.sector}</div>}
                      {item.notes && (
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.notes}</div>
                      )}
                      {item.created_at && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state when investor has no rooms yet */}
      {!isLoading && memberData?.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
          <h3 className="text-lg font-semibold">No decisions yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Decisions appear here once you've been invited to deal rooms.
          </p>
        </div>
      )}
    </div>
  );
}
