import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import {
  V2PageHeader, V2EmptyState, V2SkeletonRows,
  LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel,
} from "@/components/v2";

export const Route = createFileRoute("/app/investor/portfolio")({
  // R9 relocation: this URL's content moved — see nav-structure.ts.
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/deal-rooms/portfolio" as any, replace: true });
  },
  component: PortfolioPage,
});

export function PortfolioPage() {
  const { user } = useAuth();

  // Fetch room IDs user is member of
  const { data: memberData } = useQuery({
    queryKey: ["my-room-ids-portfolio", user?.id],
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

  // Fetch rooms where latest decision is an "invest/accept/term_sheet" status
  const { data: invested = [], isLoading, isError } = useQuery({
    queryKey: ["portfolio-rooms", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decisions")
        .select(`
          id, status, created_at, deal_room_id,
          deal_rooms(
            id, updated_at,
            startups(company_name, sector, stage)
          )
        `)
        .in("deal_room_id", roomIds)
        .in("status", ["accept", "invest", "term_sheet"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Dedupe by deal_room_id (keep latest decision per room)
      const seen = new Set<string>();
      return (data ?? [])
        .filter((d: any) => {
          if (seen.has(d.deal_room_id)) return false;
          seen.add(d.deal_room_id);
          return true;
        })
        .map((d: any) => ({
          id: d.deal_room_id,
          decisionId: d.id,
          status: d.status,
          decisionAt: d.created_at,
          updatedAt: d.deal_rooms?.updated_at,
          company: d.deal_rooms?.startups?.company_name ?? "Unnamed",
          sector: d.deal_rooms?.startups?.sector,
          stage: d.deal_rooms?.startups?.stage,
        }));
    },
  });

  // Watchlist companies with status = 'Invested'
  const { data: watchlistInvested = [] } = useQuery({
    queryKey: ["portfolio-watchlist-invested", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("*")
        .eq("investor_id", user!.id)
        .eq("status", "Invested");
      return data ?? [];
    },
  });

  const statusLabel: Record<string, string> = {
    accept: "Invested",
    invest: "Invested",
    term_sheet: "Term Sheet",
  };

  const totalCompanies = invested.length + watchlistInvested.length;

  return (
    <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
      <V2PageHeader
        breadcrumb={[{ label: "Deal flow", to: "/app/investor/decide" }, { label: "Portfolio" }]}
        title="Portfolio"
        description="Companies you've committed to invest in"
      />

      <div className="border border-v2-rule bg-v2-panel p-5 grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        {[
          ["Portfolio companies", `${totalCompanies}`],
          ["Term sheets signed", `${invested.filter((i) => i.status === "term_sheet").length}`],
          ["Investments closed", `${invested.filter((i) => ["accept", "invest"].includes(i.status)).length + watchlistInvested.length}`],
          ["Avg ticket", "—"],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-v2-ink-muted" style={{ fontSize: "11px" }}>{l}</div>
            <div className="mt-1 text-v2-ink font-semibold font-v2-data" style={{ fontSize: "17px" }}>{v}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <V2SkeletonRows rows={4} columns={4} />
      ) : isError ? (
        <V2EmptyState
          text="Something went wrong loading your portfolio."
          action={{ label: "Try again", onClick: () => window.location.reload() }}
        />
      ) : totalCompanies === 0 ? (
        <V2EmptyState text="No portfolio companies yet." />
      ) : (
        <LedgerTable>
          <LedgerHead>
            <tr>
              <Th>Company</Th>
              <Th>Sector / stage</Th>
              <Th>Status</Th>
              <Th>Last activity</Th>
              <Th />
            </tr>
          </LedgerHead>
          <LedgerBody>
            {invested.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <Link
                    to="/app/deal-rooms/$id"
                    params={{ id: c.id }}
                    className="font-medium text-v2-ink hover:text-v2-accent hover:underline"
                  >
                    {c.company}
                  </Link>
                </Td>
                <Td>{c.sector || "—"} · {c.stage || "—"}</Td>
                <Td><StatusLabel tone="satisfied">{statusLabel[c.status] ?? c.status}</StatusLabel></Td>
                <Td>
                  {c.decisionAt
                    ? `Decision ${formatDistanceToNow(new Date(c.decisionAt), { addSuffix: true })}`
                    : "—"}
                </Td>
                <Td>
                  <Link
                    to="/app/deal-rooms/$id"
                    params={{ id: c.id }}
                    className="text-v2-accent hover:underline"
                  >
                    Open room
                  </Link>
                </Td>
              </Tr>
            ))}
            {watchlistInvested.map((c: any) => (
              <Tr key={c.id}>
                <Td className="font-medium text-v2-ink">{c.company_name}</Td>
                <Td>{c.sector || "—"} · {c.stage || "—"}</Td>
                <Td><StatusLabel tone="satisfied">Invested</StatusLabel></Td>
                <Td>
                  {c.created_at
                    ? `Added ${formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}`
                    : "—"}
                </Td>
                <Td>{c.website || "—"}</Td>
              </Tr>
            ))}
          </LedgerBody>
        </LedgerTable>
      )}
    </div>
  );
}
