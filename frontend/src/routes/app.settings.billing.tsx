import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";

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
  const { user } = useAuth();
  const {
    subscription, limits, isTrialing, isActive, isPastDue, isCancelled,
    trialEndsAt, trialDaysRemaining, planName, isLoading,
  } = useSubscription();

  const isInvestor = user?.role === "investor";
  const upgradePlans = isInvestor
    ? [{ name: "Investor Growth", price: 99 }, { name: "Investor Pro", price: 299 }]
    : [{ name: "Founder Pro", price: 49 }, { name: "Founder Scale", price: 199 }];

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8">Loading billing…</div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card border border-border/60 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold">Billing</h2>
        </div>

        {/* ── Trial ── */}
        {isTrialing && (
          <div className="space-y-3">
            <div className="text-lg font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>Free Trial</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {trialDaysRemaining !== null && trialDaysRemaining > 0 ? (
                <span>
                  Your trial ends in <strong className="text-foreground">{trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"}</strong> — {fmtDate(trialEndsAt)}
                </span>
              ) : (
                <span>Your trial ended on {fmtDate(trialEndsAt)}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Choose a plan before your trial ends to keep access.
            </p>
            <div className="flex gap-2 flex-wrap pt-1">
              {upgradePlans.map((p) => (
                <Link
                  key={p.name}
                  to={"/pricing" as any}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-foreground hover:opacity-90"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {p.name} ${p.price}/mo
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Active ── */}
        {isActive && (
          <div className="space-y-2.5">
            <div className="text-sm">
              Current plan: <strong className="text-foreground">{planName}</strong>
            </div>
            <div className="text-sm">
              Status:{" "}
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}>
                Active
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {subscription?.current_period_end
                ? <>Next billing: {fmtDate(subscription.current_period_end)} — ${limits?.price_monthly_usd ?? "—"}</>
                : <>No billing scheduled — your account is on a legacy plan with no charges.</>}
            </div>
            <div className="pt-1">
              <button
                disabled
                title="Stripe integration coming soon — email hello@hockystick.app to change your plan"
                className="inline-flex items-center rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed"
              >
                Manage subscription →
              </button>
              <div className="text-xs text-muted-foreground mt-2">
                Stripe integration coming soon — email{" "}
                <a href="mailto:hello@hockystick.app" className="text-brand hover:underline">hello@hockystick.app</a>{" "}
                to change your plan.
              </div>
            </div>
          </div>
        )}

        {/* ── Past due ── */}
        {isPastDue && (
          <div className="space-y-2.5">
            <div className="text-sm font-medium" style={{ color: "#F59E0B" }}>Your payment failed.</div>
            <p className="text-sm text-muted-foreground">
              Update your payment method to restore full access.
            </p>
            <Link
              to={"/pricing" as any}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-foreground hover:opacity-90"
              style={{ background: "var(--gradient-brand)" }}
            >
              Update payment →
            </Link>
          </div>
        )}

        {/* ── Cancelled ── */}
        {isCancelled && (
          <div className="space-y-2.5">
            <div className="text-sm font-medium text-foreground">Your subscription has been cancelled</div>
            <div className="text-sm text-muted-foreground">
              Access ends: {fmtDate(subscription?.current_period_end)}
            </div>
            <Link
              to={"/pricing" as any}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-foreground hover:opacity-90"
              style={{ background: "var(--gradient-brand)" }}
            >
              Reactivate →
            </Link>
          </div>
        )}
      </div>

      {/* Plan limits summary */}
      {limits && (
        <div className="bg-card border border-border/60 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-3">What your plan includes</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div>Deal rooms: <span className="text-foreground">{limits.deal_room_limit >= 999 ? "Unlimited" : limits.deal_room_limit}</span></div>
            <div>Team members: <span className="text-foreground">{limits.team_member_limit}</span></div>
            <div>Connections: <span className="text-foreground">{limits.vc_connections_limit >= 9999 ? "Unlimited" : limits.vc_connections_limit.toLocaleString()}</span></div>
            <div>AI: <span className="text-foreground">{limits.has_full_ai ? "Full (unlimited)" : `${limits.ai_calls_per_month} calls/month`}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
