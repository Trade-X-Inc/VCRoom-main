import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { LcsButton } from "@/components/lcs";

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

  if (submitted) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div className="grid h-16 w-16 place-items-center" style={{ background: "var(--lcs-satisfied-wash)", border: "1px solid var(--lcs-satisfied)" }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: "var(--lcs-satisfied)" }} />
        </div>
        <div>
          <h1 className="text-lg font-bold mb-2" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Thank you.</h1>
          <p className="text-sm max-w-xs" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            We read every response and use it to prioritise what to build next. Expect to see changes.
          </p>
        </div>
        <LcsButton
          variant="secondary"
          onClick={() => navigate({ to: user?.role === "investor" ? "/app/investor/overview" : "/app/overview" })}
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </LcsButton>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate({ to: -1 as any })}
          className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
          Share your feedback
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          We read every response. Your input shapes what gets built next.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Rating — plain 1-5 numeric scale, not decorative star iconography
            (same pattern as MemberShell's FeedbackModal, CLAUDE.md's
            27 Aug 2026 Group 1 entry — §13 treats a multi-icon rating
            widget as decorative regardless of whether it's rendered as an
            emoji glyph or an SVG icon component). */}
        <div className="border p-6" style={{ borderColor: "var(--lcs-line)" }}>
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Overall experience</div>
          <div className="text-xs mb-4" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>How would you rate Lengdon so far?</div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                className="h-9 w-9 text-sm font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-lcs-data)",
                  border: v === rating ? "1.5px solid var(--lcs-accent)" : "1px solid var(--lcs-line)",
                  background: v === rating ? "var(--lcs-progress-wash)" : "var(--lcs-white)",
                  color: v === rating ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
                }}
                aria-label={`Rate ${v} of 5`}
                aria-pressed={v === rating}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* What worked */}
        <div className="border p-6" style={{ borderColor: "var(--lcs-line)" }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>What's working well?</label>
          <p className="text-xs mb-3" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>What should we keep doing or double down on?</p>
          <textarea
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            placeholder="The deal room flow is really smooth, especially..."
            rows={3}
            className="w-full px-3 py-2.5 text-sm resize-none focus:outline-none"
            style={{ fontFamily: "var(--font-lcs-ui)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)" }}
          />
        </div>

        {/* What to improve */}
        <div className="border p-6" style={{ borderColor: "var(--lcs-line)" }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>What needs improvement?</label>
          <p className="text-xs mb-3" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Be specific — where did you get stuck or frustrated?</p>
          <textarea
            value={whatToImprove}
            onChange={(e) => setWhatToImprove(e.target.value)}
            placeholder="I had trouble with... / It would help if..."
            rows={3}
            className="w-full px-3 py-2.5 text-sm resize-none focus:outline-none"
            style={{ fontFamily: "var(--font-lcs-ui)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)" }}
          />
        </div>

        {/* Feature checkboxes */}
        <div className="border p-6" style={{ borderColor: "var(--lcs-line)" }}>
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Which features are you using?</div>
          <p className="text-xs mb-4" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Select all that apply.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FEATURES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleFeature(id)}
                className="px-3 py-2 text-xs font-medium text-left transition-colors"
                style={{
                  fontFamily: "var(--font-lcs-ui)",
                  border: selectedFeatures.includes(id) ? "1px solid var(--lcs-accent)" : "1px solid var(--lcs-line)",
                  background: selectedFeatures.includes(id) ? "var(--lcs-progress-wash)" : "transparent",
                  color: selectedFeatures.includes(id) ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Free text */}
        <div className="border p-6" style={{ borderColor: "var(--lcs-line)" }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Anything else?</label>
          <p className="text-xs mb-3" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Feature requests, bug reports, or anything on your mind.</p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Free text — no structure needed here."
            rows={4}
            className="w-full px-3 py-2.5 text-sm resize-none focus:outline-none"
            style={{ fontFamily: "var(--font-lcs-ui)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)" }}
          />
        </div>

        <LcsButton
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || !rating}
          data-testid="feedback-submit-btn"
          className="w-full justify-center py-3"
        >
          {loading ? "Sending…" : "Submit feedback"}
        </LcsButton>
      </div>
    </div>
  );
}
