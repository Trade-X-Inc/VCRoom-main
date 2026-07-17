import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileCheck2, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — Deal Rooms › Reports Vault. Record box of closure reports for
// CLOSED deal rooms only, per §9.6's /reports rule. deal_room_closure_reports
// was write-only until this pass (RLS enabled, zero policies) — see migration
// deal_room_closure_reports_select_policy.
export const Route = createFileRoute("/app/deal-rooms/reports-vault")({
  component: FounderReportsVault,
});

interface ClosureReport {
  id: string;
  deal_room_id: string;
  outcome: string;
  reason_category: string | null;
  reason_detail: string | null;
  ai_summary: string | null;
  created_at: string;
  deal_rooms: { investor_name: string | null; status: string } | null;
}

function FounderReportsVault() {
  const { user } = useAuth();

  const { data: startup } = useQuery({
    queryKey: ["reports-vault-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id").eq("founder_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: reports = [], isLoading } = useQuery<ClosureReport[]>({
    queryKey: ["reports-vault", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_closure_reports")
        .select("id, deal_room_id, outcome, reason_category, reason_detail, ai_summary, created_at, deal_rooms!inner(investor_name, status, startup_id)")
        .eq("deal_rooms.startup_id", startup!.id)
        .eq("deal_rooms.status", "closed")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ClosureReport[];
    },
  });

  return (
    <PageFrame
      breadcrumb={[{ label: "Deal Rooms" }, { label: "Reports Vault" }]}
      title="Reports Vault"
      description="Closure reports for your closed deal rooms — a record box you can revisit and download later."
    >
      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : reports.length === 0 ? (
        <EmptyState
          kind="empty"
          title="No closed deals yet"
        />
      ) : (
        <div className="rounded-none border border-border/60 bg-card divide-y divide-border/60">
          {reports.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{r.deal_rooms?.investor_name ?? "Investor"}</span>
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
