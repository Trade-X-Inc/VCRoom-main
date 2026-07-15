import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Contextual sidebar STUB (R2 shell surgery). The real split of
// app.deal-room.$id.tsx into /deal-rooms/:id/{overview,documents,qa,...}
// happens in R3 — at that point each split page renders inside this shell
// instead of the mega-file's internal tab bar. Not wired into the deal
// room today; this only establishes the pattern and the "← Back to Deal
// Rooms" affordance so R3 has somewhere to land.

export interface DealRoomSection {
  key: string;
  label: string;
  to: string;
  locked?: boolean;
}

export function DealRoomShell({
  companyName,
  backTo = "/app/deal-rooms",
  sections,
  activeKey,
  children,
}: {
  companyName: string;
  backTo?: string;
  sections: DealRoomSection[];
  activeKey: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0">
      <aside className="w-[220px] shrink-0 border-r border-border/60 bg-sidebar hidden md:flex flex-col">
        <div className="p-4 border-b border-border/60">
          <Link
            to={backTo as any}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Deal Rooms
          </Link>
          <div className="mt-2 text-sm font-semibold truncate">{companyName}</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {sections.map((s) => (
            <Link
              key={s.key}
              to={s.to as any}
              aria-disabled={s.locked}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                activeKey === s.key
                  ? "bg-accent text-foreground font-medium"
                  : s.locked
                    ? "text-faint pointer-events-none"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}
