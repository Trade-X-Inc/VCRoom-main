import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Star, CheckCircle2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/feedback")({
  component: FeedbackPage,
});

const FEATURES = [
  { id: "deal_rooms", label: "Deal Rooms" },
  { id: "ai_advisor", label: "AI Advisor" },
  { id: "connections", label: "Connections / Pipeline" },
  { id: "documents", label: "Document Workstation" },
  { id: "intake", label: "Investor Intake" },
  { id: "team_chat", label: "Team Chat & Tasks" },
  { id: "profile_builder", label: "Profile Builder" },
  { id: "due_diligence", label: "Due Diligence" },
];

function FeedbackPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [whatWorked, setWhatWorked] = useState("");
  const [whatToImprove, setWhatToImprove] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating before submitting.");
      return;
    }
    setLoading(true);
    try {
      const message = [
        whatWorked ? `What worked well:\n${whatWorked}` : "",
        whatToImprove ? `What to improve:\n${whatToImprove}` : "",
        selectedFeatures.length > 0 ? `Features mentioned: ${selectedFeatures.join(", ")}` : "",
        freeText ? `Additional notes:\n${freeText}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        rating,
        message: message || null,
        type: "in_app",
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback.");
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  if (submitted) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div className="grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: "#10B981" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: "Syne, sans-serif" }}>Thank you.</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            We read every response and use it to prioritise what to build next. Expect to see changes.
          </p>
        </div>
        <button
          onClick={() => navigate({ to: user?.role === "investor" ? "/app/investor/overview" : "/app/overview" })}
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate({ to: -1 as any })}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          Share your feedback
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We read every response. Your input shapes what gets built next.
        </p>
      </div>

      <div className="space-y-6">
        {/* Star rating */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
          <div className="text-sm font-semibold mb-1">Overall experience</div>
          <div className="text-xs text-muted-foreground mb-4">How would you rate Hockystick so far?</div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                onMouseEnter={() => setHoveredRating(v)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    v <= (hoveredRating || rating)
                      ? "fill-[#7C3AED] text-[#7C3AED]"
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
            {(hoveredRating || rating) > 0 && (
              <span className="ml-2 text-sm font-medium" style={{ color: "#A855F7" }}>
                {ratingLabels[hoveredRating || rating]}
              </span>
            )}
          </div>
        </div>

        {/* What worked */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
          <label className="block text-sm font-semibold mb-1">What's working well?</label>
          <p className="text-xs text-muted-foreground mb-3">What should we keep doing or double down on?</p>
          <textarea
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            placeholder="The deal room flow is really smooth, especially..."
            rows={3}
            className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 placeholder:text-muted-foreground/40"
          />
        </div>

        {/* What to improve */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
          <label className="block text-sm font-semibold mb-1">What needs improvement?</label>
          <p className="text-xs text-muted-foreground mb-3">Be specific — where did you get stuck or frustrated?</p>
          <textarea
            value={whatToImprove}
            onChange={(e) => setWhatToImprove(e.target.value)}
            placeholder="I had trouble with... / It would help if..."
            rows={3}
            className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Feature checkboxes */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
          <div className="text-sm font-semibold mb-1">Which features are you using?</div>
          <p className="text-xs text-muted-foreground mb-4">Select all that apply.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FEATURES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleFeature(id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors",
                  selectedFeatures.includes(id)
                    ? "border-brand/60 bg-brand/10 text-brand"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Free text */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
          <label className="block text-sm font-semibold mb-1">Anything else?</label>
          <p className="text-xs text-muted-foreground mb-3">Feature requests, bug reports, or anything on your mind.</p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Free text — no structure needed here."
            rows={4}
            className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 placeholder:text-muted-foreground/40"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !rating}
          data-testid="feedback-submit-btn"
          className="w-full rounded-lg bg-brand text-brand-foreground py-3 text-sm font-semibold hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Sending…" : "Submit feedback"}
        </button>
      </div>
    </div>
  );
}
