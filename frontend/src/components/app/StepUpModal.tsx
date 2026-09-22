import { useEffect, useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";

// Password re-entry step-up modal (Gate C client, 22 Sep 2026).
//
// ONE shared component, mounted by useStepUpGate() (see that hook for the
// resubmit wiring). Deliberately NOT built against either design system
// in this codebase (v1 tokens or --lcs-*): the three real call sites this
// wires into today span both — term-sheets.tsx is Group-6 LCS, ClosingPipeline.tsx
// and app.investor.connections.tsx are still v1 — and three more gated
// actions (documentRequests.setStatus/.delete, documents.grantRelease) have
// no UI at all yet, so this can't correctly commit to either system's
// tokens without being wrong somewhere it's used. A neutral, self-contained
// overlay with its own plain styling is the only choice that renders
// correctly in every context it's dropped into, present or future.
//
// Security-prompt UI norm: this is a lightweight, focused re-auth prompt
// (the pattern every OS/browser "confirm your password" dialog follows),
// not a page — no design-system borrowing needed to look legitimate here.

export function StepUpModal({
  open,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  /** Set after a failed verifyStepUp attempt (wrong password, rate limited,
   *  etc). Re-prompts in place — never a dead end. Cleared on next open. */
  error: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      // Focus on open, and again after an error re-render so the user can
      // immediately retype — never leaves them clicking back into the field.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, error]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const submit = () => {
    if (!password || busy) return;
    onSubmit(password);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(20,20,20,0.45)" }}
      onClick={() => !busy && onCancel()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white"
        style={{
          border: "1px solid #e2e2e0",
          borderRadius: 8,
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="flex items-center gap-2.5 px-5 pt-5 pb-3"
          style={{ borderBottom: "1px solid #efefec" }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 32, height: 32, borderRadius: 6, background: "#f4f4f1" }}
          >
            <Lock style={{ width: 16, height: 16, color: "#57544E" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a19" }}>
              Confirm your password
            </div>
            <div style={{ fontSize: 12.5, color: "#6b6862", marginTop: 1 }}>
              This action requires re-entering your password.
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <label
            htmlFor="step-up-password"
            style={{ fontSize: 12.5, color: "#57544E", display: "block", marginBottom: 6 }}
          >
            Password
          </label>
          <input
            ref={inputRef}
            id="step-up-password"
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{
              width: "100%",
              fontSize: 14,
              padding: "8px 10px",
              border: `1px solid ${error ? "#d97706" : "#dcdcd8"}`,
              borderRadius: 6,
              outline: "none",
              color: "#1a1a19",
              background: busy ? "#faf9f7" : "#fff",
            }}
          />
          {/* Failure re-prompt — never a dead end. Same field stays open,
              focused, cleared, with a specific reason shown inline. */}
          {error && (
            <div style={{ fontSize: 12.5, color: "#b45309", marginTop: 6 }}>
              {error}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3.5"
          style={{ borderTop: "1px solid #efefec" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              fontSize: 13.5,
              padding: "7px 14px",
              borderRadius: 6,
              border: "1px solid #dcdcd8",
              background: "#fff",
              color: "#3a3a38",
              cursor: busy ? "default" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!password || busy}
            style={{
              fontSize: 13.5,
              padding: "7px 14px",
              borderRadius: 6,
              border: "none",
              background: !password || busy ? "#9a9a94" : "#1a1a19",
              color: "#fff",
              cursor: !password || busy ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {busy && <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
