import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LcsPageShell, LcsNavItem, LcsPageHeader, LcsEmptyState } from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { LazyChart } from "@/components/shared/LazyChart";
import { getProfileViews, getSandboxCompany, type LcsProfileView, type LcsViewerRole } from "@/lib/lcs-sandbox";

// Profile Analytics — real screen extraction (3 Sep 2026). Source:
// app.profile.tsx's "analytics" tab (query/aggregation lines 353-393,
// render lines 1507-1636), reached via the real app.go-live.profile-
// analytics.tsx thin wrapper. Confirmed clean of scoring/discovery-layer
// residue by reading the full slice before building, per the standing
// instruction to check specifically given the pattern already found
// twice elsewhere (§19a Deal Intake, §19b review-document/generate-deal-
// brief) — this screen has none. Every number here is a plain count,
// average, or percentage-of-total computed directly from raw view
// events; the "Investor" badge on a view-history row is a role label
// carried on the real viewer, not a computed assessment.
//
// Kept as-is: 4 stat tiles (total views, unique visitors, avg duration,
// last 7 days), a 30-day area chart via the same LazyChart client-only
// boundary the real screen uses (recharts is excluded from SSR/the
// worker bundle — CLAUDE.md §7.3 — this is a real, load-bearing
// performance boundary, reused rather than bypassed), a traffic-sources
// breakdown bar list, and a view-history feed (viewer name/fund when
// known, source, duration, relative time).
//
// Excluded: nothing — this screen carries no AI/scoring content to
// exclude. The only adaptation is the "publish your profile first" gate,
// which now checks this sandbox's own `published` flag instead of a
// completeness-percentage + profile_slug pair (the underlying real gate
// is the same concept — publish before analytics exist — just without a
// slug-based public URL, which this sandbox doesn't model).

const VIEWER_ROLE_KEY = "lcs-viewer-role";

export const Route = createFileRoute("/deals-preview/analytics")({
  component: ProfileAnalytics,
});

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ProfileAnalytics() {
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);
  const [views, setViews] = useState<LcsProfileView[] | null>(null);
  const [published, setPublished] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const readRole = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(VIEWER_ROLE_KEY);
      } catch {
        /* private window / storage blocked — default to founder */
      }
      setRole(stored === "founder" || stored === "investor" || stored === "advisor" ? stored : "founder");
    };
    readRole();
    window.addEventListener(VIEWER_ROLE_CHANGE_EVENT, readRole);
    return () => window.removeEventListener(VIEWER_ROLE_CHANGE_EVENT, readRole);
  }, []);

  useEffect(() => {
    setViews(getProfileViews());
    setPublished(!!getSandboxCompany()?.published);
  }, []);

  const stats = useMemo(() => {
    const v = views ?? [];
    const totalViews = v.length;
    const uniqueViewers = new Set(v.filter((x) => x.viewerName).map((x) => x.viewerName)).size;
    const anonymousViews = v.filter((x) => !x.viewerName).length;
    const last7Days = v.filter((x) => new Date(x.createdAt).getTime() >= Date.now() - 7 * 86_400_000).length;
    const withDuration = v.filter((x) => x.durationSeconds != null);
    const avgDuration = withDuration.length > 0 ? Math.round(withDuration.reduce((s, x) => s + (x.durationSeconds ?? 0), 0) / withDuration.length) : 0;
    const sourceBreakdown: Record<string, number> = {};
    for (const x of v) sourceBreakdown[x.source] = (sourceBreakdown[x.source] ?? 0) + 1;
    return { totalViews, uniqueViewers, anonymousViews, last7Days, avgDuration, sourceBreakdown };
  }, [views]);

  const viewsSeries = useMemo(() => {
    const v = views ?? [];
    const days: { date: string; views: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = v.filter((x) => new Date(x.createdAt).toDateString() === d.toDateString()).length;
      days.push({ date: key, views: count });
    }
    return days;
  }, [views]);

  const isFounder = role === "founder";

  return (
    <LcsPageShell
      searchPlaceholder="Search transactions, LPs, requests"
      userInitials="RM"
      userLabel="R. Mehta"
      headerExtra={<RoleSwitcher />}
      sidebar={(collapsed) => (
        <nav className="flex flex-col gap-0.5 p-2">
          {!collapsed && (
            <div className="px-2 py-2 text-[15px] font-semibold" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
              Lengdon
            </div>
          )}
          <LcsNavItem to="/deals-preview" label="Home" collapsed={collapsed} icon="H" />
          <LcsNavItem to="/deals-preview" label="Transactions" collapsed={collapsed} icon="T" />
          <LcsNavItem to="/deals-preview/requests" label="Requests" collapsed={collapsed} icon="R" />
          {role === "founder" && (
            <>
              <LcsNavItem to="/deals-preview/profile" label="Profile" collapsed={collapsed} icon="C" />
              <LcsNavItem to="/deals-preview/analytics" label="Analytics" active collapsed={collapsed} icon="A" />
            </>
          )}
          <LcsNavItem to="/deals-preview" label="Investors" collapsed={collapsed} icon="I" />
          <LcsNavItem to="/deals-preview/vault" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          {role === "advisor" && (
            <LcsNavItem to="/deals-preview/team" label="Team" collapsed={collapsed} icon="P" />
          )}
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader title="Profile analytics" description="Who's viewing your company profile, and where they came from." />

      {role === undefined || views === null || published === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          Profile analytics are only available in Founder view. Switch roles above to view it.
        </p>
      ) : !published ? (
        <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--lcs-line)" }}>
          <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>Publish your profile first to start tracking views.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total views", value: String(stats.totalViews) },
              { label: "Unique visitors", value: String(stats.uniqueViewers) },
              { label: "Avg duration", value: stats.avgDuration > 0 ? `${stats.avgDuration}s` : "0s" },
              { label: "Last 7 days", value: String(stats.last7Days) },
            ].map(({ label, value }) => (
              <div key={label} className="border p-4" style={{ borderColor: "var(--lcs-line)" }}>
                <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 28, fontWeight: 600, color: "var(--lcs-ink)" }}>{value}</p>
                <p className="mt-1" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--lcs-ink-muted)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="border p-4" style={{ borderColor: "var(--lcs-line)" }}>
            <p className="mb-3" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--lcs-ink-muted)" }}>
              Profile views (30 days)
            </p>
            {stats.totalViews === 0 ? (
              <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>No data yet — publish your profile to start tracking views.</p>
            ) : (
              <div style={{ height: 220 }}>
                <LazyChart
                  height={220}
                  render={(R) => (
                    <R.ResponsiveContainer width="100%" height="100%">
                      <R.AreaChart data={viewsSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <R.CartesianGrid stroke="var(--lcs-line)" vertical={false} />
                        <R.XAxis dataKey="date" tick={{ fontSize: 11, fill: "#57544E" }} axisLine={{ stroke: "var(--lcs-line)" as unknown as string }} tickLine={false} interval={4} />
                        <R.YAxis tick={{ fontSize: 11, fill: "#57544E" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <R.Tooltip contentStyle={{ fontSize: 12, border: "1px solid #DDDBD6", borderRadius: 0, fontFamily: "IBM Plex Sans, sans-serif" }} />
                        <R.Area type="monotone" dataKey="views" stroke="#1F4E8C" fill="#1F4E8C" fillOpacity={0.08} strokeWidth={2} />
                      </R.AreaChart>
                    </R.ResponsiveContainer>
                  )}
                />
              </div>
            )}
          </div>

          {stats.totalViews === 0 ? (
            <LcsEmptyState text="No views yet." />
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="border p-4" style={{ borderColor: "var(--lcs-line)" }}>
                <p className="mb-3" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--lcs-ink-muted)" }}>
                  Traffic sources
                </p>
                <div className="flex flex-col gap-3">
                  {Object.entries(stats.sourceBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <div key={source} className="flex items-center gap-3">
                        <span className="w-20 shrink-0" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink)" }}>{source}</span>
                        <div className="flex-1 h-1.5 overflow-hidden" style={{ background: "var(--lcs-surface)" }}>
                          <div className="h-full" style={{ width: `${(count / stats.totalViews) * 100}%`, background: "var(--lcs-accent)" }} />
                        </div>
                        <span className="w-6 text-right" style={{ fontFamily: "var(--font-lcs-data)", fontSize: 13, color: "var(--lcs-ink)" }}>{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="border p-4" style={{ borderColor: "var(--lcs-line)" }}>
                <p className="mb-3" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--lcs-ink-muted)" }}>
                  View history
                </p>
                <div className="flex flex-col">
                  {(views ?? []).map((view) => {
                    const namedInvestor = view.viewerRole === "investor" && view.viewerName;
                    const viewerLabel = view.viewerName ? (view.viewerFund ? `${view.viewerName} · ${view.viewerFund}` : view.viewerName) : "Anonymous visitor";
                    const avatarLetter = view.viewerName ? view.viewerName.charAt(0).toUpperCase() : null;
                    return (
                      <div key={view.id} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "var(--lcs-progress-wash)", color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-ui)", fontSize: 11, fontWeight: 600 }}
                          >
                            {avatarLetter ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate flex items-center gap-1.5" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink)" }}>
                              {viewerLabel}
                              {namedInvestor && (
                                <span
                                  className="px-1.5 py-0.5"
                                  style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 10, fontWeight: 600, color: "var(--lcs-accent)", background: "var(--lcs-progress-wash)" }}
                                >
                                  Investor
                                </span>
                              )}
                            </p>
                            <p className="truncate" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, color: "var(--lcs-ink-muted)" }}>{view.source}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {view.durationSeconds != null && view.durationSeconds > 0 && (
                            <span style={{ fontFamily: "var(--font-lcs-data)", fontSize: 11, color: "var(--lcs-ink-muted)" }}>
                              {view.durationSeconds < 60 ? `${view.durationSeconds}s` : `${Math.floor(view.durationSeconds / 60)}m ${view.durationSeconds % 60}s`}
                            </span>
                          )}
                          <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, color: "var(--lcs-ink-muted)" }}>{formatRelativeTime(view.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </LcsPageShell>
  );
}
