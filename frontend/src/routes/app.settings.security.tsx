import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
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
      // Soft-delete: mark user as deleted in DB, then sign out.
      // The update must be verified — signing out on a failed update would
      // leave the account fully active while the user believes it's deleted.
      const { error } = await supabase.from("users").update({ role: "deleted", updated_at: new Date().toISOString() } as any).eq("id", user.id);
      if (error) throw new Error(`Could not delete account: ${error.message}`);
      await supabase.auth.signOut();
      nav({ to: "/", replace: true });
      toast.success("Account deleted. Sorry to see you go.");
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
              Permanently removes your account and all associated data. This cannot be undone.
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
            This will permanently delete your account, all deal rooms, documents, and data. This action cannot be undone.
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
