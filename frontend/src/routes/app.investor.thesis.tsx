import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";

// ① Thesis — the investor identity. Canonical editor lives at
// /app/investor/profile; this page is a summary card pointing there.

export const Route = createFileRoute("/app/investor/thesis")({
  component: ThesisPage,
});

function ThesisPage() {
  const { data: p } = useDealFlowProgress();
  return (
    <div className="p-6 lg:p-12 max-w-4xl mx-auto">
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#71717A",
        }}
      >
        Deal flow · Step 1
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Thesis
      </h1>

      <Link
        to={"/app/investor/profile" as any}
        className="block bg-card border border-border/60 rounded-none p-6 hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Thesis</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {p?.thesisSet ? "Set" : "Not set"}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
            Edit profile <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}
