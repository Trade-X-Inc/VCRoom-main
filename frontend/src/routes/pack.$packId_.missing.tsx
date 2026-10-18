import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthStore } from "@/lib/auth-store";
import { useFounderStartup } from "@/lib/pack/useFounderStartup";
import { callAction } from "@/lib/actions/call";
import { packMissingFields } from "@/lib/actions/pack-prepare";
import { usePackAuthGate } from "@/lib/pack/usePackAuthGate";
import { choosePackScreenState } from "@/lib/pack/screen-state";
import {
  LcsPageShell,
  LcsPageHeader,
  LcsNavItem,
  LcsCard,
  LcsEmptyState,
  LcsSkeletonRows,
  LcsButton,
} from "@/components/lcs";

// Prepare P1 — missing-fields screen. Founder-only, same route-placement
// and auth-gate reasoning as pack.index.tsx / pack.$packId.tsx.
//
// This route is named .missing under the shared app.support.feedback.tsx
// §7.4-style route-nesting caution (CLAUDE.md): /pack/$packId and
// /pack/$packId/missing share a dot-separated filename prefix
// (pack.$packId / pack.$packId.missing), so TanStack Router's
// file-based routing WOULD treat pack.$packId.tsx as a layout parent for
// this route, requiring an <Outlet /> in it to actually render this
// page's content — pack.$packId.tsx has NO <Outlet />, so without the
// trailing-underscore break this route would silently render the parent
// page instead of this one. Fixed the standing, proven way (confirmed
// against this codebase's own existing precedent, e.g.
// deals-preview.profile_.achievements.tsx): the file is named with a
// trailing underscore after the shared dynamic segment —
// pack.$packId_.missing.tsx — which breaks the parent/child file-naming
// inheritance without changing the real URL
// (/pack/$packId/missing stays the same).

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MissingField = {
  field_key: string;
  section_key: string;
  sort_order: number;
  label: string | null;
};

export const Route = createFileRoute("/pack/$packId_/missing")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { user, initialized } = useAuthStore.getState();
    if (initialized && !user)
      throw redirect({ to: "/sign-in", search: {}, replace: true });
  },
  component: PackMissingPage,
});

function PackMissingPage() {
  const { packId } = Route.useParams();
  const { user } = useAuth();

  const {
    startup,
    status: startupStatus,
    error: startupError,
    message: startupMessage,
  } = useFounderStartup();

  // packMissingFields self-authorizes via authz_is_startup_founder against
  // the pack's own subject_ref; the startup id is only the action scopeId.
  // The query does not run until the startup (and so the user) is loaded.
  const {
    data,
    status: dataStatus,
    error: dataError,
  } = useQuery({
    queryKey: ["pack-missing", packId, startup?.id],
    enabled: UUID_RE.test(packId) && !!startup?.id,
    queryFn: () =>
      callAction<{ ok: true; missing_fields: MissingField[] }>(
        packMissingFields,
        startup!.id,
        { packId },
      ),
  });
  const error = startupMessage ? null : startupError || dataError;
  const { authInitialized, hasUser } = usePackAuthGate();

  const grouped = useMemo(() => {
    const bySection = new Map<string, MissingField[]>();
    for (const f of data?.missing_fields ?? []) {
      const list = bySection.get(f.section_key) ?? [];
      list.push(f);
      bySection.set(f.section_key, list);
    }
    for (const list of bySection.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return Array.from(bySection.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [data?.missing_fields]);

  const screenState = choosePackScreenState({
    authInitialized,
    hasUser,
    idValid: UUID_RE.test(packId),
    startupStatus,
    startupMessage,
    dataStatus,
    isEmpty: grouped.length === 0,
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
          <LcsNavItem to="/pack" label="Pack" collapsed={collapsed} icon="P" />
        </nav>
      )}
    >
      <LcsPageHeader
        title="Missing fields"
        description="Required fields still awaiting confirmation."
        action={
          <Link to="/pack/$packId" params={{ packId }}>
            <LcsButton variant="secondary">Back to pack</LcsButton>
          </Link>
        }
      />

      {screenState === "invalid" ? (
        <LcsEmptyState
          title="Could not load this pack"
          text="This pack link isn't valid."
        />
      ) : screenState === "startup" ? (
        <LcsEmptyState
          title="Can't open this pack"
          text={startupMessage ?? ""}
        />
      ) : screenState === "loading" || screenState === "redirect" ? (
        <LcsSkeletonRows rows={5} columns={2} />
      ) : screenState === "error" ? (
        <LcsEmptyState
          title="Could not load missing fields"
          text="Something went wrong. Try again."
        />
      ) : screenState === "empty" ? (
        <LcsEmptyState text="All required fields are confirmed." />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([section, fields]) => (
            <LcsCard key={section} title={section} count={fields.length}>
              <div
                className="divide-y"
                style={{ borderColor: "var(--lcs-line)" }}
              >
                {fields.map((f) => (
                  <Link
                    key={f.field_key}
                    to="/pack/$packId"
                    params={{ packId }}
                    className="flex items-center justify-between px-4 py-3 hover:underline"
                    style={{ color: "var(--lcs-ink)" }}
                  >
                    <span className="text-sm">{f.label ?? f.field_key}</span>
                  </Link>
                ))}
              </div>
            </LcsCard>
          ))}
        </div>
      )}
    </LcsPageShell>
  );
}
