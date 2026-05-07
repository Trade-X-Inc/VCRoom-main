import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Building2, Mail, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { LeadDrawer } from "@/components/app/LeadDrawer";
import type { VCLead } from "@/components/app/LeadDrawer";

export const Route = createFileRoute("/app/meetings")({
  component: Meetings,
});

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function isPast(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function Meetings() {
  const { user } = useAuth();
  const [selectedLead, setSelectedLead] = useState<VCLead | null>(null);

  const { data: leads = [], isLoading, refetch } = useQuery<VCLead[]>({
    queryKey: ["meeting-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vc_leads")
        .select("*")
        .eq("founder_id", user!.id)
        .eq("status", "Meeting Booked")
        .order("follow_up_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as VCLead[];
    },
  });

  const upcoming = leads.filter((l) => !isPast(l.follow_up_date));
  const past = leads.filter((l) => isPast(l.follow_up_date));

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" />
        <div className="h-4 w-72 rounded bg-muted/60 animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
            <div className="text-sm text-muted-foreground">
              Investor meetings from your VC pipeline.
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {leads.length} meeting{leads.length !== 1 ? "s" : ""} booked
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card shadow-card p-10 flex flex-col items-center justify-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">No meetings booked yet</div>
            <div className="text-xs text-muted-foreground text-center max-w-xs">
              Set a lead's status to "Meeting Booked" in your VC Leads tracker to see it here.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Upcoming ({upcoming.length})
                </div>
                <div className="space-y-3">
                  {upcoming.map((lead) => (
                    <MeetingCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Past ({past.length})
                </div>
                <div className="space-y-3 opacity-70">
                  {past.map((lead) => (
                    <MeetingCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
                </div>
              </section>
            )}
            {leads.filter((l) => !l.follow_up_date).length > 0 && (
              <section>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  No date set
                </div>
                <div className="space-y-3">
                  {leads.filter((l) => !l.follow_up_date).map((lead) => (
                    <MeetingCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <LeadDrawer
        open={!!selectedLead}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onSaved={() => { setSelectedLead(null); refetch(); }}
      />
    </>
  );
}

function MeetingCard({ lead, onClick }: { lead: VCLead; onClick: () => void }) {
  const dateStr = formatDate(lead.follow_up_date);
  const today = isToday(lead.follow_up_date);
  const past = isPast(lead.follow_up_date) && !today;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/60 bg-card shadow-card p-4 hover:border-brand/40 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
          today ? "bg-gradient-brand text-brand-foreground" : past ? "bg-muted/60 text-muted-foreground" : "bg-brand/10 text-brand",
        )}>
          <Calendar className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{lead.investor_name}</span>
            {lead.firm_name && (
              <span className="text-xs text-muted-foreground">· {lead.firm_name}</span>
            )}
            {today && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">Today</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {dateStr && (
              <span className={cn("flex items-center gap-1 text-xs", today ? "text-brand font-medium" : "text-muted-foreground")}>
                <Clock className="h-3 w-3" /> {dateStr}
              </span>
            )}
            {lead.sector && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" /> {lead.sector}
              </span>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
              >
                <Mail className="h-3 w-3" /> {lead.email}
              </a>
            )}
            {lead.linkedin_url && (
              <a
                href={lead.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
              >
                <ExternalLink className="h-3 w-3" /> LinkedIn
              </a>
            )}
          </div>

          {lead.notes && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{lead.notes}</p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          {lead.stage && (
            <span className="text-[10px] rounded-full bg-accent px-2 py-0.5 text-muted-foreground">{lead.stage}</span>
          )}
          {lead.ticket_size && (
            <span className="text-[10px] text-muted-foreground">{lead.ticket_size}</span>
          )}
        </div>
      </div>
    </button>
  );
}
