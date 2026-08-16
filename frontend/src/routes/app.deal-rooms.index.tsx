import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { syncContactToHubSpot } from "@/lib/hubspot";
import { Briefcase, ArrowUpRight, Plus, X, Loader2, Search, MoreHorizontal, Trash2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { PageGuide } from "@/components/app/PageGuide";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { callAction } from "@/lib/actions/call";
import { roomListByStartup } from "@/lib/actions/deal-room-core";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import {
  V2Button, V2PageHeader, V2EmptyState, V2SkeletonRows,
  LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel, ReferenceLine,
} from "@/components/v2";
import { useAccountContext } from "@/hooks/useAccountContext";
import { FOUNDER_PERMISSIONS } from "@/lib/roles";

export const Route = createFileRoute("/app/deal-rooms/")({
  component: DealRooms,
});

// ── Helpers ────────────────────────────────────────────────────────
// Status vocabulary per DESIGN.md §7.2 — the closed four-tone word set.
// "new"/"pending" both read as "awaiting" (nothing is yet accepted or
// declined); "active" is the deal's own in-progress state (kept as a
// neutral label — it isn't one of the four literal words, but there is no
// closer fit in the closed set: it is not yet satisfied/adverse, and
// "Draft" would misdescribe a room with a real counterparty in it).

function statusTone(s: string | null): "satisfied" | "attention" | "adverse" | "neutral" {
  if (s === "closed") return "satisfied";
  if (s === "rejected") return "adverse";
  if (s === "new" || s === "pending" || !s) return "attention";
  return "neutral"; // active
}

function statusLabel(s: string | null) {
  if (!s) return "Awaiting";
  if (s === "new" || s === "pending") return "Awaiting";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Component ──────────────────────────────────────────────────────

// R9: `view="team-assignments"` renders a read-only roster of which team
// members are assigned to which room — reusing the same teamAssignments
// query already computed for the per-room panel below. No new data, no
// deal content (room name + assignee list only, per §9.6).
export function DealRooms({ view }: { view?: "team-assignments" } = {}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "closed">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "active">("newest");
  const [deleteModal, setDeleteModal] = useState<{ id: string; step: 2 | 3 } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [teamPanelId, setTeamPanelId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as { create?: string };
  const { markStep: markOnboardingStep } = useOnboardingProgress();
  const accountCtx = useAccountContext();
  const canCreateRoom = accountCtx.isOwner || (FOUNDER_PERMISSIONS[accountCtx.role]?.create_deal_room ?? false);

  useEffect(() => {
    if (search.create === "1") setOpen(true);
  }, [search.create]);

  const { data: startup } = useQuery({
    queryKey: ["dr-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, profile_slug, profile_published")
        .eq("founder_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data as { id: string; company_name: string; profile_slug: string | null; profile_published: boolean | null } | null;
    },
  });

  // A genuine zero-room founder reaches this as a normal (non-error) empty
  // array via {ok:true, rooms:[]} — that path never touches the catch below.
  // A real gateway failure MUST surface as an error, never degrade to [] —
  // a caught failure that renders a plausible "0 rooms" state is worse than
  // an uncaught one (CLAUDE.md §7.4). This exact []-on-any-failure pattern
  // hid the §20.11 server-fn split outage behind "No deal rooms yet." for
  // real founders with real rooms. staleTime added (was unset) to avoid
  // re-appending a record entry on every remount of this route.
  const { data: rooms = [], isLoading: roomsLoading, isError: roomsError } = useQuery({
    queryKey: ["deal-rooms", user?.id, startup?.id],
    enabled: !!user?.id && !!startup?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await callAction<{ rooms: any[] }>(roomListByStartup, startup!.id, { startupId: startup!.id });
      return res.rooms ?? [];
    },
  });

  const roomIds = (rooms as any[]).map((r: any) => r.id);
  const { data: docViews = [] } = useQuery({
    queryKey: ["doc-view-counts", user?.id, roomIds.join(",")],
    enabled: !!user?.id && roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_views")
        .select("deal_room_id, viewer_name, created_at")
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: teamAssignments = [] } = useQuery({
    queryKey: ["dr-team-assignments-list", user?.id, roomIds.join(",")],
    enabled: !!user?.id && roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_team_assignments")
        .select(`
          deal_room_id,
          team_account_id,
          startup_team_accounts!inner(
            role,
            users(full_name, avatar_url),
            team_member_profiles(first_name, last_name, avatar_url)
          )
        `)
        .in("deal_room_id", roomIds);
      return (data ?? []) as any[];
    },
  });

  const handleDelete = async (roomId: string) => {
    setDeletingId(roomId);
    try {
      // Child rows must actually delete before the room — a silent failure
      // here would leave orphaned data while the UI reports success.
      for (const table of ["invites", "deal_room_members", "activities", "messages", "deal_tasks", "notes", "documents"] as const) {
        const { error: childErr } = await supabase.from(table).delete().eq("deal_room_id", roomId);
        if (childErr) throw childErr;
      }
      const { error } = await supabase.from("deal_rooms").delete().eq("id", roomId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["deal-rooms", user?.id, startup?.id] });
      toast.success("Deal room deleted");
    } catch {
      toast.error("Failed to delete deal room");
    } finally {
      setDeletingId(null);
      setDeleteModal(null);
      setDeleteConfirmText("");
      setMenuOpenId(null);
    }
  };

  const isLoading = roomsLoading || (!!user?.id && startup === undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoadError(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const filteredRooms = rooms.filter((r: any) => {
    const s = r.status ?? "new";
    if (filter === "active") return s === "active";
    if (filter === "pending") return s === "new" || s === "pending" || !s;
    if (filter === "closed") return s === "closed" || s === "rejected";
    return true;
  });
  const sortedRooms = [...filteredRooms].sort((a: any, b: any) => {
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === "active") return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // roomsError: the gateway call itself failed (thrown, not caught-to-[]).
  // loadError: an 8s stall guard for the case where the query never settles.
  // Same error UI for both — the user doesn't need to know which condition
  // fired, only that this is a real failure, not "no deal rooms exist."
  if (loadError || roomsError) {
    return (
      <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
        <p className="text-v2-ink" style={{ fontSize: "13.5px", marginBottom: "8px" }}>Deal rooms could not load</p>
        <p className="text-v2-ink-secondary" style={{ fontSize: "12.5px", marginBottom: "20px" }}>
          There was a problem connecting. Refresh the page to try again.
        </p>
        <V2Button variant="secondary" onClick={() => window.location.reload()}>Refresh page</V2Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
        <V2SkeletonRows rows={4} columns={4} />
      </div>
    );
  }

  if (view === "team-assignments") {
    return (
      <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
        <V2PageHeader
          title="Team assignments"
          description="Who on your team is assigned to each deal room."
        />
        {sortedRooms.length === 0 ? (
          <V2EmptyState text="No deal rooms yet." />
        ) : (
          <LedgerTable>
            <LedgerHead>
              <tr>
                <Th>Investor</Th>
                <Th>Team members assigned</Th>
                <Th numeric>Open</Th>
              </tr>
            </LedgerHead>
            <LedgerBody>
              {sortedRooms.map((r: any) => {
                const investorName = r.investor_name ?? "Pending invite";
                const roomTeam = (teamAssignments as any[]).filter((a: any) => a.deal_room_id === r.id);
                return (
                  <Tr key={r.id}>
                    <Td>{investorName}</Td>
                    <Td>
                      {roomTeam.length === 0
                        ? <span className="text-v2-ink-muted">None assigned</span>
                        : roomTeam.map((a: any) => {
                            const prof = a.startup_team_accounts?.team_member_profiles;
                            const usr = a.startup_team_accounts?.users;
                            const name = prof?.first_name
                              ? `${prof.first_name} ${prof.last_name ?? ""}`.trim()
                              : (usr?.full_name ?? "Unknown");
                            const role = a.startup_team_accounts?.role ?? "member";
                            return `${name} (${role})`;
                          }).join(", ")}
                    </Td>
                    <Td numeric>
                      <Link
                        to={"/app/deal-rooms/$id" as any}
                        params={{ id: r.id } as any}
                        className="inline-flex items-center gap-1 text-v2-accent hover:underline"
                      >
                        Open <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </LedgerBody>
          </LedgerTable>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
      <V2PageHeader
        title="Deal rooms"
        description={`${rooms.length} room${rooms.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <PageGuide pageId="deal-rooms" />
            <V2Button
              variant="primary"
              onClick={() => canCreateRoom && setOpen(true)}
              disabled={!canCreateRoom}
              title={canCreateRoom ? undefined : "Your role does not include creating deal rooms."}
            >
              <Plus className="h-4 w-4" /> Create deal room
            </V2Button>
          </>
        }
      />

      {/* Filter + Sort bar */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 border border-v2-rule bg-v2-panel p-1" style={{ borderRadius: "var(--v2-radius)" }}>
          {(["all", "active", "pending", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="font-v2-ui font-medium capitalize transition-colors"
              style={{
                borderRadius: "var(--v2-radius)",
                fontSize: "12.5px",
                padding: "4px 12px",
                background: filter === f ? "var(--v2-accent)" : "transparent",
                color: filter === f ? "#fff" : "var(--v2-ink-muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="font-v2-ui border border-v2-rule bg-v2-panel text-v2-ink"
          style={{ borderRadius: "var(--v2-radius)", fontSize: "12.5px", padding: "6px 10px" }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="active">Last active</option>
        </select>
      </div>

      {!!startup?.id && !roomsLoading && sortedRooms.length === 0 ? (
        <>
          <V2EmptyState
            text={filter === "all" ? "No deal rooms yet." : `No ${filter} rooms.`}
            action={
              filter === "all" && canCreateRoom
                ? { label: "Create deal room", onClick: () => setOpen(true) }
                : undefined
            }
          />
          {filter === "all" && startup?.profile_slug && (
            <div className="text-center -mt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://hockystick.app/p/${startup.profile_slug}`);
                  toast.success(startup.profile_published ? "Profile link copied" : "Link copied — publish your profile so investors can open it");
                }}
                className="text-v2-accent hover:underline"
                style={{ fontSize: "13px", fontWeight: 500 }}
              >
                Copy profile link
              </button>
            </div>
          )}
        </>
      ) : (
        <LedgerTable>
          <LedgerHead>
            <tr>
              <Th>Investor</Th>
              <Th>Reference</Th>
              <Th>Status</Th>
              <Th numeric>Days open</Th>
              <Th>Last activity</Th>
              <Th numeric>Doc views</Th>
              <Th>Team</Th>
              <Th />
            </tr>
          </LedgerHead>
          <LedgerBody>
            {sortedRooms.map((r: any) => {
              const investorName = r.investor_name ?? "Pending invite";
              const investorCompany = r.investor_company ?? startup?.company_name ?? "";
              const daysOpen = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
              const lastActivity = r.updated_at
                ? formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })
                : "—";
              const status = r.status ?? "new";

              const roomViews = (docViews as any[]).filter((v: any) => v.deal_room_id === r.id);
              const roomTeam = (teamAssignments as any[]).filter((a: any) => a.deal_room_id === r.id);
              const teamPanelOpen = teamPanelId === r.id;
              return (
                <>
                  <Tr key={r.id} onClick={() => { if (menuOpenId === r.id) setMenuOpenId(null); }}>
                    <Td>
                      <div className="font-medium text-v2-ink">{investorName}</div>
                      {investorCompany && <div className="text-v2-ink-muted" style={{ fontSize: "11.5px" }}>{investorCompany}</div>}
                      {r.investor_email && (
                        <div className="text-v2-ink-muted truncate" style={{ fontSize: "11px", maxWidth: 180 }}>{r.investor_email}</div>
                      )}
                    </Td>
                    <Td>
                      <ReferenceLine refNo={r.reference_no} />
                    </Td>
                    <Td><StatusLabel tone={statusTone(status)}>{statusLabel(status)}</StatusLabel></Td>
                    <Td numeric>{daysOpen}</Td>
                    <Td>{lastActivity}</Td>
                    <Td numeric>{roomViews.length}</Td>
                    <Td>
                      {roomTeam.length === 0 ? (
                        <span className="text-v2-ink-muted">—</span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setTeamPanelId(teamPanelOpen ? null : r.id); }}
                          className="inline-flex items-center gap-1 text-v2-accent hover:underline"
                        >
                          {roomTeam.length} assigned
                          {teamPanelOpen
                            ? <ChevronUp className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </Td>
                    <Td numeric>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={"/app/deal-rooms/$id" as any}
                          params={{ id: r.id } as any}
                          className="inline-flex items-center gap-1 text-v2-accent hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open <ArrowUpRight className="h-3 w-3" />
                        </Link>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === r.id ? null : r.id); }}
                            className="grid h-6 w-6 place-items-center text-v2-ink-muted hover:bg-v2-accent-wash"
                            style={{ borderRadius: "var(--v2-radius)" }}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {menuOpenId === r.id && (
                            <div
                              className="absolute right-0 top-7 z-20 bg-v2-panel border border-v2-rule py-1"
                              style={{ minWidth: 170, borderRadius: "var(--v2-radius)" }}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteModal({ id: r.id, step: 2 }); setMenuOpenId(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-v2-adverse hover:bg-v2-adverse-wash"
                                style={{ fontSize: "12.5px" }}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete deal room
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>
                  </Tr>
                  {teamPanelOpen && roomTeam.length > 0 && (
                    <Tr key={`${r.id}-team`}>
                      <Td colSpan={8}>
                        <div className="flex flex-wrap gap-2" style={{ padding: "4px 0" }}>
                          {roomTeam.map((a: any) => {
                            const prof = a.startup_team_accounts?.team_member_profiles;
                            const usr = a.startup_team_accounts?.users;
                            const name = prof?.first_name
                              ? `${prof.first_name} ${prof.last_name ?? ""}`.trim()
                              : (usr?.full_name ?? "Unknown");
                            const role = a.startup_team_accounts?.role ?? "member";
                            return (
                              <span
                                key={a.team_account_id}
                                className="border border-v2-rule text-v2-ink-secondary"
                                style={{ borderRadius: "var(--v2-radius)", fontSize: "12px", padding: "3px 8px" }}
                              >
                                {name} <span className="text-v2-ink-muted capitalize">· {role}</span>
                              </span>
                            );
                          })}
                        </div>
                      </Td>
                    </Tr>
                  )}
                </>
              );
            })}
          </LedgerBody>
        </LedgerTable>
      )}

      {open && (
        <CreateRoomForm
          userId={user?.id ?? ""}
          startupId={startup?.id ?? ""}
          onClose={() => setOpen(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["deal-rooms", user?.id, startup?.id] });
            markOnboardingStep("promote_dismissed", true);
          }}
        />
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 font-v2-ui" style={{ background: "rgba(22,24,28,0.4)" }}>
          <div
            className="w-full max-w-md bg-v2-panel border border-v2-rule p-6 space-y-4"
            style={{ borderRadius: "var(--v2-radius)" }}
          >
            {deleteModal.step === 2 ? (
              <>
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 shrink-0" style={{ color: "var(--v2-adverse)" }} />
                  <div>
                    <div className="text-v2-ink" style={{ fontSize: "13.5px", fontWeight: 600 }}>Delete deal room?</div>
                    <div className="text-v2-ink-secondary" style={{ fontSize: "12.5px", marginTop: "4px" }}>
                      This permanently deletes the deal room and all its data — documents, messages, tasks, and notes. This cannot be undone.
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <V2Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(null)}>
                    Cancel
                  </V2Button>
                  <V2Button
                    variant="adverse"
                    className="flex-1"
                    onClick={() => setDeleteModal({ id: deleteModal.id, step: 3 })}
                  >
                    Continue
                  </V2Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--v2-adverse)" }}>Final confirmation</div>
                  <div className="text-v2-ink-secondary" style={{ fontSize: "12.5px", marginTop: "4px" }}>
                    Type <span className="font-v2-data text-v2-ink" style={{ fontWeight: 600 }}>DELETE</span> to permanently delete this deal room.
                  </div>
                </div>
                <input
                  autoFocus
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full font-v2-data border bg-v2-panel text-v2-ink px-3"
                  style={{ borderRadius: "var(--v2-radius)", height: "36px", fontSize: "13px", borderColor: "var(--v2-adverse)" }}
                />
                <div className="flex gap-2">
                  <V2Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => { setDeleteModal(null); setDeleteConfirmText(""); }}
                  >
                    Cancel
                  </V2Button>
                  <V2Button
                    variant="adverse"
                    className="flex-1"
                    onClick={() => handleDelete(deleteModal.id)}
                    disabled={deleteConfirmText !== "DELETE" || deletingId === deleteModal.id}
                  >
                    {deletingId === deleteModal.id
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                      : "Delete permanently"}
                  </V2Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Room Form ───────────────────────────────────────────────

const DEAL_TYPES = ["Equity", "SAFE", "Convertible Note", "Other"] as const;

function CreateRoomForm({
  userId,
  startupId: initialStartupId,
  onClose,
  onCreated,
}: {
  userId: string;
  startupId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [investorFirm, setInvestorFirm] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [dealType, setDealType] = useState<(typeof DEAL_TYPES)[number]>("Equity");
  const [fundingTarget, setFundingTarget] = useState("");
  const [startupId, setStartupId] = useState(initialStartupId);
  const [createdRoom, setCreatedRoom] = useState<{ id: string; email: string } | null>(null);

  // Autocomplete state
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: vcLeads = [] } = useQuery({
    queryKey: ["leads-search", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("vc_leads")
        .select("id, investor_name, firm_name, email")
        .eq("founder_id", userId)
        .order("investor_name");
      return (data ?? []) as { id: string; investor_name: string; firm_name: string | null; email: string | null }[];
    },
  });

  const filtered = vcLeads.filter((l) =>
    l.investor_name?.toLowerCase().includes(search.toLowerCase()) ||
    (l.firm_name?.toLowerCase() ?? "").includes(search.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: startups = [], isLoading: startupsLoading } = useQuery({
    queryKey: ["my-startups", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", userId);
      return (data ?? []) as { id: string; company_name: string }[];
    },
  });

  useEffect(() => {
    if (startups.length === 1 && !startupId) setStartupId(startups[0].id);
  }, [startups, startupId]);

  const selectedStartup = startups.find((s) => s.id === startupId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorName.trim() || !startupId || !userId) return;
    setSaving(true);
    setError("");
    try {
      // 1. Create deal room with investor details
      const { data: newRoom, error: roomErr } = await supabase
        .from("deal_rooms")
        .insert({
          startup_id: startupId,
          status: inviteEmail.trim() ? "pending" : "new",
          investor_name: investorName.trim(),
          investor_email: inviteEmail.trim() || null,
          investor_company: investorFirm.trim() || null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (roomErr) throw roomErr;
      if (!newRoom?.id) throw new Error("No room ID returned");

      // 2. Add founder as member — load-bearing: without membership the
      // founder can't access their own room
      const { error: memberErr } = await supabase.from("deal_room_members").insert({
        deal_room_id: newRoom.id,
        user_id: userId,
        role: "founder",
      });
      if (memberErr) throw memberErr;

      // 3. Log activity (background — log failures only)
      const { error: actErr } = await supabase.from("activities").insert({
        deal_room_id: newRoom.id,
        actor_id: userId,
        action: `Deal room created for ${investorName.trim()}${investorFirm.trim() ? ` · ${investorFirm.trim()}` : ""} · ${dealType}${fundingTarget ? ` · $${fundingTarget}` : ""}`,
      });
      if (actErr) console.error("[deal-rooms] activity log failed:", actErr);

      onCreated();
      setCreatedRoom({ id: newRoom.id, email: inviteEmail.trim() });

      // Sync founder to HubSpot with deal room activity — fire and forget,
      // deliberately: room creation must never be blocked or alarmed by a
      // CRM sync failure that has nothing to do with the deal itself
      // (§20.4). But a discarded error means nobody — not the user, not an
      // engineer debugging a missing HubSpot contact later — can ever find
      // out it failed. Logged server-visible instead of silently dropped;
      // still no user-facing state, since a founder creating a room has no
      // actionable response to "your CRM sync failed."
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user?.email) {
        syncContactToHubSpot({
          data: {
            email: s.user.email,
            properties: {
              lifecyclestage: "marketingqualifiedlead",
              deal_room_created: "true",
            },
          },
        }).catch((err) => console.error("[hubspot] contact sync failed:", err));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal room.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 font-v2-ui"
      style={{ background: "rgba(22,24,28,0.4)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-v2-panel border border-v2-rule p-6"
        style={{ borderRadius: "var(--v2-radius)" }}
      >
        {createdRoom ? (
          /* ── Success state ── */
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-v2-ink" style={{ fontSize: "15px", fontWeight: 600 }}>Deal room created</h3>
              <button type="button" onClick={onClose} className="text-v2-ink-muted hover:text-v2-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="flex items-center gap-3 border p-4"
              style={{ borderRadius: "var(--v2-radius)", borderColor: "var(--v2-satisfied)", background: "var(--v2-satisfied-wash)" }}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "var(--v2-satisfied)" }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--v2-satisfied)" }}>Deal room created</div>
                <div className="text-v2-ink-secondary" style={{ fontSize: "12px", marginTop: "2px" }}>
                  Add this investor as a member from inside the deal room.
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-v2-rule-light">
              <V2Button variant="secondary" onClick={onClose} className="flex-1">
                Close
              </V2Button>
              <V2Button
                variant="primary"
                className="flex-1"
                onClick={() => navigate({ to: "/app/deal-rooms/$id" as any, params: { id: createdRoom.id } as any })}
              >
                Go to deal room <ArrowUpRight className="h-3.5 w-3.5" />
              </V2Button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-v2-ink inline-flex items-center gap-2" style={{ fontSize: "15px", fontWeight: 600 }}>
                <Briefcase className="h-4 w-4 text-v2-accent" /> Create deal room
              </h3>
              <button type="button" onClick={onClose} className="text-v2-ink-muted hover:text-v2-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Investor name search */}
            <div ref={dropdownRef}>
              <label className="text-v2-ink-muted uppercase font-medium" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>
                Investor name — required
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-v2-ink-muted pointer-events-none" />
                <input
                  required
                  value={investorName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInvestorName(val);
                    setSearch(val);
                    setSelectedLead(null);
                    setShowDropdown(val.length > 0);
                  }}
                  onFocus={() => { if (investorName.length > 0 && !selectedLead) setShowDropdown(true); }}
                  placeholder="Search VC leads or type a name…"
                  className="w-full border border-v2-rule bg-v2-panel text-v2-ink pl-9 pr-8"
                  style={{ borderRadius: "var(--v2-radius)", height: "36px", fontSize: "13.5px" }}
                />
                {selectedLead && (
                  <button
                    type="button"
                    onClick={() => { setSelectedLead(null); setSearch(""); setInvestorName(""); setInviteEmail(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-v2-ink-muted hover:text-v2-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {showDropdown && (
                  <div
                    className="absolute z-20 w-full mt-1 bg-v2-panel border border-v2-rule overflow-hidden"
                    style={{ borderRadius: "var(--v2-radius)" }}
                  >
                    {filtered.length > 0 ? (
                      filtered.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedLead(l);
                            setInvestorName(l.investor_name);
                            setSearch(l.investor_name);
                            setInvestorFirm(l.firm_name ?? "");
                            setInviteEmail(l.email ?? "");
                            setShowDropdown(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-v2-accent-wash"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-v2-ink truncate" style={{ fontSize: "13px" }}>{l.investor_name}</div>
                            {l.firm_name && <div className="text-v2-ink-muted truncate" style={{ fontSize: "11.5px" }}>{l.firm_name}</div>}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2.5 text-v2-ink-muted" style={{ fontSize: "12px" }}>
                        No matching leads — fill in email below to invite.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-v2-ink-muted uppercase font-medium" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>
                  Fund / company
                </label>
                <input
                  value={investorFirm}
                  onChange={(e) => setInvestorFirm(e.target.value)}
                  placeholder="Sequoia Capital"
                  className="mt-1 w-full border border-v2-rule bg-v2-panel text-v2-ink px-3"
                  style={{ borderRadius: "var(--v2-radius)", height: "36px", fontSize: "13.5px" }}
                />
              </div>
              <div>
                <label className="text-v2-ink-muted uppercase font-medium" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>
                  Deal type
                </label>
                <select
                  value={dealType}
                  onChange={(e) => setDealType(e.target.value as any)}
                  className="mt-1 w-full border border-v2-rule bg-v2-panel text-v2-ink px-3"
                  style={{ borderRadius: "var(--v2-radius)", height: "36px", fontSize: "13.5px" }}
                >
                  {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-v2-ink-muted uppercase font-medium" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>
                Investor email — required
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="investor@sequoia.com"
                className="mt-1 w-full border border-v2-rule bg-v2-panel text-v2-ink px-3"
                style={{ borderRadius: "var(--v2-radius)", height: "36px", fontSize: "13.5px" }}
              />
            </div>

            {startups.length > 1 && (
              <div>
                <label className="text-v2-ink-muted uppercase font-medium" style={{ fontSize: "11px", letterSpacing: "0.09em" }}>
                  Select startup — required
                </label>
                {startupsLoading ? (
                  <div className="mt-1.5 flex items-center gap-2 text-v2-ink-muted" style={{ fontSize: "13px" }}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </div>
                ) : (
                  <select
                    required
                    value={startupId}
                    onChange={(e) => setStartupId(e.target.value)}
                    className="mt-1 w-full border border-v2-rule bg-v2-panel text-v2-ink px-3"
                    style={{ borderRadius: "var(--v2-radius)", height: "36px", fontSize: "13.5px" }}
                  >
                    <option value="">Select a startup…</option>
                    {startups.map((s) => (
                      <option key={s.id} value={s.id}>{s.company_name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {startups.length === 0 && !startupsLoading && (
              <div className="border border-v2-rule-light bg-v2-surface p-3 text-v2-ink-secondary" style={{ borderRadius: "var(--v2-radius)", fontSize: "13px" }}>
                Set up your company profile first.{" "}
                <Link to="/app/profile" className="text-v2-accent hover:underline" onClick={onClose}>
                  Go to profile
                </Link>
              </div>
            )}

            {error && <p className="text-v2-adverse" style={{ fontSize: "12.5px" }}>{error}</p>}

            <div className="flex justify-end gap-2 pt-2 border-t border-v2-rule-light">
              <V2Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </V2Button>
              <V2Button
                type="submit"
                variant="primary"
                disabled={saving || !investorName.trim() || !inviteEmail.trim() || !startupId || startups.length === 0}
              >
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</> : "Create and send invite"}
              </V2Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
