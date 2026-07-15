import { Link } from "@tanstack/react-router";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";
import { StatusDot } from "@/components/system";

/** /app/investor — the investor home. Four deal-flow steps, one spine. */

const STEPS = [
  { n: "①", to: "/app/investor/thesis", label: "Thesis" },
  { n: "②", to: "/app/investor/source", label: "Source" },
  { n: "③", to: "/app/investor/evaluate", label: "Evaluate" },
  { n: "④", to: "/app/investor/decide", label: "Decide" },
] as const;

export function DealFlowHome() {
  const { data: p } = useDealFlowProgress();

  const meta = (to: string) => {
    if (!p) return { metric: "", tone: "neutral" as const, status: "" };
    switch (to) {
      case "/app/investor/thesis":
        return p.thesisSet
          ? { metric: "", tone: "positive" as const, status: "Set" }
          : { metric: "", tone: "warning" as const, status: "Define your thesis" };
      case "/app/investor/source":
        return {
          metric: String(p.watchlistCount),
          tone: p.watchlistCount ? ("positive" as const) : ("neutral" as const),
          status: p.watchlistCount ? "On watchlist" : "Nothing sourced yet",
        };
      case "/app/investor/evaluate":
        return {
          metric: String(p.activeRooms),
          tone: p.activeRooms ? ("positive" as const) : ("neutral" as const),
          status: p.activeRooms ? "Active rooms" : "No rooms yet",
        };
      case "/app/investor/decide":
        return p.pendingDecisions
          ? { metric: String(p.pendingDecisions), tone: "warning" as const, status: "Pending" }
          : { metric: String(p.portfolioCount), tone: p.portfolioCount ? ("positive" as const) : ("neutral" as const), status: p.portfolioCount ? "In portfolio" : "Nothing pending" };
      default:
        return { metric: "", tone: "neutral" as const, status: "" };
    }
  };

  return (
    <div className="p-6 lg:p-12 max-w-3xl mx-auto" data-testid="deal-flow-home">
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
        Investor
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Deal flow
      </h1>

      <div>
        {STEPS.map((s) => {
          const m = meta(s.to);
          return (
            <Link
              key={s.to}
              to={s.to}
              className="hs-hairline-t flex items-center justify-between gap-6 py-8 group"
              data-testid={`flow-step-${s.label.toLowerCase()}`}
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
                {m.metric && m.metric !== "0" && (
                  <span className="text-[13px] font-semibold tabular-nums">{m.metric}</span>
                )}
                <StatusDot tone={m.tone} label="" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hs-hairline-t mt-4 pt-8 flex items-center gap-6 text-xs text-muted-foreground">
        <Link to="/app/investor/assistant" className="hover:text-foreground transition-colors">
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
