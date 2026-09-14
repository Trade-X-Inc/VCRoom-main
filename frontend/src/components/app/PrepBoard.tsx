import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getPrepState, togglePrepChecklistItem, markPrepReady } from "@/lib/deal-room-prep-fn";
import { LcsCard, LcsButton, LcsStatusPill } from "@/components/lcs";

// Build Step 2 — the deal-room preparation gate. Renders in place of the
// normal stage bar / tabs for any room with prep_status='in_prep'
// (app.deal-rooms.$id.tsx's isInPrep branch). Composed entirely from
// existing LCS content primitives (LcsCard/LcsButton/LcsStatusPill) per
// the approved join-screen/prep-board component plan — no new visual
// language invented.
//
// Three sections: this side's checklist, the counterparty's checklist
// (read-only), and the invite-link generator. Graduation is driven
// server-side (graduate_deal_room_prep RPC, called automatically after
// this side's own "Ready to enter" completes) — this component never
// computes or claims graduation itself.

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export function PrepBoard({ dealRoomId }: { dealRoomId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copying, setCopying] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [readySubmitting, setReadySubmitting] = useState(false);

  const { data: state, isLoading } = useQuery({
    queryKey: ["prep-state", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getPrepState({ data: { dealRoomId, userAccessToken: accessToken } });
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["prep-state", dealRoomId, user?.id] });

  const handleToggle = async (itemId: string, checked: boolean) => {
    const accessToken = await getAccessToken();
    const res = await togglePrepChecklistItem({ data: { itemId, dealRoomId, checked, userAccessToken: accessToken } });
    if (!res.success) {
      toast.error(res.error === "not_your_item" ? "You can only update your own checklist." : "Could not update — try again.");
      return;
    }
    invalidate();
  };

  const handleMarkReady = async () => {
    setReadySubmitting(true);
    try {
      const accessToken = await getAccessToken();
      const res = await markPrepReady({ data: { dealRoomId, userAccessToken: accessToken } });
      if (!res.success) {
        toast.error("Could not mark ready — try again.");
        return;
      }
      // Attempt graduation — a no-op (ok:false, error:'waiting_on_other_side') if the
      // other side hasn't marked ready yet. Not an error state for the
      // caller; the room simply stays in_prep until both sides have.
      const { data: grad } = await supabase.rpc("graduate_deal_room_prep", { p_deal_room_id: dealRoomId });
      const gradRow = Array.isArray(grad) ? grad[0] : grad;
      if (gradRow?.ok) {
        toast.success("Both sides ready — the deal room is now live.");
        queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      } else {
        toast.success("Marked ready — waiting on the other side.");
      }
      invalidate();
    } finally {
      setReadySubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this deal room? This cannot be undone.")) return;
    const { data, error } = await supabase.rpc("cancel_deal_room_prep", { p_deal_room_id: dealRoomId });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.ok) {
      toast.error("Could not cancel — try again.");
      return;
    }
    toast.success("Deal room cancelled.");
    queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
  };

  const handleGenerateInvite = async (intendedRole: "founder" | "investor") => {
    setGeneratingInvite(true);
    try {
      const { data, error } = await supabase
        .from("deal_room_invite_links")
        .insert({ deal_room_id: dealRoomId, intended_role: intendedRole, invited_by: user!.id })
        .select("token")
        .single();
      if (error || !data?.token) {
        toast.error("Could not generate link — try again.");
        return;
      }
      const link = `${window.location.origin}/join-deal-room/${data.token}`;
      setInviteLink(link);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy — select and copy manually.");
    } finally {
      setCopying(false);
    }
  };

  if (isLoading || !state) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--lcs-ink-muted)" }} />
      </div>
    );
  }

  if ("error" in state && state.error) {
    return (
      <div className="p-6 text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
        Couldn't load the preparation board. Reload the page.
      </div>
    );
  }

  const mySide = state.mySide;
  const myItems = state.items.filter((i: any) => i.side === mySide);
  const theirItems = state.items.filter((i: any) => i.side !== mySide);
  const myReadyItem = myItems.find((i: any) => i.item_key === "ready_to_enter");
  const iAmReady = mySide === "founder" ? !!state.founderPrepCompleteAt : !!state.investorPrepCompleteAt;
  const theyAreReady = mySide === "founder" ? !!state.investorPrepCompleteAt : !!state.founderPrepCompleteAt;
  const allMyOtherItemsChecked = myItems.filter((i: any) => i.item_key !== "ready_to_enter").every((i: any) => i.checked);

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-5" style={{ fontFamily: "var(--font-lcs-ui)" }}>
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--lcs-ink)" }}>Deal room preparation</h1>
        <p className="text-sm mt-1" style={{ color: "var(--lcs-ink-muted)" }}>
          This room becomes live once both sides complete their checklist below.
        </p>
      </div>

      <LcsCard title="Your checklist">
        <div className="divide-y" style={{ borderColor: "var(--lcs-line)" }}>
          {myItems.map((item: any) => {
            const isDocsItem = item.item_key === "documents_added";
            const isReadyItem = item.item_key === "ready_to_enter";
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5" style={{ borderColor: "var(--lcs-line)" }}>
                <div className="min-w-0">
                  <div className="text-sm" style={{ color: "var(--lcs-ink)" }}>{item.label}</div>
                  {isDocsItem && (
                    <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>
                      {state.founderDocCount} document{state.founderDocCount === 1 ? "" : "s"} added — at least 3 needed.
                    </div>
                  )}
                </div>
                {isReadyItem ? (
                  iAmReady ? (
                    <LcsStatusPill status="satisfied" label="Ready" />
                  ) : (
                    <LcsButton
                      variant="primary"
                      disabled={!allMyOtherItemsChecked || readySubmitting}
                      onClick={handleMarkReady}
                    >
                      {readySubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ready to enter"}
                    </LcsButton>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggle(item.id, !item.checked)}
                    disabled={iAmReady}
                    className="grid h-6 w-6 place-items-center border shrink-0 disabled:opacity-40"
                    style={{
                      borderColor: item.checked ? "var(--lcs-satisfied)" : "var(--lcs-line)",
                      background: item.checked ? "var(--lcs-satisfied-wash)" : "var(--lcs-white)",
                      borderRadius: "var(--radius-lcs-control)",
                    }}
                    aria-label={item.checked ? "Mark not passed" : "Mark passed"}
                  >
                    {item.checked && <Check className="h-3.5 w-3.5" style={{ color: "var(--lcs-satisfied)" }} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </LcsCard>

      <LcsCard title="Counterparty checklist">
        <div className="divide-y" style={{ borderColor: "var(--lcs-line)" }}>
          {theirItems.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="text-sm" style={{ color: "var(--lcs-ink)" }}>{item.label}</div>
              {item.item_key === "ready_to_enter" ? (
                <LcsStatusPill status={theyAreReady ? "satisfied" : "pending"} label={theyAreReady ? "Ready" : "Waiting"} />
              ) : (
                <LcsStatusPill status={item.checked ? "satisfied" : "pending"} label={item.checked ? "Done" : "Pending"} dot={false} />
              )}
            </div>
          ))}
        </div>
      </LcsCard>

      <LcsCard title="Invite link">
        <div className="p-3 flex flex-col gap-3">
          <p className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
            Generate a link for the {mySide === "founder" ? "investor" : "founder"} to join this room. The link works once,
            for that role only.
          </p>
          {inviteLink ? (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 min-w-0 h-8 px-2 text-xs border"
                style={{ borderColor: "var(--lcs-line)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-data)" }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <LcsButton variant="secondary" onClick={handleCopy} disabled={copying}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </LcsButton>
            </div>
          ) : (
            <LcsButton
              variant="primary"
              className="self-start"
              disabled={generatingInvite}
              onClick={() => handleGenerateInvite(mySide === "founder" ? "investor" : "founder")}
            >
              {generatingInvite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate invite link"}
            </LcsButton>
          )}
        </div>
      </LcsCard>

      <div className="flex justify-end">
        <LcsButton variant="destructive" onClick={handleCancel}>
          <X className="h-3.5 w-3.5" /> Cancel deal room
        </LcsButton>
      </div>
    </div>
  );
}
