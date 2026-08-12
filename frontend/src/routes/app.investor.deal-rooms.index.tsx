import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import {
  V2PageHeader, V2EmptyState, V2SkeletonRows,
  LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel, ReferenceLine,
} from "@/components/v2";

export const Route = createFileRoute("/app/investor/deal-rooms/")({
  component: DealRoomsPage,
});

// Workflow stage → §7.2 closed vocabulary. "Open"/"Info Vault"/"Q&A" are
// progress states, not one of the four literal words — mapped to the
// nearest tone (neutral: in progress, not yet satisfied or adverse).
const STAGE_TO_LABEL: Record<string, { label: string; tone: "satisfied" | "attention" | "adverse" | "neutral" }> = {
  information_vault: { label: "Info vault",  tone: "neutral" },
  qa:                 { label: "Q&A",         tone: "neutral" },
  due_diligence:      { label: "Diligence",   tone: "attention" },
  term_sheet:         { label: "Term sheet",  tone: "attention" },
  closing:            { label: "Closing",     tone: "attention" },
};

export function DealRoomsPage() {
  const { user } = useAuth();

  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ["investor-deal-rooms-list", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Pull via deal_room_members membership
      const [membersRes, directRes] = await Promise.all([
        supabase
          .from("deal_room_members")
          .select(`deal_room_id, deal_rooms(id, updated_at, created_at, status, workflow_stage, investor_email, reference_no, startups(company_name, sector, stage, funding_target, tagline))`)
          .eq("user_id", user!.id),
        // Also pull deal rooms where investor_user_id = current user
        supabase
          .from("deal_rooms")
          .select("id, updated_at, created_at, status, workflow_stage, investor_email, reference_no, startups(company_name, sector, stage, funding_target, tagline)")
          .eq("investor_user_id", user!.id),
      ]);

      const seen = new Set<string>();
      const rows: any[] = [];

      for (const r of membersRes.data ?? []) {
        const dr = r.deal_rooms as any;
        if (!dr?.id || seen.has(dr.id)) continue;
        seen.add(dr.id);
        rows.push({ id: dr.id, updatedAt: dr.updated_at, createdAt: dr.created_at, status: dr.status, workflowStage: dr.workflow_stage, referenceNo: dr.reference_no, company: dr.startups?.company_name ?? "Unnamed", sector: dr.startups?.sector, stage: dr.startups?.stage, fundingTarget: dr.startups?.funding_target, tagline: dr.startups?.tagline });
      }

      for (const dr of directRes.data ?? []) {
        if (!dr.id || seen.has(dr.id)) continue;
        seen.add(dr.id);
        rows.push({ id: dr.id, updatedAt: dr.updated_at, createdAt: dr.created_at, status: dr.status, workflowStage: (dr as any).workflow_stage, referenceNo: (dr as any).reference_no, company: (dr as any).startups?.company_name ?? "Unnamed", sector: (dr as any).startups?.sector, stage: (dr as any).startups?.stage, fundingTarget: (dr as any).startups?.funding_target, tagline: (dr as any).startups?.tagline });
      }

      return rows.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
      <V2PageHeader
        breadcrumb={[{ label: "Deal flow", to: "/app/investor/evaluate" }, { label: "Deal rooms" }]}
        title="Deal rooms"
        description={`${rooms.length} active data room${rooms.length !== 1 ? "s" : ""} you've been invited to`}
      />

      {isLoading ? (
        <V2SkeletonRows rows={4} columns={5} />
      ) : isError ? (
        <V2EmptyState
          text="Deal rooms could not load."
          action={{ label: "Refresh page", onClick: () => window.location.reload() }}
        />
      ) : rooms.length === 0 ? (
        <V2EmptyState
          text="No deal rooms yet."
          action={{ label: "Browse startups", href: "/app/investor/startups" }}
        />
      ) : (
        <LedgerTable>
          <LedgerHead>
            <tr>
              <Th>Company</Th>
              <Th>Reference</Th>
              <Th>Stage</Th>
              <Th>Funding target</Th>
              <Th>Last activity</Th>
            </tr>
          </LedgerHead>
          <LedgerBody>
            {rooms.map((room) => {
              const stageInfo = STAGE_TO_LABEL[(room as any).workflowStage ?? ""] ?? { label: "Open", tone: "neutral" as const };
              const daysSinceActivity = room.updatedAt
                ? Math.floor((Date.now() - new Date(room.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const isStale = daysSinceActivity !== null && daysSinceActivity > 7;

              return (
                <Tr key={room.id} status={isStale ? "attention" : undefined}>
                  <Td>
                    <Link
                      to="/app/deal-rooms/$id"
                      params={{ id: room.id }}
                      className="font-medium text-v2-ink hover:text-v2-accent hover:underline"
                      data-testid={`deal-room-card-${room.id}`}
                    >
                      {room.company}
                    </Link>
                    <div className="text-v2-ink-muted" style={{ fontSize: "11.5px" }}>{room.sector || "—"} · {room.stage || "Stage TBD"}</div>
                    {room.tagline && (
                      <div className="text-v2-ink-secondary" style={{ fontSize: "11.5px", marginTop: "2px" }}>{room.tagline}</div>
                    )}
                  </Td>
                  <Td>
                    <ReferenceLine refNo={(room as any).referenceNo} />
                  </Td>
                  <Td><StatusLabel tone={stageInfo.tone}>{stageInfo.label}</StatusLabel></Td>
                  <Td>
                    <div className="inline-flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-v2-ink-muted" />
                      {room.fundingTarget || "Target TBD"}
                    </div>
                  </Td>
                  <Td>
                    <div className="inline-flex items-center gap-1.5" style={{ color: isStale ? "var(--v2-attention)" : "var(--v2-ink-secondary)" }}>
                      <Clock className="h-3 w-3" />
                      {room.updatedAt
                        ? formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })
                        : "—"}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </LedgerBody>
        </LedgerTable>
      )}
    </div>
  );
}
