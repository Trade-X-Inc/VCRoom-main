import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Heart, MessageCircle, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/wall")({
  head: () => ({
    meta: [{ title: "The Wall — Hockystick" }],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.user?.id) {
      throw new Error("Unauthorized");
    }
  },
  component: Wall,
});

function Wall() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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

      toast.success("Thanks! We'll notify you when it launches.");
      setEmail("");
    } catch (err) {
      toast.error((err as any).message || "Failed to save email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">The Wall</h1>
        <p className="text-muted-foreground">
          Milestones worth celebrating.
        </p>
      </div>

      {/* Hero Coming Soon Section */}
      <div className="bg-gradient-to-br from-purple-900/20 via-indigo-900/20 to-purple-900/20 border border-purple-500/30 rounded-2xl p-12">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-semibold">
              Your story deserves an audience.
            </h2>
            <p className="text-lg text-muted-foreground">
              The Achievement Wall is where founders share milestones, investors
              celebrate wins, and the community grows together.
            </p>
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
            <span className="text-sm text-purple-300">Coming in Stage 2</span>
          </div>

          {/* Email Capture */}
          <form onSubmit={handleNotify} className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading}
              className="px-6"
            >
              {loading ? "Saving..." : "Notify me"}
            </Button>
          </form>
        </div>
      </div>

      {/* Sample Achievements Mockup */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-xl font-semibold">Sample achievements</h3>
          <span className="inline-block px-2 py-1 rounded text-xs bg-muted text-muted-foreground">
            Mockup
          </span>
        </div>

        <div className="space-y-4">
          {/* Sample Card 1 */}
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex-shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">Atlas Robotics</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Closed $2M seed round
                </p>

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    <span>23 reactions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>5 comments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Card 2 */}
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex-shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">HealthAI</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Reached 1,000 users
                </p>

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    <span>41 reactions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>8 comments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Card 3 */}
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex-shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">ClimateX</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Accepted to YC W26
                </p>

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    <span>67 reactions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>12 comments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Info */}
      <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/20 rounded-xl p-8 text-center">
        <p className="text-muted-foreground">
          More features coming in Stage 2: profile badges, credibility scores,
          and achievement unlocks.
        </p>
      </div>
    </div>
  );
}
