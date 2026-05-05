import { useState, useEffect } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { AIEmailComposer } from "./AIEmailComposer";
import { useAuth } from "@/lib/auth";

export type LeadStatus =
  | "New"
  | "Shortlisted"
  | "Contacted"
  | "Replied"
  | "Meeting Booked"
  | "Interested"
  | "Deal Room Created"
  | "Rejected"
  | "Follow Up";

export interface VCLead {
  id: string;
  founder_id: string;
  investor_name: string;
  firm_name?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  sector?: string | null;
  stage?: string | null;
  geography?: string | null;
  ticket_size?: string | null;
  status: LeadStatus;
  notes?: string | null;
  follow_up_date?: string | null;
  created_at: string;
  updated_at: string;
}

export const ALL_STATUSES: LeadStatus[] = [
  "New",
  "Shortlisted",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Interested",
  "Deal Room Created",
  "Follow Up",
  "Rejected",
];

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Growth"] as const;

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

interface LeadDrawerProps {
  open: boolean;
  lead: VCLead | null;
  onClose: () => void;
  onSaved: () => void;
}

export function LeadDrawer({ open, lead, onClose, onSaved }: LeadDrawerProps) {
  const isEdit = !!lead;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  if (!open) return null;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [f, setF] = useState({
    investor_name: "",
    firm_name: "",
    email: "",
    linkedin_url: "",
    sector: "",
    stage: "",
    geography: "",
    ticket_size: "",
    status: "New" as LeadStatus,
    follow_up_date: "",
    notes: "",
  });

  useEffect(() => {
    if (lead) {
      setF({
        investor_name: lead.investor_name ?? "",
        firm_name: lead.firm_name ?? "",
        email: lead.email ?? "",
        linkedin_url: lead.linkedin_url ?? "",
        sector: lead.sector ?? "",
        stage: lead.stage ?? "",
        geography: lead.geography ?? "",
        ticket_size: lead.ticket_size ?? "",
        status: lead.status,
        follow_up_date: lead.follow_up_date ?? "",
        notes: lead.notes ?? "",
      });
    } else {
      setF({
        investor_name: "",
        firm_name: "",
        email: "",
        linkedin_url: "",
        sector: "",
        stage: "",
        geography: "",
        ticket_size: "",
        status: "New",
        follow_up_date: "",
        notes: "",
      });
    }
  }, [lead]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.investor_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        investor_name: f.investor_name.trim(),
        firm_name: f.firm_name || null,
        email: f.email || null,
        linkedin_url: f.linkedin_url || null,
        sector: f.sector || null,
        stage: f.stage || null,
        geography: f.geography || null,
        ticket_size: f.ticket_size || null,
        status: f.status,
        follow_up_date: f.follow_up_date || null,
        notes: f.notes || null,
        updated_at: new Date().toISOString(),
      };
      if (isEdit) {
        const { error } = await supabase
          .from("vc_leads")
          .update(payload)
          .eq("id", lead.id)
          .eq("founder_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vc_leads")
          .insert({ ...payload, founder_id: user!.id });
        if (error) throw error;
      }
      toast.success("Lead saved");
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("vc_leads")
        .delete()
        .eq("id", lead.id)
        .eq("founder_id", user!.id);
      if (error) throw error;
      toast.success("Lead deleted");
      onSaved();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveToNotes = async (text: string) => {
    if (!lead) return;
    const appended = [f.notes, text].filter(Boolean).join("\n\n---\n\n");
    await supabase
      .from("vc_leads")
      .update({ notes: appended, updated_at: new Date().toISOString() })
      .eq("id", lead.id)
      .eq("founder_id", user!.id);
    queryClient.invalidateQueries({ queryKey: ["leads", user?.id] });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[400px] border-l border-border/60 bg-background shadow-elev flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-border/60 flex items-center justify-between px-5 shrink-0">
          <h2 className="text-sm font-semibold">{isEdit ? "Edit lead" : "Add lead"}</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <Field label="Investor name *">
              <input
                required
                value={f.investor_name}
                onChange={(e) => set("investor_name", e.target.value)}
                placeholder="Sarah Johnson"
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Firm name">
                <input
                  value={f.firm_name}
                  onChange={(e) => set("firm_name", e.target.value)}
                  placeholder="Sequoia Capital"
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={f.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="sarah@sequoia.com"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="LinkedIn URL">
              <input
                type="url"
                value={f.linkedin_url}
                onChange={(e) => set("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Sector">
                <input
                  value={f.sector}
                  onChange={(e) => set("sector", e.target.value)}
                  placeholder="SaaS, FinTech…"
                  className={inputCls}
                />
              </Field>
              <Field label="Stage">
                <select
                  value={f.stage}
                  onChange={(e) => set("stage", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Geography">
                <input
                  value={f.geography}
                  onChange={(e) => set("geography", e.target.value)}
                  placeholder="US, Europe…"
                  className={inputCls}
                />
              </Field>
              <Field label="Ticket size">
                <input
                  value={f.ticket_size}
                  onChange={(e) => set("ticket_size", e.target.value)}
                  placeholder="$500K–$2M"
                  className={inputCls}
                />
              </Field>
              <Field label="Status">
                <select
                  value={f.status}
                  onChange={(e) => set("status", e.target.value as LeadStatus)}
                  className={inputCls}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Follow-up date">
                <input
                  type="date"
                  value={f.follow_up_date}
                  onChange={(e) => set("follow_up_date", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                value={f.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Context, intro source, thesis fit…"
                className={cn(inputCls, "resize-none")}
              />
            </Field>

            {isEdit && lead?.email && (
              <AIEmailComposer lead={lead} onSaveToNotes={handleSaveToNotes} />
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border/60 px-5 py-3 flex items-center justify-between gap-2">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-1.5 text-sm hover:bg-destructive/10 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !f.investor_name.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? "Save changes" : "Add lead"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}
