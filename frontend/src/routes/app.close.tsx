import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { PrepareSection } from "@/components/app/PrepareSection";
import { EmptyState, HsButton } from "@/components/system";
import { useRaiseProgress } from "@/hooks/useRaiseProgress";

// ④ Close — term sheets, rooms at closing, completed deals.

export const Route = createFileRoute("/app/close")({
  component: ClosePage,
});

interface RoomRow {
  id: string;
  investor_name: string | null;
  status: string;
  workflow_stage: string | null;
  term_sheet_status: string | null;
  created_at: string;
}

function RoomList({ rooms }: { rooms: RoomRow[] }) {
  return (
    <div className="divide-y divide-border">
      {rooms.map((r) => (
        <Link
          key={r.id}
          to="/app/deal-rooms/$id"
          params={{ id: r.id }}
          className="flex items-center justify-between gap-4 py-4 hover:bg-accent/50 transition-colors"
        >
          <div className="text-[13px] font-semibold">
            {r.investor_name ?? "Deal room"}
          </div>
          <div className="text-xs text-muted-foreground">
            {r.term_sheet_status && !["none", "pending"].includes(r.term_sheet_status)
              ? `Term sheet · ${r.term_sheet_status}`
              : (r.workflow_stage ?? r.status)}
          </div>
        </Link>
      ))}
    </div>
  );
}

function ClosePage() {
  const { user } = useAuth();
  const { data: p } = useRaiseProgress();

  const { data: rooms = [] } = useQuery({
    queryKey: ["close-rooms", p?.startupId],
    enabled: !!p?.startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("id, investor_name, status, workflow_stage, term_sheet_status, created_at")
        .eq("startup_id", p!.startupId!)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[close] rooms fetch failed:", error);
        return [];
      }
      return (data ?? []) as RoomRow[];
    },
  });

  // "pending" is the column default — no term sheet yet.
  const termSheets = rooms.filter(
    (r) => r.term_sheet_status && !["none", "pending"].includes(r.term_sheet_status),
  );
  const closing = rooms.filter((r) => r.workflow_stage === "closing");
  const closed = rooms.filter((r) => r.status === "closed");

  return (
    <div className="p-6 lg:p-12 max-w-4xl mx-auto">
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#71717A",
        }}
      >
        Your raise · Step 4
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Close
      </h1>

      <PrepareSection
        id="term-sheets"
        label="Term sheets"
        status={termSheets.length ? "in-progress" : "not-started"}
        summary={termSheets.length ? `${termSheets.length} active` : "None yet"}
      >
        {termSheets.length ? (
          <RoomList rooms={termSheets} />
        ) : (
          <EmptyState
            kind="empty"
            title="No term sheets yet"
            action={{ label: "Deal rooms", href: "/app/deal-rooms" }}
          />
        )}
      </PrepareSection>

      <PrepareSection
        id="closing"
        label="Closing"
        status={closing.length ? "in-progress" : "not-started"}
        summary={closing.length ? `${closing.length} in closing` : "None yet"}
      >
        {closing.length ? (
          <RoomList rooms={closing} />
        ) : (
          <EmptyState kind="empty" title="No rooms at closing" />
        )}
      </PrepareSection>

      <PrepareSection
        id="closed"
        label="Closed"
        status={closed.length ? "complete" : "not-started"}
        summary={closed.length ? `${closed.length} closed` : "None yet"}
      >
        {closed.length ? (
          <RoomList rooms={closed} />
        ) : (
          <EmptyState kind="empty" title="Nothing closed yet" />
        )}
      </PrepareSection>

      <div className="hs-hairline-t pt-8 mt-4">
        <Link to="/app/deal-rooms">
          <HsButton variant="text">All deal rooms →</HsButton>
        </Link>
      </div>
    </div>
  );
}
