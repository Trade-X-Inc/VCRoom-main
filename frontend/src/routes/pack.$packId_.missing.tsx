import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { callAction } from "@/lib/actions/call";
import { packMissingFields } from "@/lib/actions/pack-prepare";
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["pack-missing", packId],
    enabled: UUID_RE.test(packId),
    queryFn: async () => {
      // packMissingFields' own pack_api function self-authorizes via
      // authz_is_startup_founder against the pack's own subject_ref —
      // scopeId is not an authorization input (see pack-prepare.ts's own
      // header), so the founder's startup id is used here purely by the
      // slice's shared convention, resolved the same existing,
      // unmodified way every other screen in this slice does.
      const { data: startupRow, error: startupErr } = await supabase
        .from("startups")
        .select("id")
        .eq("founder_id", user!.id)
        .maybeSingle();
      if (startupErr || !startupRow?.id) throw new Error("not_found");

      const result = await callAction<{
        ok: true;
        missing_fields: MissingField[];
      }>(packMissingFields, startupRow.id, { packId });
      return result;
    },
  });

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

      {isLoading ? (
        <LcsSkeletonRows rows={5} columns={2} />
      ) : error ? (
        <LcsEmptyState
          title="Could not load missing fields"
          text="Something went wrong. Try again."
        />
      ) : grouped.length === 0 ? (
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
