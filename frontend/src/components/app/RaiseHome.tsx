import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  useRaiseProgress,
  nextIncomplete,
  SECTION_LABELS,
} from "@/hooks/useRaiseProgress";
import { StatusDot } from "@/components/system";

/**
 * /app — the founder home. A vertical spine of the four raise steps.
 * This IS the overview; there is no separate overview page.
 */

const STEPS = [
  { n: "①", to: "/app/prepare", label: "Prepare" },
  { n: "②", to: "/app/go-live", label: "Go live" },
  { n: "③", to: "/app/deal-rooms", label: "Deal rooms" },
  { n: "④", to: "/app/close", label: "Close" },
] as const;

export function RaiseHome() {
  const { user } = useAuth();
  const { data: p } = useRaiseProgress();
  const next = nextIncomplete(p);

  const stepMeta = (to: string) => {
    if (!p) return { metric: "", tone: "neutral" as const, status: "" };
    switch (to) {
      case "/app/prepare":
        return {
          metric: `${p.prepareDone}/${p.prepareTotal}`,
          tone:
            p.prepareDone === p.prepareTotal
              ? ("positive" as const)
              : ("warning" as const),
          status:
            p.prepareDone === p.prepareTotal
              ? "Done"
              : next
                ? `Next: ${SECTION_LABELS[next]}`
                : "In progress",
        };
      case "/app/go-live":
        return p.goLiveDone
          ? { metric: "Live", tone: "positive" as const, status: "Published" }
          : p.prepareUnlocked
            ? { metric: "", tone: "warning" as const, status: "Ready to publish" }
            : { metric: "", tone: "neutral" as const, status: "Finish Prepare first" };
      case "/app/deal-rooms":
        return {
          metric: String(p.activeRooms),
          tone: p.activeRooms > 0 ? ("positive" as const) : ("neutral" as const),
          status:
            p.activeRooms > 0
              ? `${p.activeRooms} active`
              : "No rooms yet",
        };
      case "/app/close":
        return p.closedRooms > 0
          ? { metric: String(p.closedRooms), tone: "positive" as const, status: "Closed" }
          : p.closingRooms > 0
            ? { metric: String(p.closingRooms), tone: "warning" as const, status: "In closing" }
            : { metric: "", tone: "neutral" as const, status: "Not there yet" };
      default:
        return { metric: "", tone: "neutral" as const, status: "" };
    }
  };

  const firstName = user?.email?.split("@")[0] ?? "Founder";

  return (
    <div className="p-6 lg:p-12 max-w-3xl mx-auto" data-testid="raise-home">
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
        {p?.companyName ?? firstName}
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Your raise
      </h1>

      <div>
        {STEPS.map((s) => {
          const m = stepMeta(s.to);
          return (
            <Link
              key={s.to}
              to={s.to}
              className="hs-hairline-t flex items-center justify-between gap-6 py-8 group"
              data-testid={`home-step-${s.label.toLowerCase().replace(" ", "-")}`}
            >
              <div className="flex items-center gap-6 min-w-0">
                <span
                  className="hs-gradient-text"
                  style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800 }}
                >
                  {s.n}
                </span>
                <div>
                  <div
                    className="text-[15px] font-bold tracking-tight group-hover:opacity-70 transition-opacity"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {s.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.status}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {m.metric && (
                  <span className="text-[13px] font-semibold tabular-nums">{m.metric}</span>
                )}
                <StatusDot tone={m.tone} label="" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hs-hairline-t mt-4 pt-8 flex items-center gap-6 text-xs text-muted-foreground">
        <Link to="/app/assistant" className="hover:text-foreground transition-colors">
          AI Advisor
        </Link>
        <Link to="/app/messages" className="hover:text-foreground transition-colors">
          Team chat
        </Link>
        <Link to="/app/wall" className="hover:text-foreground transition-colors">
          The Wall
        </Link>
        <Link to="/app/referrals" className="hover:text-foreground transition-colors">
          Referrals
        </Link>
      </div>
    </div>
  );
}
