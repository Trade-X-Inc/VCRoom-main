import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { brand, color, font, radius } from "@/lib/design-tokens";

/**
 * R13 — the reusable payment-placeholder pattern (CLAUDE.md §32). Any
 * paid feature shows this component, the user accepts, and the caller
 * marks its own row's payment_status 'paid' — no real charge happens.
 *
 * TODO(stripe): this entire component is a placeholder. Replace onConfirm's
 * caller-side logic with a real Stripe PaymentIntent confirmation once the
 * Hockystick entity is registered and Stripe is wired. Search the codebase
 * for "TODO(stripe)" to find every site that needs the swap alongside this one.
 */
export function PaymentConfirm({
  feeLabel,
  feeUsd,
  terms,
  confirming,
  onConfirm,
  onCancel,
}: {
  feeLabel: string;
  feeUsd: number;
  terms: string[];
  confirming: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div
      style={{
        border: `1px solid ${color.border}`,
        background: color.white,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            display: "grid",
            placeItems: "center",
            height: 32,
            width: 32,
            background: "rgba(124,58,237,0.08)",
            flexShrink: 0,
          }}
        >
          <CreditCard style={{ width: 16, height: 16, color: brand.flat }} />
        </div>
        <div>
          <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>
            {feeLabel}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: color.ink, fontFamily: font.display }}>
            ${feeUsd}
          </div>
        </div>
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {terms.map((t, i) => (
          <li key={i} style={{ fontSize: 12, color: color.inkSecondary, display: "flex", gap: 6, lineHeight: 1.5 }}>
            <span style={{ color: color.inkTertiary }}>—</span>
            {t}
          </li>
        ))}
      </ul>

      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          style={{ height: 14, width: 14 }}
        />
        <span style={{ fontSize: 12, fontWeight: 500, color: color.ink }}>
          I understand and accept these terms.
        </span>
      </label>

      <div style={{ fontSize: 11, color: color.inkTertiary, lineHeight: 1.5 }}>
        Payment placeholder — no card is charged. Confirming records your acceptance and marks
        this as paid.
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!accepted || confirming}
          style={{
            height: 36,
            padding: "0 16px",
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            background: brand.flat,
            border: "none",
            borderRadius: radius.control,
            cursor: !accepted || confirming ? "default" : "pointer",
            opacity: !accepted || confirming ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {confirming ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : null}
          Confirm payment
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            style={{
              height: 36,
              padding: "0 16px",
              fontSize: 13,
              color: color.ink,
              background: color.white,
              border: `1px solid ${color.border}`,
              borderRadius: radius.control,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

