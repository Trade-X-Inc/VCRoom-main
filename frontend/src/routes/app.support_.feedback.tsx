import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, Lock } from "lucide-react";
import { LcsButton } from "@/components/lcs";
import { SupportPreviewBanner } from "@/components/app/SupportPreviewBanner";

export const Route = createFileRoute("/app/support_/feedback")({
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

// Invented preview content only — no points ledger, no earn/spend rules,
// no redemption mechanism exists anywhere in the backend. Values below are
// deliberately round/implausible (per CLAUDE.md §7.4's standing lesson: a
// plausible placeholder is how invented content ships) and every
// redemption item is disabled, not clickable, so nothing here can be
// mistaken for a real action.
const MOCK_CREDITS_BALANCE = 0;
const MOCK_REDEMPTIONS = [
  { label: "Priority support queue", cost: 100 },
  { label: "Early access to new features", cost: 250 },
  { label: "1:1 onboarding session", cost: 500 },
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
        <Link
          to="/app/support"
          className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Support
        </Link>
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

      {/* Credits — invented preview content, no real program exists.
          Kept visually separate from the real feedback form above via the
          banner, so nothing here is mistaken for a live balance. */}
      <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--lcs-line)" }}>
        <h2 className="text-base font-bold mb-1" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
          Credits
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          A future program for earning credits by giving feedback, redeemable for perks.
        </p>
        <SupportPreviewBanner text="No credits program exists yet. The balance and redemption list below are invented placeholder content for visual review — nothing here is tracked, earned, or redeemable." />
        <div className="border p-6 mb-4" style={{ borderColor: "var(--lcs-line)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Your balance</div>
          <div className="text-2xl font-bold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-data)" }}>
            {MOCK_CREDITS_BALANCE} credits
          </div>
        </div>
        <div className="border" style={{ borderColor: "var(--lcs-line)" }}>
          <div className="px-4 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--lcs-line)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
            Redeem
          </div>
          {MOCK_REDEMPTIONS.map((r, i) => (
            <div
              key={r.label}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: i > 0 ? "1px solid var(--lcs-line)" : undefined }}
            >
              <span className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{r.label}</span>
              <span className="flex items-center gap-2 text-xs" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
                {r.cost} credits
                <Lock className="h-3 w-3" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
