import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearRecoverySession, isRecoverySession } from "@/lib/recovery";
import { MIN_PASSWORD_LENGTH, passwordProblemText, validateNewPassword } from "@/lib/password-policy";

// Set a NEW password after a reset email. Reached only from /auth/callback with
// the recovery mark (lib/recovery.ts) present: a normal signed-in session must
// not be able to change the password here without knowing the old one (that
// stays in Settings, which asks for the current password first).
// updateUser({ password }) does not need a captcha token.

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | Lengdon" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

type View = "checking" | "form" | "no_link" | "done";

function ResetPassword() {
  const [view, setView] = useState<View>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const hintId = useId();
  const errorId = useId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const ok = !!data.session && isRecoverySession();
      // A mark with no session behind it protects nothing and would only bounce the visitor around: drop it.
      if (!data.session) clearRecoverySession();
      setView(ok ? "form" : "no_link");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setError(passwordProblemText(problem));
      return;
    }
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || "Could not set the new password. Try again.");
      setSaving(false);
      return;
    }
    clearRecoverySession();
    setView("done");
    setSaving(false);
  };

  // Leaving without setting a password: end the recovery session so nothing stays half-open.
  const cancel = async () => {
    await supabase.auth.signOut();
    clearRecoverySession();
    window.location.href = "/sign-in";
  };

  const goToApp = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    let role = (data.session?.user.user_metadata?.role as string | undefined) || "founder";
    if (uid) {
      const { data: row } = await supabase.from("users").select("role").eq("id", uid).maybeSingle();
      if (row?.role) role = row.role;
    }
    window.location.href = role === "investor" ? "/app/investor/" : "/app";
  };

  const label: React.CSSProperties = { fontSize: 13, color: "#0a2540", marginBottom: 6, display: "block" };
  const input: React.CSSProperties = {
    width: "100%",
    minHeight: 44,
    border: "1px solid #64748b",
    padding: "0 14px",
    fontSize: 15,
    color: "#0a2540",
    boxSizing: "border-box",
    background: "#fff",
  };
  const primary: React.CSSProperties = {
    width: "100%",
    minHeight: 48,
    background: "#0a2540",
    color: "#fff",
    border: "none",
    fontSize: 15,
    cursor: "pointer",
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, border: "1px solid #e6e9ef", padding: 32, boxSizing: "border-box" }}>
        {view === "checking" ? (
          <p role="status" aria-live="polite" style={{ margin: 0, color: "#425466", fontSize: 14 }}>
            Checking your reset link…
          </p>
        ) : null}

        {view === "no_link" ? (
          <div>
            <h1 style={{ fontSize: 22, color: "#0a2540", margin: "0 0 8px" }}>This reset link is not active</h1>
            <p style={{ color: "#425466", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
              Open the link from your reset email, or request a new one. Reset links expire and work once.
            </p>
            <Link to="/forgot-password" style={{ color: "#0a2540", fontSize: 14, display: "inline-block", minHeight: 44, lineHeight: "44px" }}>
              Request a new reset link →
            </Link>
          </div>
        ) : null}

        {view === "form" ? (
          <form onSubmit={submit} noValidate>
            <h1 style={{ fontSize: 22, color: "#0a2540", margin: "0 0 8px" }}>Set a new password</h1>
            <p id={hintId} style={{ color: "#425466", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
              Use at least {MIN_PASSWORD_LENGTH} characters.
            </p>

            <label htmlFor="new-password" style={label}>
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
              aria-invalid={error ? true : undefined}
              required
              style={input}
            />

            <label htmlFor="confirm-password" style={{ ...label, marginTop: 16 }}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              required
              style={input}
            />

            <div id={errorId} role="alert" style={{ minHeight: 24, margin: "12px 0", color: "#92400e", fontSize: 13 }}>
              {error}
            </div>

            <button type="submit" disabled={saving} style={{ ...primary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Set new password"}
            </button>
            <button
              type="button"
              onClick={cancel}
              style={{ marginTop: 12, width: "100%", minHeight: 44, background: "transparent", border: "1px solid #64748b", color: "#0a2540", fontSize: 14, cursor: "pointer" }}
            >
              Cancel and sign out
            </button>
          </form>
        ) : null}

        {view === "done" ? (
          <div>
            <h1 style={{ fontSize: 22, color: "#0a2540", margin: "0 0 8px" }}>Password updated</h1>
            <p role="status" aria-live="polite" style={{ color: "#425466", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
              Your new password is set and you are signed in.
            </p>
            <button type="button" onClick={goToApp} style={primary}>
              Continue
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
