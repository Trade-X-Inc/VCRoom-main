import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/app/investor/settings")({
  component: InvestorSettingsPage,
});

interface EmailPrefs {
  thesis_match: boolean;
  deal_activity: boolean;
  access_updates: boolean;
  product_news: boolean;
}

const DEFAULT_PREFS: EmailPrefs = {
  thesis_match: true,
  deal_activity: true,
  access_updates: true,
  product_news: false,
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        background: on ? "#7C3AED" : "rgba(255,255,255,0.1)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: on ? "18px" : "2px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#ffffff",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function PrefRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "16px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff", marginBottom: "2px" }}>
          {label}
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
      <Toggle on={value} onChange={onChange} />
    </div>
  );
}

function InvestorSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<EmailPrefs>(DEFAULT_PREFS);
  const [loadedPrefs, setLoadedPrefs] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("investor_profiles")
      .select("email_preferences")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.email_preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...data.email_preferences });
        }
        setLoadedPrefs(true);
      });
  }, [user?.id]);

  const handlePrefChange = (key: keyof EmailPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("investor_profiles")
        .update({ email_preferences: next })
        .eq("user_id", user.id);
      if (error) {
        toast.error("Could not save preferences");
      } else {
        toast.success("Saved");
      }
    }, 500);
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("investor_profiles")
        .update({ deletion_requested_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Deletion requested. Your account will be removed within 24 hours.");
      navigate({ to: "/sign-in" as any });
    } catch {
      toast.error("Could not process deletion request. Contact support@hockystick.app");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: "32px", maxWidth: "640px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.03em", marginBottom: "4px" }}>
        Settings
      </h1>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "32px" }}>
        Manage your email preferences and account.
      </p>

      {/* Section 1 — Email Notifications */}
      <div
        style={{
          background: "#111114",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "4px",
          }}
        >
          Email preferences
        </div>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "20px" }}>
          Control which emails Hockystick sends you.
        </p>

        {!loadedPrefs ? (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", padding: "16px 0" }}>
            Loading…
          </div>
        ) : (
          <>
            <PrefRow
              label="New startup matches"
              description="Get emailed when a founder matching your investment thesis joins Hockystick."
              value={prefs.thesis_match}
              onChange={(v) => handlePrefChange("thesis_match", v)}
            />
            <PrefRow
              label="Deal room updates"
              description="Get emailed when a founder adds documents or activity to a shared deal room."
              value={prefs.deal_activity}
              onChange={(v) => handlePrefChange("deal_activity", v)}
            />
            <PrefRow
              label="Profile access updates"
              description="Get emailed when a founder approves or declines your profile access request."
              value={prefs.access_updates}
              onChange={(v) => handlePrefChange("access_updates", v)}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                paddingTop: "16px",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff", marginBottom: "2px" }}>
                  Product news
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                  Occasional updates about new Hockystick features.
                </div>
              </div>
              <Toggle
                on={prefs.product_news}
                onChange={(v) => handlePrefChange("product_news", v)}
              />
            </div>
          </>
        )}
      </div>

      {/* Section 2 — Account */}
      <div
        style={{
          background: "#111114",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "24px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "20px",
          }}
        >
          Account
        </div>

        {/* Email row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            paddingBottom: "16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "16px",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff", marginBottom: "2px" }}>
              Email address
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{user?.email}</div>
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textAlign: "right", maxWidth: "180px", lineHeight: 1.5 }}>
            To change your email, contact{" "}
            <a href="mailto:support@hockystick.app" style={{ color: "#7C3AED" }}>
              support@hockystick.app
            </a>
          </div>
        </div>

        {/* Delete account row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff", marginBottom: "2px" }}>
              Delete account
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, maxWidth: "360px" }}>
              Permanently remove your investor profile and all associated data. This cannot be undone.
            </div>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              background: "transparent",
              color: "#EF4444",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "16px",
          }}
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            style={{
              background: "#111114",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "400px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(239,68,68,0.1)",
                display: "grid",
                placeItems: "center",
                marginBottom: "16px",
              }}
            >
              <span style={{ color: "#EF4444", fontSize: "18px" }}>⚠</span>
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "8px" }}>
              Are you sure?
            </h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "24px" }}>
              This will permanently delete your investor profile, deal room memberships, and all saved data.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.6)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{
                  background: "#EF4444",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Processing…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
