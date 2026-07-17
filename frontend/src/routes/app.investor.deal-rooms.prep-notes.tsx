import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PrepNotesBase } from "./app.deal-rooms.prep-notes";

// R9 (c) — Deal Rooms › Deal Prep Notes (investor). Same team_notes-backed
// feature as the founder side, scoped by investor_profile_id instead of
// startup_id (both columns now exist on team_notes with matching RLS).
export const Route = createFileRoute("/app/investor/deal-rooms/prep-notes")({
  component: InvestorPrepNotes,
});

function InvestorPrepNotes() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["prep-notes-investor-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("investor_profiles").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  return (
    <PrepNotesBase
      ownerKey="investor_profile_id"
      ownerId={profile?.id ?? null}
      breadcrumb={[{ label: "Investor" }, { label: "Deal Rooms" }, { label: "Deal Prep Notes" }]}
    />
  );
}
