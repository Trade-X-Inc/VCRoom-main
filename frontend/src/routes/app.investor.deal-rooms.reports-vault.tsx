import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  V2PageHeader, V2EmptyState, V2SkeletonRows,
  LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td,
} from "@/components/v2";

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
    <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
      <V2PageHeader
        breadcrumb={[{ label: "Investor" }, { label: "Deal rooms" }, { label: "Reports vault" }]}
        title="Reports vault"
        description="Closure reports for your closed deal rooms — a record box you can revisit and download later."
      />

      {isLoading && rooms.length > 0 ? (
        <V2SkeletonRows rows={4} columns={3} />
      ) : reports.length === 0 ? (
        <V2EmptyState text="No closed deals yet." />
      ) : (
        <LedgerTable>
          <LedgerHead>
            <tr>
              <Th>Startup</Th>
              <Th>Outcome</Th>
              <Th>Reason</Th>
              <Th>Closed</Th>
              <Th />
            </tr>
          </LedgerHead>
          <LedgerBody>
            {reports.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-v2-ink">{r.deal_rooms?.startups?.company_name ?? "Startup"}</Td>
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
