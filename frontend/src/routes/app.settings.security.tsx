import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { eraseAccount } from "@/lib/erase-account-fn";
import { LcsButton, LcsModal, LcsTextField } from "@/components/lcs";

export const Route = createFileRoute("/app/settings/security")({
  component: SecuritySettings,
});

function SecuritySettings() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  // Password change
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async () => {
    if (!newPw || !confirmPw) { toast.error("Please fill in all fields"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated successfully");
      setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSavingPw(false);
    }
  };

  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      nav({ to: "/sign-in", search: { redirect: "/app" }, replace: true });
    } catch {
      await signOut();
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") { toast.error('Type DELETE to confirm'); return; }
    if (!user?.id) return;
    setDeleting(true);
    try {
      // Real erasure (20 Sep 2026). This previously set role = 'deleted'
      // and nothing else — the account stayed signable-in with every
      // FK-linked row attached (CLAUDE.md §19q). eraseAccount now runs the
      // real two-step path: pack_api.erase_user_account() for the public
      // schema (cascade + anonymise-to-sentinel + hard delete), then the
      // Admin API delete of auth.users, which is the step that actually
      // disables sign-in and which SQL cannot perform.
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      const res = await eraseAccount({ data: { accessToken } });

      if (!res.ok) {
        if (res.error === "blocked") {
          // Not a failure — a deliberate refusal with a real reason.
          // Surfaced verbatim so the user knows what to resolve.
          setDeleting(false);
          toast.error(
            `Account can't be deleted yet: ${res.blockReasons.join("; ")}.`,
            { duration: 10000 },
          );
          return;
        }
        throw new Error(
          res.error === "not_authenticated"
            ? "Your session expired. Sign in again and retry."
            : "Could not delete account. Nothing was changed — please try again.",
        );
      }

      await supabase.auth.signOut();
      nav({ to: "/", replace: true });
      toast.success("Account deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Change password */}
      <section className="border p-5 flex flex-col gap-4" style={{ borderColor: "var(--lcs-line)" }}>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Change password</h2>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <LcsTextField
              label="New password"
              type={showPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-[30px]"
              style={{ color: "var(--lcs-ink-muted)" }}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <LcsTextField
            label="Confirm new password"
            type={showPw ? "text" : "password"}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Repeat new password"
          />
        </div>

        <div className="flex justify-end">
          <LcsButton variant="primary" onClick={handleChangePassword} disabled={savingPw}>
            {savingPw && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Update password
          </LcsButton>
        </div>
      </section>

      {/* Active session */}
      <section className="border p-5 flex flex-col gap-3" style={{ borderColor: "var(--lcs-line)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Current session</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
              {user?.email}
              <span
                className="text-[10px] px-1.5 py-0.5"
                style={{ background: "var(--lcs-satisfied-wash)", color: "var(--lcs-satisfied)", fontFamily: "var(--font-lcs-ui)" }}
              >
                Active
              </span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Signed in as {user?.role}</div>
          </div>
          <LcsButton variant="secondary" onClick={handleSignOutAll}>Sign out</LcsButton>
        </div>
      </section>

      {/* Danger zone */}
      <section className="border p-5 flex flex-col gap-3" style={{ borderColor: "var(--lcs-attention)", background: "var(--lcs-attention-wash)" }}>
        <div className="flex items-center gap-2" style={{ color: "var(--lcs-attention)" }}>
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-lcs-ui)" }}>Danger zone</h2>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Delete account</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              Removes your profile, documents, messages and account data, and permanently disables sign-in.
            </div>
          </div>
          <LcsButton variant="destructive" onClick={() => setShowDeleteModal(true)}>Delete account</LcsButton>
        </div>
      </section>

      {/* Delete confirm modal */}
      {showDeleteModal && (
        <LcsModal
          title="Delete your account?"
          onClose={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
          footer={
            <>
              <LcsButton variant="secondary" onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }} disabled={deleting}>
                Cancel
              </LcsButton>
              <LcsButton variant="destructive" onClick={handleDeleteAccount} disabled={deleting || deleteConfirm !== "DELETE"}>
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete permanently
              </LcsButton>
            </>
          }
        >
          <p className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            Deleting your account removes your profile, documents, messages and account data, and permanently disables sign-in. Where you were party to a completed deal, the transaction record itself is retained — your entries are replaced with a permanent anonymous reference so the other party&rsquo;s record stays intact. This cannot be undone.
          </p>
          <LcsTextField
            label="Type DELETE to confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
          />
        </LcsModal>
      )}
    </div>
  );
}
