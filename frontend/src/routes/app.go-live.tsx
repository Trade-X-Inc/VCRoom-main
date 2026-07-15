import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Copy, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { PrepareSection } from "@/components/app/PrepareSection";
import { HsButton, StatusDot } from "@/components/system";
import { useRaiseProgress } from "@/hooks/useRaiseProgress";

// ② Go Live — publish, be found, build public trust, share.

export const Route = createFileRoute("/app/go-live")({
  component: GoLivePage,
});

function GoLivePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: p } = useRaiseProgress();
  const [publishing, setPublishing] = useState(false);

  const { data: startup } = useQuery({
    queryKey: ["go-live-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startups")
        .select(
          "id, company_name, profile_slug, profile_published, publicly_discoverable",
        )
        .eq("founder_id", user!.id)
        .maybeSingle();
      if (error) console.error("[go-live] startup fetch failed:", error);
      return data;
    },
  });

  const { data: roasts = [] } = useQuery({
    queryKey: ["go-live-roasts", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roast_sessions")
        .select("id, level, status, badge_awarded, scheduled_at")
        .eq("startup_id", startup!.id)
        .order("scheduled_at", { ascending: false })
        .limit(3);
      if (error) console.error("[go-live] roast fetch failed:", error);
      return data ?? [];
    },
  });

  const publicUrl = startup?.profile_slug
    ? `https://hockystick.app/p/${startup.profile_slug}`
    : null;

  const setPublished = async (published: boolean) => {
    if (!startup?.id || publishing) return;
    setPublishing(true);
    try {
      const { error } = await supabase
        .from("startups")
        .update({ profile_published: published, publicly_discoverable: published })
        .eq("id", startup.id);
      if (error) {
        console.error("[go-live] publish failed:", error);
        toast.error("Could not update");
        return;
      }
      toast.success(published ? "Profile live" : "Profile hidden");
      qc.invalidateQueries({ queryKey: ["go-live-startup", user?.id] });
      qc.invalidateQueries({ queryKey: ["raise-progress", user?.id] });
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied");
  };

  const completedRoast = roasts.find((r) => r.status === "completed");
  const upcomingRoast = roasts.find((r) =>
    ["scheduled", "lobby"].includes(r.status),
  );

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
        Your raise · Step 2
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Go live
      </h1>

      <PrepareSection
        id="publish"
        label="Publish"
        status={
          startup?.profile_published
            ? "complete"
            : (p?.prepareUnlocked ?? false)
              ? "in-progress"
              : "not-started"
        }
        summary={startup?.profile_published ? "Live" : "Not published"}
      >
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <StatusDot
              tone={startup?.profile_published ? "positive" : "neutral"}
              label={startup?.profile_published ? "Live" : "Draft"}
            />
            <p className="text-[13px] text-muted-foreground mt-2 max-w-md">
              {startup?.profile_published
                ? "Investors can see your profile."
                : p?.prepareUnlocked
                  ? "Your profile is ready to publish."
                  : `Reach 70% in Prepare first — you're at ${p?.profilePct ?? 0}%.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <HsButton variant="ghost">
                  Preview <ExternalLink className="h-3.5 w-3.5" />
                </HsButton>
              </a>
            )}
            <HsButton
              onClick={() => setPublished(!startup?.profile_published)}
              disabled={publishing || (!startup?.profile_published && !p?.prepareUnlocked)}
              data-testid="publish-toggle"
            >
              {startup?.profile_published ? "Unpublish" : "Publish"}
            </HsButton>
          </div>
        </div>
      </PrepareSection>

      <PrepareSection
        id="directory"
        label="Directory"
        status={startup?.publicly_discoverable ? "complete" : "not-started"}
        summary={startup?.publicly_discoverable ? "Listed" : "Not listed"}
      >
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <p className="text-[13px] text-muted-foreground max-w-md">
            {startup?.publicly_discoverable
              ? "Your company appears in the investor directory."
              : "Publish to appear in the investor directory."}
          </p>
          <Link to="/app/directory">
            <HsButton variant="ghost">Open directory</HsButton>
          </Link>
        </div>
      </PrepareSection>

      <PrepareSection
        id="roast"
        label="Roast"
        status={
          completedRoast ? "complete" : upcomingRoast ? "in-progress" : "not-started"
        }
        summary={
          completedRoast
            ? `Survived Level ${completedRoast.level}`
            : upcomingRoast
              ? "Scheduled"
              : "The strongest trust signal"
        }
      >
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <p className="text-[13px] text-muted-foreground max-w-md">
            {completedRoast
              ? "Every public question answered on the record."
              : "Pitch live — answer everything on the record."}
          </p>
          <div className="flex items-center gap-3">
            {completedRoast && (
              <a
                href={`/roast/${completedRoast.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <HsButton variant="ghost">
                  Public record <ExternalLink className="h-3.5 w-3.5" />
                </HsButton>
              </a>
            )}
            <Link to="/app/roast">
              <HsButton variant={completedRoast ? "ghost" : "primary"}>
                {completedRoast ? "Roasts" : "Schedule"}
              </HsButton>
            </Link>
          </div>
        </div>
      </PrepareSection>

      <PrepareSection
        id="promote"
        label="Share"
        status={startup?.profile_published ? "in-progress" : "not-started"}
        summary={publicUrl ?? undefined}
      >
        {publicUrl ? (
          <div className="flex items-center gap-3 flex-wrap">
            <code className="text-xs text-muted-foreground">{publicUrl}</code>
            <HsButton variant="ghost" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </HsButton>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <HsButton variant="ghost">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </HsButton>
            </a>
            <a
              href={`https://x.com/intent/post?url=${encodeURIComponent(publicUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <HsButton variant="ghost">Post on X</HsButton>
            </a>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Publish first.</p>
        )}
      </PrepareSection>
    </div>
  );
}
