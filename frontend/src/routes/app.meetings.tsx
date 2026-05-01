import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Clock, Video } from "lucide-react";

export const Route = createFileRoute("/app/meetings")({
  component: Meetings,
});

const meetings = [
  { d: "Today", t: "2:00 PM", w: "Marcus Vale (a16z)", k: "Discovery", color: "bg-brand" },
  { d: "Today", t: "4:30 PM", w: "Hana Ito (Index)", k: "Follow-up", color: "bg-violet" },
  { d: "Tomorrow", t: "10:00 AM", w: "Sara Khan (NEA)", k: "Diligence", color: "bg-success" },
  { d: "Wed", t: "1:00 PM", w: "Tom Reid (Kleiner)", k: "Partner meeting", color: "bg-warning" },
  { d: "Fri", t: "11:00 AM", w: "Noah Bell (Bessemer)", k: "Term sheet", color: "bg-success" },
];

function Meetings() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
      <div className="text-sm text-muted-foreground">Upcoming investor meetings with prep notes.</div>

      <div className="mt-6 grid lg:grid-cols-[1fr_280px] gap-5">
        <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
          {meetings.map((m, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_auto] items-center gap-4 px-5 py-4 border-b border-border/60 last:border-0 hover:bg-accent/40">
              <div>
                <div className="text-xs text-muted-foreground">{m.d}</div>
                <div className="text-sm font-semibold">{m.t}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${m.color}`} />
                <div>
                  <div className="text-sm font-medium">{m.w}</div>
                  <div className="text-xs text-muted-foreground">{m.k} · 30 min</div>
                </div>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent"><Video className="h-3.5 w-3.5" /> Join</button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
          <div className="text-sm font-semibold">This week</div>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-muted-foreground">{d}</div>
                <div className={`mt-1 grid place-items-center h-8 rounded-md text-xs ${i === 1 ? "bg-gradient-brand text-brand-foreground font-semibold" : "bg-accent/40"}`}>{i + 11}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 text-xs text-muted-foreground">5 meetings · 2h 30m total</div>
          <button className="mt-4 w-full rounded-md bg-gradient-brand text-brand-foreground py-2 text-sm shadow-glow"><Calendar className="h-4 w-4 inline mr-1.5" /> Schedule</button>
        </div>
      </div>
    </div>
  );
}
