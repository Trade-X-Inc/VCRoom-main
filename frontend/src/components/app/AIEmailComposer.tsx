import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { generateOutreachEmail } from "@/lib/ai-fn";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { VCLead } from "./LeadDrawer";

interface AIEmailComposerProps {
  lead: VCLead;
  onSaveToNotes: (text: string) => void;
}

export function AIEmailComposer({ lead, onSaveToNotes }: AIEmailComposerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<"cold" | "followup" | null>(null);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const generate = async (type: "cold" | "followup") => {
    if (!user) return;
    setLoading(type);
    setRateLimited(false);
    setResult(null);
    try {
      const openAIKey = import.meta.env.VITE_OPENAI_API_KEY || "";
      const res = await generateOutreachEmail({ data: { leadId: lead.id, type, userId: user.id, openAIKey } });
      setSubject(res.subject);
      setBody(res.body);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Rate limit exceeded") {
        setRateLimited(true);
      } else {
        toast.error("Failed to generate — try again");
      }
    } finally {
      setLoading(null);
    }
  };

  const copyEmail = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToNotes = () => {
    onSaveToNotes(`Subject: ${subject}\n\n${body}`);
    toast.success("Saved to notes");
  };

  const isLoading = loading !== null;

  return (
    <div className="border-t border-border/60 pt-4 mt-1">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        <span className="text-xs font-semibold text-brand uppercase tracking-wide">
          AI Email Generator
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => generate("cold")}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50 flex-1 justify-center"
        >
          {loading === "cold" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Cold email
        </button>
        <button
          type="button"
          onClick={() => generate("followup")}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 flex-1 justify-center",
          )}
        >
          {loading === "followup" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Follow-up
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">AI-generated · Review before sending</p>

      {rateLimited && (
        <p className="mt-3 text-xs text-warning bg-warning/10 rounded-md px-3 py-2">
          Daily limit reached (10 emails). Resets in 1 hour.
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyEmail}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent flex-1 justify-center"
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-success" /> Copied!</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copy email</>
              )}
            </button>
            <button
              type="button"
              onClick={saveToNotes}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent flex-1 justify-center"
            >
              <BookOpen className="h-3.5 w-3.5" /> Save to notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
