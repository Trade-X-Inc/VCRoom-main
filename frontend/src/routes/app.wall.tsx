import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/wall")({
  head: () => ({ meta: [{ title: "The Wall — Hockystick" }] }),
  component: Wall,
});

function Wall() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notified, setNotified] = useState(false);

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("waitlist_entries").insert({
        full_name: user?.full_name || "",
        email,
        role: user?.role,
        problem: "Achievement Wall launch notification",
      });
      if (error) throw error;
      toast.success("We'll notify you when it launches.");
      setEmail("");
      setNotified(true);
    } catch (err) {
      toast.error((err as any).message || "Failed to save email");
    } finally {
      setLoading(false);
    }
  };

  const SAMPLES = [
    { name: "Atlas Robotics", milestone: "Closed $2M seed round", reactions: 23, comments: 5, gradient: "from-blue-600 to-cyan-600" },
    { name: "HealthAI", milestone: "Reached 1,000 users", reactions: 41, comments: 8, gradient: "from-green-600 to-emerald-600" },
    { name: "ClimateX", milestone: "Accepted to YC W26", reactions: 67, comments: 12, gradient: "from-orange-500 to-red-600" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          The Wall
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Milestones worth celebrating.</p>
      </div>

      <div className="mb-6 px-4 py-3 rounded-lg bg-accent border border-brand/20 text-sm text-brand text-center">
        🏆 The Achievement Wall goes live at public launch. Founders share milestones, investors celebrate wins.
      </div>

      <div className="rounded-2xl border border-brand/20 bg-card p-10">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <div className="inline-block px-3 py-1 rounded-full bg-accent border border-brand/20">
            <span className="text-sm text-brand font-medium">Coming in Stage 2</span>
          </div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
            Your story deserves an audience.
          </h2>
          <p className="text-muted-foreground">
            The Achievement Wall is where founders share milestones, investors celebrate wins, and the community grows together.
          </p>
          {notified ? (
            <p className="text-sm text-green-500 font-medium">You're on the list.</p>
          ) : (
            <form onSubmit={handleNotify} className="flex gap-2 max-w-sm mx-auto">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required disabled={loading} className="flex-1" />
              <button type="submit" disabled={loading}
                className="px-4 py-2 rounded-lg hs-gradient text-brand-foreground text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50">
                {loading ? "..." : "Notify me"}
              </button>
            </form>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-5">
          <h3 className="text-base font-semibold">Sample achievements</h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-accent text-muted-foreground border-border/60 uppercase tracking-wider">MOCKUP</span>
        </div>
        <div className="space-y-3">
          {SAMPLES.map((s) => (
            <div key={s.name} className="rounded-none border border-border/60 bg-card p-5">
              <div className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${s.gradient} shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{s.name}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-accent text-muted-foreground border-border/60 uppercase tracking-wider">
                      MOCKUP
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.milestone}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> {s.reactions} reactions</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {s.comments} comments</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
