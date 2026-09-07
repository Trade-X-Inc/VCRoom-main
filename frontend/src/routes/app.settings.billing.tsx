import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Clock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { LcsButton, LcsStatusPill } from "@/components/lcs";

export const Route = createFileRoute("/app/settings/billing")({
  component: BillingSettings,
});

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

function BillingSettings() {
  const {
    subscription, limits, isTrialing, isActive, isPastDue, isCancelled,
    trialEndsAt, trialDaysRemaining, planName, isLoading,
  } = useSubscription();

  // Build Step 0 hardening, fix 3 of 3 (7 Sep 2026): the plan_limits-derived
  // tier names/prices ($99/$299 investor, $49/$199 founder) previously
  // rendered here directly contradict the published 4-tier fee-by-event
  // model on /product/pricing — both surfaces are live today. CLAUDE.md
  // §20.2 flags this BLOCKING; reconciling the two models is its own
  // product decision + migration, explicitly out of scope for this pass.
  // Minimum fix: stop rendering EITHER model's specific tier names/prices
  // in the trial-upgrade CTA below.

  if (isLoading) {
    return <div className="text-sm py-8" style={{ color: "var(--lcs-ink-muted)" }}>Loading billing…</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border p-6 flex flex-col gap-4" style={{ borderColor: "var(--lcs-line)" }}>
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Billing</h2>
        </div>

        {/* ── Trial ── */}
        {isTrialing && (
          <div className="flex flex-col gap-3">
            <div className="text-lg font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Free Trial</div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              <Clock className="h-4 w-4" />
              {trialDaysRemaining !== null && trialDaysRemaining > 0 ? (
                <span>
                  Your trial ends in <strong style={{ color: "var(--lcs-ink)" }}>{trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"}</strong> — {fmtDate(trialEndsAt)}
                </span>
              ) : (
                <span>Your trial ended on {fmtDate(trialEndsAt)}</span>
              )}
            </div>
            <p className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              Plan management is being finalized. Your access continues during your trial.
            </p>
          </div>
        )}

        {/* ── Active ── */}
        {isActive && (
          <div className="flex flex-col gap-2.5">
            <div className="text-sm" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
              Current plan: <strong>{planName}</strong>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
              Status: <LcsStatusPill status="satisfied" label="Active" />
            </div>
            <div className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              {subscription?.current_period_end
                ? <>Next billing: {fmtDate(subscription.current_period_end)} — ${limits?.price_monthly_usd ?? "—"}</>
                : <>No billing scheduled — your account is on a legacy plan with no charges.</>}
            </div>
            <div className="pt-1">
              <LcsButton variant="secondary" disabled title="Stripe integration coming soon — email hello@lengdon.com to change your plan">
                Manage subscription →
              </LcsButton>
              <div className="text-xs mt-2" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
                Stripe integration coming soon — email{" "}
                <a href="mailto:hello@lengdon.com" style={{ color: "var(--lcs-accent)" }} className="hover:underline">hello@lengdon.com</a>{" "}
                to change your plan.
              </div>
            </div>
          </div>
        )}

        {/* ── Past due ── */}
        {isPastDue && (
          <div className="flex flex-col gap-2.5">
            <div className="text-sm font-medium" style={{ color: "var(--lcs-attention)", fontFamily: "var(--font-lcs-ui)" }}>Your payment failed.</div>
            <p className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              Update your payment method to restore full access.
            </p>
            <Link to={"/pricing" as any}>
              <LcsButton variant="primary">Update payment →</LcsButton>
            </Link>
          </div>
        )}

        {/* ── Cancelled ── */}
        {isCancelled && (
          <div className="flex flex-col gap-2.5">
            <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Your subscription has been cancelled</div>
            <div className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              Access ends: {fmtDate(subscription?.current_period_end)}
            </div>
            <Link to={"/pricing" as any}>
              <LcsButton variant="primary">Reactivate →</LcsButton>
            </Link>
          </div>
        )}
      </div>

      {/* Plan limits summary */}
      {limits && (
        <div className="border p-6" style={{ borderColor: "var(--lcs-line)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>What your plan includes</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            <div>Deal rooms: <span style={{ color: "var(--lcs-ink)" }}>{limits.deal_room_limit >= 999 ? "Unlimited" : limits.deal_room_limit}</span></div>
            <div>Team members: <span style={{ color: "var(--lcs-ink)" }}>{limits.team_member_limit}</span></div>
            <div>Connections: <span style={{ color: "var(--lcs-ink)" }}>{limits.vc_connections_limit >= 9999 ? "Unlimited" : limits.vc_connections_limit.toLocaleString()}</span></div>
            <div>AI: <span style={{ color: "var(--lcs-ink)" }}>{limits.has_full_ai ? "Full (unlimited)" : `${limits.ai_calls_per_month} calls/month`}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
