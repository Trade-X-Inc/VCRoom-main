import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useFounderStartup } from "@/lib/pack/useFounderStartup";
import { useAuthStore } from "@/lib/auth-store";
import { callAction } from "@/lib/actions/call";
import { scheduleGet, packCreate } from "@/lib/actions/pack-prepare";
import { usePackAuthGate } from "@/lib/pack/usePackAuthGate";
import { choosePackScreenState } from "@/lib/pack/screen-state";
import {
  LcsPageShell,
  LcsPageHeader,
  LcsNavItem,
  LcsCard,
  LcsEmptyState,
  LcsButton,
  LcsSkeleton,
} from "@/components/lcs";

// Prepare P1 — pack entry screen. Founder-only.
//
// ROUTE PLACEMENT — deliberately OUTSIDE /app/*, same reasoning as
// /library and /deals-preview/*: app.tsx's layout route unconditionally
// wraps every /app/* child in AdminShell/MemberShell (the old v1/v2
// shell), which would double-wrap this real LcsPageShell. This is
// TEMPORARY placement, not final — cuts over to /app/pack once the real
// app shell migrates to the LCS Component System. Unlike /deals-preview/*
// (mock/localStorage sandbox data), this route calls into REAL pack_v1
// tables via the five pack-prepare.ts gateway actions, through REAL
// authz_is_startup_founder checks against REAL public.startups rows —
// so it has a REAL auth gate, copied verbatim from /library's route.
//
// pack_v1/pack_api remain the isolated, design-proving namespaces
// (CLAUDE.md §8.3) — not promoted to public, but every write from this
// screen is a genuine write to those tables, not a mock.
//
// The founder's own startup is loaded via the shared useFounderStartup hook
// (src/lib/pack/useFounderStartup.ts), so zero- and multiple-company founders
// get the same distinct message on every /pack screen.
//
// Hardcoded sector/stage: "technology"/"seed" — the one published
// schedule that exists today (CLAUDE.md §8.4's single seeded schedule).
// No sector/stage picker in this pass; out of scope.

type Startup = { id: string; company_name: string | null };

type ScheduleField = {
  id: string;
  value_type: string;
  is_required: boolean;
  sort_order: number;
  section_key: string;
  label: string | null;
  help_text: string | null;
};

export const Route = createFileRoute("/pack/")({
  // Real auth gate, matching /app's and /library's own beforeLoad
  // exactly — this route is outside /app/* for shell-nesting reasons
  // only, not because it should skip authentication.
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { user, initialized } = useAuthStore.getState();
    if (initialized && !user)
      throw redirect({ to: "/sign-in", search: {}, replace: true });
  },
  component: PackIndexPage,
});

function PackIndexPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  // Shared lookup — same zero/multiple-company handling on every /pack screen.
  const {
    startup,
    status: startupStatus,
    error: startupError,
    message: startupMessage,
  } = useFounderStartup();

  const {
    data: schedule,
    status: scheduleStatus,
    error: scheduleError,
  } = useQuery({
    queryKey: ["pack-schedule", "technology", "seed"],
    queryFn: async () => {
      const result = await callAction<{
        ok: true;
        schedule: { id: string } & Record<string, unknown>;
        fields: ScheduleField[];
      }>(scheduleGet, startup?.id ?? "unscoped", {
        sector: "technology",
        stage: "seed",
      });
      return result;
    },
    enabled: !!startup?.id,
  });

  const handleCreatePack = async () => {
    if (!startup?.id || !schedule?.schedule?.id) return;
    setCreating(true);
    try {
      const result = await callAction<{
        ok: true;
        pack: { id: string };
        created: boolean;
      }>(packCreate, startup.id, {
        startupId: startup.id,
        scheduleId: schedule.schedule.id,
      });
      // packCreate is idempotent — a pack that already exists for this
      // (startup, schedule) pair is returned as-is (created:false), not
      // an error. Either way, navigate straight to it.
      navigate({
        to: "/pack/$packId",
        params: { packId: result.pack.id },
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : "unknown";
      toast.error(
        code === "forbidden"
          ? "You don't have access to create a pack for this company."
          : "Could not create the pack — try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  const { authInitialized, hasUser } = usePackAuthGate();
  const screenState = choosePackScreenState({
    authInitialized,
    hasUser,
    idValid: true,
    startupStatus,
    startupMessage,
    dataStatus: scheduleStatus,
    isEmpty: !schedule?.schedule,
  });

  return (
    <LcsPageShell
      searchPlaceholder="Search"
      userInitials={(user?.fullName ?? user?.email ?? "?")
        .slice(0, 2)
        .toUpperCase()}
      userLabel={user?.fullName ?? user?.email ?? ""}
      sidebar={(collapsed) => (
        <nav className="flex flex-col gap-0.5 p-2">
          {!collapsed && (
            <div
              className="px-2 py-2 text-[15px] font-semibold"
              style={{
                fontFamily: "var(--font-lcs-ui)",
                color: "var(--lcs-ink)",
              }}
            >
              Lengdon
            </div>
          )}
          <LcsNavItem
            to="/pack"
            label="Pack"
            active
            collapsed={collapsed}
            icon="P"
          />
        </nav>
      )}
    >
      <LcsPageHeader
        title="Pack"
        description="Build your disclosure pack against the published schedule for your sector and stage."
      />

      {screenState === "startup" ? (
        <LcsEmptyState
          title="Can't open this pack"
          text={startupMessage ?? ""}
        />
      ) : screenState === "loading" || screenState === "redirect" ? (
        <LcsSkeleton />
      ) : screenState === "error" ? (
        startupError ? (
          <LcsEmptyState
            title="Could not load your company"
            text="Something went wrong. Try again."
          />
        ) : (
          <LcsEmptyState
            title="Could not load the schedule"
            text="Something went wrong loading the published schedule. Try again."
          />
        )
      ) : screenState === "empty" ? (
        <LcsEmptyState
          title="No published schedule"
          text="There is no published technology/seed schedule yet."
        />
      ) : (
        <LcsCard title="Technology · Seed" count={schedule!.fields.length}>
          <div className="p-4 flex flex-col gap-4">
            <div
              className="divide-y"
              style={{ borderColor: "var(--lcs-line)" }}
            >
              {[...schedule!.fields]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((f) => (
                  <div key={f.id} className="flex flex-col gap-1 py-3">
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--lcs-ink)" }}
                    >
                      {f.label ?? f.id}
                    </div>
                    {f.help_text && (
                      <div
                        className="text-xs"
                        style={{ color: "var(--lcs-ink-muted)" }}
                      >
                        {f.help_text}
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <div>
              <LcsButton
                variant="primary"
                disabled={creating}
                onClick={handleCreatePack}
              >
                {creating ? "Creating…" : "Create pack"}
              </LcsButton>
            </div>
          </div>
        </LcsCard>
      )}
    </LcsPageShell>
  );
}
