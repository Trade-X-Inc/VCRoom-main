import { useQuery } from "@tanstack/react-query";
import { Lock, CheckCircle2, Building2, UserCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDealRoom } from "@/hooks/useDealRoom";
import { V2EmptyState } from "@/components/v2";

/**
 * Two-column mutual disclosure block for the deal room Information tab.
 * "What you see about them" | "What they see about you" — identical layout
 * both sides. Locked until the room advances past nda_signed (workflow_stage
 * in initial_review/qa/diligence/due_diligence/term_sheet/closing/closed —
 * see sync_deal_room_profile_disclosure() in Supabase, the same set that
 * gates deal_room_profile_disclosures, which RLS enforces on
 * investor_profiles/team_member_details/investor_team_member_details reads).
 * This component reads the same gate client-side purely to decide what UI to
 * show; the actual security boundary is the RLS policy — a locked room
 * simply returns no row for the counterparty's investor_profiles query, so
 * there is nothing to leak even if this client-side check were bypassed.
 *
 * due_diligence and closing were added 9 Aug 2026 (previously missing here
 * and in the DB trigger both — advancing a room from qa into due_diligence,
 * the very next step in useStageTransition.ts's STAGE_ORDER, silently
 * revoked the investor's disclosure row and the founder's counterpart).
 * Keep this list identical to sync_deal_room_profile_disclosure()'s; a
 * future divergence here doesn't reopen the security gap (RLS still governs)
 * but does silently disable these queries for a stage the server has
 * actually unlocked, which reads as a bug.
 */
export function MutualDisclosure() {
  const { dealRoomId, room, isInvestor, isFounder, investorUserId, founderUserId, startupId } = useDealRoom();

  const workflowStage = (room as any)?.workflow_stage as string | undefined;
  const unlocked = !!workflowStage && ["initial_review", "qa", "diligence", "due_diligence", "term_sheet", "closing", "closed"].includes(workflowStage);

  // Founder's own public profile fields (small, safe subset) for the locked state.
  const { data: founderPublic } = useQuery({
    queryKey: ["mutual-disclosure-founder-public", startupId],
    enabled: !!startupId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("company_name, tagline, sector, stage, one_liner, logo_url")
        .eq("id", startupId!)
        .maybeSingle();
      return data;
    },
  });

  // Investor's public profile fields (whitelist-enforced RPC, safe pre-unlock).
  const { data: investorPublic } = useQuery({
    queryKey: ["mutual-disclosure-investor-public", investorUserId],
    enabled: !!investorUserId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("investor_profiles")
        .select("profile_slug")
        .eq("user_id", investorUserId!)
        .maybeSingle();
      if (!profile?.profile_slug) return null;
      const { data } = await supabase.rpc("get_public_investor_profile", { p_slug: profile.profile_slug });
      return data;
    },
  });

  // Full investor profile — room-scoped RPC only. investor_profiles has no
  // peer-read RLS policy at all anymore (see deal_room_profile_disclosures
  // migration) — a bare select here would always return zero rows for a
  // counterparty. get_investor_profile_in_room() checks a disclosure row
  // scoped to THIS exact dealRoomId, so it can't be satisfied by some other
  // unlocked room the same two users happen to also share.
  const { data: investorPrivate } = useQuery({
    queryKey: ["mutual-disclosure-investor-private", dealRoomId, investorUserId, unlocked],
    enabled: !!investorUserId && unlocked && isFounder,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_investor_profile_in_room", {
        p_deal_room_id: dealRoomId,
        p_investor_user_id: investorUserId!,
      });
      return data;
    },
  });

  const { data: investorMedianDays } = useQuery({
    queryKey: ["investor-median-days", investorUserId, unlocked],
    enabled: !!investorUserId && unlocked && isFounder,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.rpc("investor_median_days_to_decision", { p_investor_user_id: investorUserId! });
      return data as number | null;
    },
  });

  // Founder's full stage-appropriate data pack — the founder's own
  // startup_profile_sections at deal_room visibility (same source the
  // "Digital Profiles" section below already reads — reused, not duplicated).
  const { data: founderSections } = useQuery({
    queryKey: ["mutual-disclosure-founder-sections", startupId, unlocked],
    enabled: !!startupId && unlocked && isInvestor,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_profile_sections")
        .select("section_label, visibility")
        .eq("startup_id", startupId!)
        .in("visibility", ["deal_room", "public"])
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  const { data: founderFull } = useQuery({
    queryKey: ["mutual-disclosure-founder-full", startupId, unlocked],
    enabled: !!startupId && unlocked && isInvestor,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("company_name, tagline, sector, stage, team_size, funding_target, revenue, traction, one_liner")
        .eq("id", startupId!)
        .maybeSingle();
      return data;
    },
  });

  // Full key-person team detail — bio/highlights/social links (founder) or
  // bio/contact_email (investor). RLS on team_member_details /
  // investor_team_member_details is the actual gate (see the R13B
  // migration's "*_unlocked_room_member"/"*_unlocked_founder" policies,
  // checking deal_room_profile_disclosures exactly like
  // get_investor_profile_in_room does) — `unlocked` here only decides what
  // UI copy to show, same convention as investorPrivate/founderFull above.
  const { data: founderKeyPeople } = useQuery({
    queryKey: ["mutual-disclosure-founder-team", startupId, unlocked],
    enabled: !!startupId && unlocked && isInvestor,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("team_members")
        .select("id, name, title, photo_url")
        .eq("startup_id", startupId!)
        .eq("key_person", true);
      if (!members || members.length === 0) return [];
      const ids = members.map((m) => m.id);
      const { data: details } = await supabase
        .from("team_member_details")
        .select("team_member_id, bio, highlights, social_links")
        .in("team_member_id", ids);
      const detailById = new Map((details ?? []).map((d) => [d.team_member_id, d]));
      return members.map((m) => ({ ...m, detail: detailById.get(m.id) ?? null }));
    },
  });

  const { data: investorKeyPeople } = useQuery({
    queryKey: ["mutual-disclosure-investor-team", dealRoomId, investorUserId, unlocked],
    enabled: !!investorUserId && unlocked && isFounder,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("investor_profiles")
        .select("id")
        .eq("user_id", investorUserId!)
        .maybeSingle();
      if (!profile?.id) return [];
      const { data: members } = await supabase
        .from("investor_team_members")
        .select("id, name, designation, avatar_url")
        .eq("investor_profile_id", profile.id)
        .eq("key_person", true);
      if (!members || members.length === 0) return [];
      const ids = members.map((m) => m.id);
      const { data: details } = await supabase
        .from("investor_team_member_details")
        .select("team_member_id, bio, contact_email")
        .in("team_member_id", ids);
      const detailById = new Map((details ?? []).map((d) => [d.team_member_id, d]));
      return members.map((m) => ({ ...m, detail: detailById.get(m.id) ?? null }));
    },
  });

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-v2-rule px-5 py-4">
        <div>
          <div className="text-v2-ink font-semibold" style={{ fontSize: "14px" }}>Mutual disclosure</div>
          <div className="text-v2-ink-muted mt-0.5" style={{ fontSize: "12px" }}>
            {unlocked ? "Full profiles unlocked for both sides" : "Public profiles only — unlocks once this room reaches Q&A"}
          </div>
        </div>
        {!unlocked && (
          <span className="inline-flex items-center gap-1 text-v2-ink-muted" style={{ fontSize: "11px" }}>
            <Lock className="h-3 w-3" /> Locked
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {/* What you see about them */}
        <div className="p-5 sm:border-r border-v2-rule">
          <SideLabel icon={isFounder ? Building2 : UserCircle2} label={isFounder ? "What you see about them (investor)" : "What you see about them (founder)"} />
          {isFounder ? (
            unlocked ? (
              investorPrivate ? (
                <FullInvestorView profile={investorPrivate} medianDays={investorMedianDays ?? null} />
              ) : (
                <V2EmptyState text="Investor hasn't set up their profile yet." />
              )
            ) : investorPublic ? (
              <PublicInvestorView profile={investorPublic} />
            ) : (
              <V2EmptyState text="Investor hasn't published a public profile yet." />
            )
          ) : (
            unlocked ? (
              founderFull ? (
                <FullFounderView startup={founderFull} sections={founderSections ?? []} />
              ) : (
                <V2EmptyState text="Founder profile not available." />
              )
            ) : founderPublic ? (
              <PublicFounderView startup={founderPublic} />
            ) : (
              <V2EmptyState text="Founder hasn't published a public profile yet." />
            )
          )}
          {unlocked && isFounder && (
            (investorKeyPeople?.length ?? 0) > 0
              ? <TeamDetailList people={investorKeyPeople!} kind="investor" />
              : <V2EmptyState text="No key people added yet." />
          )}
          {unlocked && isInvestor && (
            (founderKeyPeople?.length ?? 0) > 0
              ? <TeamDetailList people={founderKeyPeople!} kind="founder" />
              : <V2EmptyState text="No key people added yet." />
          )}
        </div>

        {/* What they see about you */}
        <div className="p-5">
          <SideLabel icon={isFounder ? Building2 : UserCircle2} label={isFounder ? "What they see about you (founder)" : "What they see about you (investor)"} />
          {!unlocked && (
            <p className="text-v2-ink-muted leading-relaxed" style={{ fontSize: "12px", margin: 0 }}>
              {isFounder
                ? "The investor currently sees your public profile only — the same fields visible on your published /i/ or /p/ page."
                : "The founder currently sees your public investor profile only — the fields you've whitelisted in Settings → Public visibility."}
            </p>
          )}
          {unlocked && (
            <p className="text-v2-ink-muted leading-relaxed" style={{ fontSize: "12px", margin: 0 }}>
              {isFounder
                ? "The investor can now see your full stage-appropriate data pack — the Digital Profiles sections below, at their current visibility settings."
                : "The founder can now see your full private profile — cheque range, track record, and team, exactly as shown on the left when roles are reversed."}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function TeamDetailList({ people, kind }: { people: any[]; kind: "founder" | "investor" }) {
  return (
    <div className="mt-3 pt-3 border-t border-v2-rule-light">
      <div className="text-v2-ink-muted uppercase mb-2" style={{ fontSize: "11px", letterSpacing: "0.07em" }}>Team</div>
      <div className="flex flex-col gap-3">
        {people.map((p) => (
          <div key={p.id} className="flex gap-2.5">
            {(kind === "founder" ? p.photo_url : p.avatar_url) ? (
              <img src={kind === "founder" ? p.photo_url : p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-v2-accent text-white flex items-center justify-center font-bold shrink-0" style={{ fontSize: "12px" }}>
                {(p.name ?? "?")[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-v2-ink font-semibold" style={{ fontSize: "12px" }}>{p.name}</div>
              <div className="text-v2-ink-muted" style={{ fontSize: "11px" }}>{kind === "founder" ? p.title : p.designation}</div>
              {p.detail?.bio && <p className="text-v2-ink-muted mt-1" style={{ fontSize: "12px", margin: "4px 0 0" }}>{p.detail.bio}</p>}
              {kind === "founder" && Array.isArray(p.detail?.highlights) && p.detail.highlights.length > 0 && (
                <ul className="text-v2-ink-muted mt-1 pl-4" style={{ fontSize: "12px" }}>
                  {p.detail.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                </ul>
              )}
              {kind === "founder" && Array.isArray(p.detail?.social_links) && p.detail.social_links.length > 0 && (
                <div className="flex gap-2 mt-1">
                  {p.detail.social_links.map((s: { platform: string; url: string }, i: number) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.platform} className="text-v2-ink-muted inline-flex">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}
              {kind === "investor" && p.detail?.contact_email && (
                <div className="text-v2-ink-muted mt-1" style={{ fontSize: "12px" }}>{p.detail.contact_email}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SideLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon className="text-v2-ink-muted" style={{ width: "13px", height: "13px" }} />
      <span className="text-v2-ink-muted uppercase font-medium" style={{ fontSize: "11px", letterSpacing: "0.07em" }}>{label}</span>
    </div>
  );
}

function PublicInvestorView({ profile }: { profile: any }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-v2-ink font-semibold" style={{ fontSize: "13px" }}>{profile.your_name || profile.fund_name}</div>
      <div className="text-v2-ink-secondary" style={{ fontSize: "12px" }}>{profile.role} {profile.fund_name && `· ${profile.fund_name}`}</div>
      {profile.thesis_statement && <p className="text-v2-ink-muted" style={{ fontSize: "12px", margin: 0 }}>{profile.thesis_statement}</p>}
      {profile.sectors && <div className="text-v2-ink-muted" style={{ fontSize: "11px" }}>Sectors: {profile.sectors}</div>}
    </div>
  );
}

function FullInvestorView({ profile, medianDays }: { profile: any; medianDays: number | null }) {
  const trackRecord: { label: string; detail: string; verified: boolean }[] = Array.isArray(profile.track_record) ? profile.track_record : [];
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <div className="text-v2-ink font-semibold" style={{ fontSize: "13px" }}>{profile.your_name || profile.fund_name}</div>
        <div className="text-v2-ink-secondary" style={{ fontSize: "12px" }}>{profile.role} {profile.fund_name && `· ${profile.fund_name}`}</div>
      </div>
      {profile.thesis_statement && <p className="text-v2-ink-muted" style={{ fontSize: "12px", margin: 0 }}>{profile.thesis_statement}</p>}
      <div className="grid grid-cols-2 gap-2" style={{ fontSize: "12px" }}>
        <div><span className="text-v2-ink-muted">Cheque:</span> <span className="font-v2-data">{profile.check_size_min || "—"}–{profile.check_size_max || "—"}</span></div>
        <div><span className="text-v2-ink-muted">Median decision:</span> <span className="font-v2-data">{medianDays !== null ? `${Math.round(medianDays)}d` : "—"}</span></div>
      </div>
      {profile.red_flags && <div className="text-v2-ink-muted" style={{ fontSize: "12px" }}>Exclusions: {profile.red_flags}</div>}
      {trackRecord.length > 0 && (
        <div>
          <div className="text-v2-ink-muted mb-1" style={{ fontSize: "11px" }}>Track record</div>
          <div className="flex flex-col gap-1">
            {trackRecord.map((t, i) => (
              <div key={i} className="flex items-center justify-between" style={{ fontSize: "12px" }}>
                <span className="text-v2-ink">{t.label}</span>
                {t.verified ? <CheckCircle2 className="h-3 w-3 text-v2-satisfied" /> : <span className="text-v2-ink-muted" style={{ fontSize: "10px" }}>Unverified</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PublicFounderView({ startup }: { startup: any }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-v2-ink font-semibold" style={{ fontSize: "13px" }}>{startup.company_name}</div>
      {startup.tagline && <div className="text-v2-ink-secondary" style={{ fontSize: "12px" }}>{startup.tagline}</div>}
      <div className="text-v2-ink-muted" style={{ fontSize: "11px" }}>{startup.sector} {startup.stage && `· ${startup.stage}`}</div>
      {startup.one_liner && <p className="text-v2-ink-muted" style={{ fontSize: "12px", margin: 0 }}>{startup.one_liner}</p>}
    </div>
  );
}

function FullFounderView({ startup, sections }: { startup: any; sections: { section_label: string; visibility: string }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <div className="text-v2-ink font-semibold" style={{ fontSize: "13px" }}>{startup.company_name}</div>
        {startup.tagline && <div className="text-v2-ink-secondary" style={{ fontSize: "12px" }}>{startup.tagline}</div>}
      </div>
      <div className="grid grid-cols-2 gap-2" style={{ fontSize: "12px" }}>
        <div><span className="text-v2-ink-muted">Team size:</span> <span className="font-v2-data">{startup.team_size ?? "—"}</span></div>
        <div><span className="text-v2-ink-muted">Revenue:</span> <span className="font-v2-data">{startup.revenue ?? "—"}</span></div>
      </div>
      {startup.traction && <div className="text-v2-ink-muted" style={{ fontSize: "12px" }}>Traction: {startup.traction}</div>}
      {sections.length > 0 && (
        <div>
          <div className="text-v2-ink-muted mb-1" style={{ fontSize: "11px" }}>Digital Profile sections shared</div>
          <div className="flex flex-wrap gap-1.5">
            {sections.map((s, i) => (
              <span key={i} className="bg-v2-accent-wash text-v2-accent px-2 py-0.5" style={{ fontSize: "11px", borderRadius: "var(--v2-radius)" }}>{s.section_label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-v2-rule bg-v2-panel" style={{ borderRadius: "var(--v2-radius)" }}>
      {children}
    </div>
  );
}
