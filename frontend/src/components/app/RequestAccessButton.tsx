import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { color, font, radius, brand } from "@/lib/design-tokens";
import { useAccountContext } from "@/hooks/useAccountContext";
import { INVESTOR_PERMISSIONS } from "@/lib/roles";

/**
 * R14 — the one request-access surface, reused everywhere a founder
 * appears on the investor side (Watchlist, Deal Intake, Deal Flow,
 * Directory). Two clicks: button, then Send inside the confirm dialog.
 *
 * This is NOT a deal-room invite — investors have no create_deal_room
 * permission (see roles.ts INVESTOR_PERMISSIONS). It creates a
 * discovery_requests row via the existing sendConnectionRequest()
 * server fn (same one Directory's Connect button already uses); the
 * founder approves or declines, and approval is what actually creates
 * the deal room (connection-request-fn.ts, approveConnectionRequest).
 * Confirm-first per CLAUDE.md §3 — visible to another party (the founder).
 */
export function RequestAccessButton({
  startupId,
  companyName,
  disabled,
  disabledReason,
  existingStatus,
  onSent,
}: {
  startupId: string;
  companyName: string;
  disabled?: boolean;
  disabledReason?: string;
  existingStatus?: "pending" | "approved" | "deal_room_created" | null;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // RBAC (R12 pattern, roles.ts INVESTOR_PERMISSIONS): analyst and external
  // roles have request_access: false. This is UI-layer messaging only —
  // sendConnectionRequest's own INSERT is what's actually protected by
  // discovery_requests' RLS; this just avoids showing an action the caller
  // can't complete.
  const accountCtx = useAccountContext();
  const isInvestorSide = accountCtx.accountType.startsWith("investor");
  const canRequestAccess = !isInvestorSide || accountCtx.isOwner || (INVESTOR_PERMISSIONS[accountCtx.role]?.request_access ?? false);

  if (existingStatus === "pending") {
    return (
      <span style={{ fontSize: 12, color: color.inkTertiary, whiteSpace: "nowrap" }}>Request pending</span>
    );
  }
  if (existingStatus === "approved" || existingStatus === "deal_room_created") {
    return (
      <span style={{ fontSize: 12, color: "#059669", whiteSpace: "nowrap" }}>Access granted</span>
    );
  }

  if (disabled || !canRequestAccess) {
    return (
      <span
        title={disabled ? disabledReason : "Your role does not include requesting access"}
        style={{ fontSize: 12, color: color.inkTertiary, cursor: "not-allowed" }}
      >
        Request access
      </span>
    );
  }

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired — sign in again"); return; }

      const { sendConnectionRequest } = await import("@/lib/connection-request-fn");
      const result = await sendConnectionRequest({
        data: {
          userAccessToken: session.access_token,
          targetStartupId: startupId,
          message: message.trim() || undefined,
        },
      });

      if (!result.ok && result.error !== "already_exists") {
        toast.error("Could not send request");
        return;
      }

      toast.success(result.ok ? "Request sent" : "Request already sent");
      setOpen(false);
      setMessage("");
      onSent?.();
    } catch {
      toast.error("Could not send request");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          height: 28, padding: "0 10px", fontSize: 12, fontWeight: 500,
          background: color.white, color: brand.flat,
          border: `1px solid ${color.border}`, borderRadius: radius.control,
          cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        Request access
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 16 }}
          onClick={() => !sending && setOpen(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 420, background: color.white, border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: color.ink }}>
                  Request access — {companyName}
                </div>
                <p style={{ marginTop: 6, fontSize: 12, color: color.inkTertiary, lineHeight: 1.5 }}>
                  The founder reviews every request. If approved, a deal room opens for both of you.
                </p>
              </div>
              <button
                onClick={() => !sending && setOpen(false)}
                style={{ background: "transparent", border: "none", color: color.inkTertiary, cursor: "pointer", padding: 4, flexShrink: 0 }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <label style={{ display: "block", marginTop: 16, fontSize: 11, fontWeight: 500, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              rows={3}
              maxLength={200}
              placeholder="Thesis fit, why now…"
              style={{
                marginTop: 6, width: "100%", border: `1px solid ${color.border}`, borderRadius: radius.control,
                padding: "8px 10px", fontSize: 13, fontFamily: font.body, resize: "none", outline: "none",
              }}
            />
            <div style={{ marginTop: 4, textAlign: "right", fontSize: 11, color: color.inkTertiary }}>{message.length}/200</div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                onClick={() => !sending && setOpen(false)}
                disabled={sending}
                style={{
                  flex: 1, height: 36, background: color.white, color: color.ink,
                  border: `1px solid ${color.border}`, borderRadius: radius.control, fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  flex: 1, height: 36, background: brand.flat, color: "#fff",
                  border: "none", borderRadius: radius.control, fontSize: 13, fontWeight: 500,
                  cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {sending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : null}
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
