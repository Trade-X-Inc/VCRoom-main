import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useAuthStore } from "@/lib/auth-store";
import { callAction } from "@/lib/actions/call";
import { scheduleGet, packCreate } from "@/lib/actions/pack-prepare";
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
// The founder's own startup is loaded via the EXISTING, UNMODIFIED read
// path already used throughout app.profile.tsx — direct
// supabase.from("startups").select(...).eq("founder_id", user.id) — per
// instruction, not reinvented here. That pattern resolves to
// zero-or-one row per founder (every existing call site uses
// .maybeSingle(), never a multi-row .select()), so "startup(s)" in
// practice today is zero-or-one.
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

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

function PackIndexPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  // Founder's own startup — existing, unmodified read path (not
  // app.profile.tsx's exact query site, but the identical shape used
  // throughout that file: direct founder_id-scoped select, RLS-governed,
  // .maybeSingle()).
  const { data: startup, isLoading: startupLoading } = useQuery({
    queryKey: ["pack-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Startup | null> => {
      const { data, error } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id)
        .maybeSingle();
      if (error) {
        console.error("[pack] startup lookup failed:", error);
        return null;
      }
      return (data as Startup | null) ?? null;
    },
  });

  const {
    data: schedule,
    isLoading: scheduleLoading,
    error: scheduleError,
  } = useQuery({
    queryKey: ["pack-schedule", "technology", "seed"],
    queryFn: async () => {
      const token = await getAccessToken();
      void token; // callAction resolves its own session token; kept for clarity only
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

  const isLoading = startupLoading || scheduleLoading;

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

      {!startupLoading && !startup ? (
        <LcsEmptyState
          title="No company profile yet"
          text="Build your company profile before starting a pack."
        />
      ) : isLoading ? (
        <LcsSkeleton />
      ) : scheduleError ? (
        <LcsEmptyState
          title="Could not load the schedule"
          text="Something went wrong loading the published schedule. Try again."
        />
      ) : !schedule?.schedule ? (
        <LcsEmptyState
          title="No published schedule"
          text="There is no published technology/seed schedule yet."
        />
      ) : (
        <LcsCard title="Technology · Seed" count={schedule.fields.length}>
          <div className="p-4 flex flex-col gap-4">
            <div
              className="divide-y"
              style={{ borderColor: "var(--lcs-line)" }}
            >
              {[...schedule.fields]
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
