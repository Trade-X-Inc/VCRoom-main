import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  V2PageHeader, V2EmptyState, V2SkeletonRows,
  LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td,
} from "@/components/v2";

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
        .select("id, deal_room_id, outcome, reason_category, reason_detail, created_at, deal_rooms!inner(investor_name, status, startup_id)")
        .eq("deal_rooms.startup_id", startup!.id)
        .eq("deal_rooms.status", "closed")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ClosureReport[];
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
      <V2PageHeader
        breadcrumb={[{ label: "Deal rooms" }, { label: "Reports vault" }]}
        title="Reports vault"
        description="Closure reports for your closed deal rooms — a record box you can revisit and download later."
      />

      {isLoading ? (
        <V2SkeletonRows rows={4} columns={3} />
      ) : reports.length === 0 ? (
        <V2EmptyState text="No closed deals yet." />
      ) : (
        <LedgerTable>
          <LedgerHead>
            <tr>
              <Th>Investor</Th>
              <Th>Outcome</Th>
              <Th>Reason</Th>
              <Th>Closed</Th>
              <Th />
            </tr>
          </LedgerHead>
          <LedgerBody>
            {reports.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-v2-ink">{r.deal_rooms?.investor_name ?? "Investor"}</Td>
                <Td className="capitalize">{r.outcome}</Td>
                <Td>{[r.reason_category, r.reason_detail].filter(Boolean).join(" — ") || "—"}</Td>
                <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
                <Td>
                  <Link
                    to={"/app/deal-rooms/$id" as any}
                    params={{ id: r.deal_room_id } as any}
                    className="inline-flex items-center gap-1 text-v2-accent hover:underline"
                  >
                    Open room <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Td>
              </Tr>
            ))}
          </LedgerBody>
        </LedgerTable>
      )}
    </div>
  );
}
