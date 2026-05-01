import { createFileRoute } from "@tanstack/react-router";
import { Building2, TrendingUp, Users, Globe, Calendar, Upload } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  component: Profile,
});

function Profile() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Startup Profile</h1>
          <div className="text-sm text-muted-foreground">This is what investors see when they enter your deal room.</div>
        </div>
        <button className="rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow">Save changes</button>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
        <div className="h-32 bg-gradient-mesh relative">
          <div className="absolute inset-0 noise opacity-40" />
        </div>
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand text-brand-foreground text-2xl font-semibold border-4 border-background shadow-elev">A</div>
            <div className="pb-1">
              <div className="text-xl font-semibold">Atlas Robotics</div>
              <div className="text-sm text-muted-foreground">Industrial robotics powered by physical AI</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              [Globe, "HQ", "San Francisco"],
              [Users, "Team", "23"],
              [Calendar, "Founded", "2022"],
              [Building2, "Stage", "Series A"],
            ].map(([I, l, v]: any) => (
              <div key={l} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <I className="h-4 w-4 text-muted-foreground" />
                <div className="text-[11px] text-muted-foreground mt-1.5">{l}</div>
                <div className="text-sm font-medium">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-6 shadow-card">
          <div className="text-sm font-semibold">Company info</div>
          <div className="mt-4 space-y-4">
            {[
              ["Tagline", "We make industrial robots that learn from one demonstration."],
              ["Sector", "Robotics · Industrial automation · Physical AI"],
              ["Business model", "Hardware + SaaS · Per-robot license"],
              ["Pitch", "Atlas builds general-purpose industrial robots that adapt to new tasks via demonstration learning, replacing fixed-function automation."],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="text-xs text-muted-foreground">{l}</div>
                <div className="text-sm mt-1">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
            <div className="text-sm font-semibold">Key metrics</div>
            <div className="mt-4 space-y-3">
              {[["ARR", "$4.2M", "+318% YoY"], ["Customers", "12", "+5"], ["Burn", "$280K/mo", "stable"], ["Runway", "18 mo", ""]].map(([l, v, d]) => (
                <div key={l} className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">{l}</span>
                  <span className="text-sm font-medium">{v} <span className="text-success text-[10px]">{d}</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-border/80 bg-card p-6 text-center">
            <Upload className="h-5 w-5 text-muted-foreground mx-auto" />
            <div className="text-sm font-medium mt-2">Pitch deck v3</div>
            <div className="text-xs text-muted-foreground mt-0.5">Replace · 12 slides · 4.2 MB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
