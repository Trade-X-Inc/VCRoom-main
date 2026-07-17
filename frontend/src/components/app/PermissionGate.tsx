import { useAccountContext } from "@/hooks/useAccountContext";
import { FOUNDER_PERMISSIONS, INVESTOR_PERMISSIONS, ROLE_LABELS } from "@/lib/roles";
import { EmptyState } from "@/components/system/EmptyState";

/**
 * Route-layer RBAC enforcement (R12 step 2b). Wrap a page's component with
 * this and pass the permission key it requires (must match a key in
 * FOUNDER_PERMISSIONS / INVESTOR_PERMISSIONS, src/lib/roles.ts). Renders the
 * page's children only if the caller's role grants that permission;
 * otherwise renders an honest blocked state instead of a blank/crashed page.
 *
 * This is UI-layer messaging only — the real enforcement is the RLS
 * policies (see supabase/migrations/20260718010000_r12_rbac_enforcement.sql
 * and 20260718020000_r12_rbac_investor_team_gap.sql). This gate exists so a
 * blocked user sees why, instead of a silent empty page.
 */
export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const ctx = useAccountContext();

  if (ctx.loading) return null;

  const isInvestorSide = ctx.accountType.startsWith("investor");
  const table = isInvestorSide ? INVESTOR_PERMISSIONS : FOUNDER_PERMISSIONS;
  const allowed = ctx.isOwner || (table[ctx.role]?.[permission] ?? false);

  if (allowed) return <>{children}</>;

  const roleLabel = ROLE_LABELS[ctx.role] ?? ctx.role;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <EmptyState
        kind="error"
        title={`Your role (${roleLabel}) does not include access to this page.`}
        description="Contact your workspace admin."
      />
    </div>
  );
}
