import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileCheck2, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — Deal Rooms › Reports Vault (investor). Same closure-report record
// box as the founder side, scoped to rooms this investor participates in.
export const Route = createFileRoute("/app/investor/deal-rooms/reports-vault")({
  component: InvestorReportsVault,
});

interface ClosureReport {
  id: string;
  deal_room_id: string;
  outcome: string;
  reason_category: string | null;
  reason_detail: string | null;
  created_at: string;
  deal_rooms: { status: string; startups: { company_name: string | null } | null } | null;
}

function InvestorReportsVault() {
  const { user } = useAuth();

  const { data: rooms = [] } = useQuery({
    queryKey: ["investor-reports-vault-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [membersRes, directRes] = await Promise.all([
        supabase.from("deal_room_members").select("deal_room_id").eq("user_id", user!.id),
        supabase.from("deal_rooms").select("id").eq("investor_user_id", user!.id),
      ]);
      const ids = new Set<string>();
      for (const r of membersRes.data ?? []) if (r.deal_room_id) ids.add(r.deal_room_id);
      for (const r of directRes.data ?? []) if (r.id) ids.add(r.id);
      return Array.from(ids);
    },
  });

  const { data: reports = [], isLoading } = useQuery<ClosureReport[]>({
    queryKey: ["investor-reports-vault", rooms.join(",")],
    enabled: rooms.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_closure_reports")
        .select("id, deal_room_id, outcome, reason_category, reason_detail, created_at, deal_rooms!inner(status, startups(company_name))")
        .in("deal_room_id", rooms)
        .eq("deal_rooms.status", "closed")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ClosureReport[];
    },
  });

  return (
    <PageFrame
      breadcrumb={[{ label: "Investor" }, { label: "Deal Rooms" }, { label: "Reports Vault" }]}
      title="Reports Vault"
      description="Closure reports for your closed deal rooms — a record box you can revisit and download later."
    >
      {isLoading && rooms.length > 0 ? (
        <EmptyState kind="loading" title="Loading" />
      ) : reports.length === 0 ? (
        <EmptyState kind="empty" title="No closed deals yet" />
      ) : (
        <div className="rounded-none border border-border/60 bg-card divide-y divide-border/60">
          {reports.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{r.deal_rooms?.startups?.company_name ?? "Startup"}</span>
                  <span className="text-xs text-muted-foreground capitalize">· {r.outcome}</span>
                </div>
                {(r.reason_category || r.reason_detail) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {[r.reason_category, r.reason_detail].filter(Boolean).join(" — ")}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground/70 mt-1">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              <Link
                to={"/app/deal-rooms/$id" as any}
                params={{ id: r.deal_room_id } as any}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1.5 text-xs shrink-0 hover:bg-accent transition-colors"
              >
                Open room <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
