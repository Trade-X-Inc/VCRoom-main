import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, ShieldCheck, Rocket } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Directory } from "./app.directory";

// R10 step 8 — Go Live › Directory Dashboard. Full rebuild: real
// instructional content (what this page is, how founders get listed, what
// early access means pre-launch) sitting above the actual shared Directory
// component — reused unmodified since it already serves both roles
// correctly at /app/directory.
export const Route = createFileRoute("/app/go-live/directory")({
  component: DirectoryDashboard,
});

function DirectoryDashboard() {
  const { user } = useAuth();

  const { data: startup } = useQuery({
    queryKey: ["directory-dashboard-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, publicly_discoverable, profile_completeness")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const isDiscoverable = startup?.publicly_discoverable ?? false;

  return (
    <div className="p-6 lg:p-8" style={{ maxWidth: 1360 }}>
      <div className="mb-6">
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>Directory Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#52525B" }}>
          How investors browsing Hockystick find you — and where you find them.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        <div className="rounded-none border border-border bg-white p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <Search className="h-4 w-4 text-brand" />
            <div className="text-sm font-semibold">What this page is</div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>
            The Directory is where investors and founders search for each other by stage, sector, and geography.
            It's separate from your Digital Profile — this is the discovery surface, not the profile itself.
          </p>
        </div>
        <div className="rounded-none border border-border bg-white p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <ShieldCheck className="h-4 w-4 text-brand" />
            <div className="text-sm font-semibold">How you get listed</div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>
            Turn on "Publicly discoverable" in Settings → Profile visibility. Off by default — until then, only
            investors you've connected with directly can see your profile.
          </p>
          <Link to={"/app/settings" as any} className="inline-block mt-3 text-xs text-brand hover:underline">
            Go to Settings →
          </Link>
        </div>
        <div className="rounded-none border border-border bg-white p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <Rocket className="h-4 w-4 text-brand" />
            <div className="text-sm font-semibold">Early access</div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>
            Hockystick is pre-launch — the Directory is still filling up. Founders and investors who list now get
            first visibility as the network grows, without competing against a crowded list.
          </p>
        </div>
      </div>

      {!isDiscoverable && (
        <div className="mb-6 rounded-none border border-border bg-[#FAFAFA] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm" style={{ color: "#52525B" }}>
            You're not publicly discoverable yet — investors can't find you in this list until you turn it on.
          </p>
          <Link
            to={"/app/settings" as any}
            className="shrink-0 inline-flex items-center rounded-none bg-brand text-white px-3 py-2 text-xs font-medium"
            style={{ background: "#7C3AED" }}
          >
            Turn on discoverability
          </Link>
        </div>
      )}

      <Directory />
    </div>
  );
}
