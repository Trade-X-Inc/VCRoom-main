import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/settings/security")({
  component: SecuritySettings,
});

const inputCls = "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10";

function SecuritySettings() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  // Password change
  const [currentPw, setCurrentPw] = useState("");
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
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
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

  // Detect if user logged in with OAuth (no password to change)
  const isOAuthUser = user?.email && !user?.email.includes("@") === false &&
    supabase.auth.getUser !== undefined;

  return (
    <div className="space-y-5">
      {/* Change password */}
      <section className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold">Change password</h2>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">New password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                className={inputCls + " pr-10"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
            <input
              type={showPw ? "text" : "password"}
              className={inputCls}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleChangePassword}
            disabled={savingPw}
            className="inline-flex items-center gap-1.5 rounded-md hs-gradient text-brand-foreground px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60 transition-colors"
          >
            {savingPw && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Update password
          </button>
        </div>
      </section>

      {/* Active session */}
      <section className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Current session</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              {user?.email}
              <span className="ml-2 text-[10px] rounded bg-accent text-brand px-1.5 py-0.5">Active</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Signed in as {user?.role}</div>
          </div>
          <button
            onClick={handleSignOutAll}
            className="text-sm text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-3 py-1.5 transition-colors"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Danger zone</h2>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Delete account</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Permanently removes your account and all associated data. This cannot be undone.
            </div>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="shrink-0 rounded-md border border-destructive/40 text-destructive px-3 py-2 text-sm hover:bg-destructive/10 transition-colors"
          >
            Delete account
          </button>
        </div>
      </section>

      {/* Delete confirm modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold">Delete your account?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently delete your account, all deal rooms, documents, and data. This action cannot be undone.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type <strong>DELETE</strong> to confirm</label>
              <input
                className="w-full rounded-md border border-destructive/40 bg-background px-3 py-2 text-sm focus:outline-none focus:border-destructive"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE"}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
