import { useQuery } from "@tanstack/react-query";
import { Lock, CheckCircle2, Building2, UserCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { color, font, radius } from "@/lib/design-tokens";
import { useDealRoom } from "@/hooks/useDealRoom";

/**
 * Two-column mutual disclosure block for the deal room Information tab.
 * "What you see about them" | "What they see about you" — identical layout
 * both sides. Locked until the room advances past nda_signed (workflow_stage
 * in initial_review/qa/diligence/term_sheet/closed — see
 * deal_room_information_unlocked() in Supabase, the same gate that RLS
 * enforces on investor_profiles reads). This component reads the same
 * gate client-side purely to decide what UI to show; the actual security
 * boundary is the RLS policy — a locked room simply returns no row for the
 * counterparty's investor_profiles query, so there is nothing to leak even
 * if this client-side check were bypassed.
 */
export function MutualDisclosure() {
  const { dealRoomId, room, isInvestor, isFounder, investorUserId, founderUserId, startupId } = useDealRoom();

  const workflowStage = (room as any)?.workflow_stage as string | undefined;
  const unlocked = !!workflowStage && ["initial_review", "qa", "diligence", "term_sheet", "closed"].includes(workflowStage);

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
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${color.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Mutual disclosure</div>
          <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 2 }}>
            {unlocked ? "Full profiles unlocked for both sides" : "Public profiles only — unlocks once this room reaches Q&A"}
          </div>
        </div>
        {!unlocked && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: color.inkTertiary }}>
            <Lock style={{ width: 12, height: 12 }} /> Locked
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* What you see about them */}
        <div style={{ padding: 20, borderRight: `1px solid ${color.border}` }}>
          <SideLabel icon={isFounder ? Building2 : UserCircle2} label={isFounder ? "What you see about them (investor)" : "What you see about them (founder)"} />
          {isFounder ? (
            unlocked ? (
              investorPrivate ? (
                <FullInvestorView profile={investorPrivate} medianDays={investorMedianDays ?? null} />
              ) : (
                <EmptyNote text="Investor hasn't set up their profile yet." />
              )
            ) : investorPublic ? (
              <PublicInvestorView profile={investorPublic} />
            ) : (
              <EmptyNote text="Investor hasn't published a public profile yet." />
            )
          ) : (
            unlocked ? (
              founderFull ? (
                <FullFounderView startup={founderFull} sections={founderSections ?? []} />
              ) : (
                <EmptyNote text="Founder profile not available." />
              )
            ) : founderPublic ? (
              <PublicFounderView startup={founderPublic} />
            ) : (
              <EmptyNote text="Founder hasn't published a public profile yet." />
            )
          )}
          {unlocked && isFounder && (investorKeyPeople?.length ?? 0) > 0 && (
            <TeamDetailList people={investorKeyPeople!} kind="investor" />
          )}
          {unlocked && isInvestor && (founderKeyPeople?.length ?? 0) > 0 && (
            <TeamDetailList people={founderKeyPeople!} kind="founder" />
          )}
        </div>

        {/* What they see about you */}
        <div style={{ padding: 20 }}>
          <SideLabel icon={isFounder ? Building2 : UserCircle2} label={isFounder ? "What they see about you (founder)" : "What they see about you (investor)"} />
          {!unlocked && (
            <p style={{ fontSize: 12, color: color.inkTertiary, lineHeight: 1.6, margin: 0 }}>
              {isFounder
                ? "The investor currently sees your public profile only — the same fields visible on your published /i/ or /p/ page."
                : "The founder currently sees your public investor profile only — the fields you've whitelisted in Settings → Public visibility."}
            </p>
          )}
          {unlocked && (
            <p style={{ fontSize: 12, color: color.inkTertiary, lineHeight: 1.6, margin: 0 }}>
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
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, color: color.inkTertiary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Team</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {people.map((p) => (
          <div key={p.id} style={{ display: "flex", gap: 10 }}>
            {(kind === "founder" ? p.photo_url : p.avatar_url) ? (
              <img src={kind === "founder" ? p.photo_url : p.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(124,58,237,0.1)", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {(p.name ?? "?")[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: color.ink }}>{p.name}</div>
              <div style={{ fontSize: 11, color: color.inkTertiary }}>{kind === "founder" ? p.title : p.designation}</div>
              {p.detail?.bio && <p style={{ fontSize: 12, color: color.inkTertiary, margin: "4px 0 0" }}>{p.detail.bio}</p>}
              {kind === "founder" && Array.isArray(p.detail?.highlights) && p.detail.highlights.length > 0 && (
                <ul style={{ fontSize: 12, color: color.inkTertiary, margin: "4px 0 0", paddingLeft: 16 }}>
                  {p.detail.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                </ul>
              )}
              {kind === "founder" && Array.isArray(p.detail?.social_links) && p.detail.social_links.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {p.detail.social_links.map((s: { platform: string; url: string }, i: number) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.platform} style={{ color: color.inkTertiary, display: "inline-flex" }}>
                      <ExternalLink style={{ width: 12, height: 12 }} />
                    </a>
                  ))}
                </div>
              )}
              {kind === "investor" && p.detail?.contact_email && (
                <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 4 }}>{p.detail.contact_email}</div>
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
      <Icon style={{ width: 13, height: 13, color: color.inkTertiary }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p style={{ fontSize: 12, color: color.inkTertiary, margin: 0 }}>{text}</p>;
}

function PublicInvestorView({ profile }: { profile: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: color.ink }}>{profile.your_name || profile.fund_name}</div>
      <div style={{ fontSize: 12, color: color.inkSecondary }}>{profile.role} {profile.fund_name && `· ${profile.fund_name}`}</div>
      {profile.thesis_statement && <p style={{ fontSize: 12, color: color.inkTertiary, margin: 0 }}>{profile.thesis_statement}</p>}
      {profile.sectors && <div style={{ fontSize: 11, color: color.inkTertiary }}>Sectors: {profile.sectors}</div>}
    </div>
  );
}

function FullInvestorView({ profile, medianDays }: { profile: any; medianDays: number | null }) {
  const trackRecord: { label: string; detail: string; verified: boolean }[] = Array.isArray(profile.track_record) ? profile.track_record : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: color.ink }}>{profile.your_name || profile.fund_name}</div>
        <div style={{ fontSize: 12, color: color.inkSecondary }}>{profile.role} {profile.fund_name && `· ${profile.fund_name}`}</div>
      </div>
      {profile.thesis_statement && <p style={{ fontSize: 12, color: color.inkTertiary, margin: 0 }}>{profile.thesis_statement}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
        <div><span style={{ color: color.inkTertiary }}>Cheque:</span> {profile.check_size_min || "—"}–{profile.check_size_max || "—"}</div>
        <div><span style={{ color: color.inkTertiary }}>Median decision:</span> {medianDays !== null ? `${Math.round(medianDays)}d` : "—"}</div>
      </div>
      {profile.red_flags && <div style={{ fontSize: 12, color: color.inkTertiary }}>Exclusions: {profile.red_flags}</div>}
      {trackRecord.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: color.inkTertiary, marginBottom: 4 }}>Track record</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {trackRecord.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <span>{t.label}</span>
                {t.verified ? <CheckCircle2 style={{ width: 12, height: 12, color: "#10B981" }} /> : <span style={{ fontSize: 10, color: color.inkTertiary }}>Unverified</span>}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: color.ink }}>{startup.company_name}</div>
      {startup.tagline && <div style={{ fontSize: 12, color: color.inkSecondary }}>{startup.tagline}</div>}
      <div style={{ fontSize: 11, color: color.inkTertiary }}>{startup.sector} {startup.stage && `· ${startup.stage}`}</div>
      {startup.one_liner && <p style={{ fontSize: 12, color: color.inkTertiary, margin: 0 }}>{startup.one_liner}</p>}
    </div>
  );
}

function FullFounderView({ startup, sections }: { startup: any; sections: { section_label: string; visibility: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: color.ink }}>{startup.company_name}</div>
        {startup.tagline && <div style={{ fontSize: 12, color: color.inkSecondary }}>{startup.tagline}</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
        <div><span style={{ color: color.inkTertiary }}>Team size:</span> {startup.team_size ?? "—"}</div>
        <div><span style={{ color: color.inkTertiary }}>Revenue:</span> {startup.revenue ?? "—"}</div>
      </div>
      {startup.traction && <div style={{ fontSize: 12, color: color.inkTertiary }}>Traction: {startup.traction}</div>}
      {sections.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: color.inkTertiary, marginBottom: 4 }}>Digital Profile sections shared</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sections.map((s, i) => (
              <span key={i} style={{ fontSize: 11, background: "rgba(124,58,237,0.06)", color: "#7C3AED", padding: "2px 8px", borderRadius: 2 }}>{s.section_label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white }}>
      {children}
    </div>
  );
}
