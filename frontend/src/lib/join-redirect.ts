// Where an accepted invitation sends the user (job J3b). Every target is an existing app route, built from the kind and
// from ids the accept action returned, never from the address bar.
//
//   room_member, room_counsel -> /app/deal-rooms/<room id>/overview   (the room's own home tab; the room layout has no
//                                                                     index route of its own)
//   team                      -> /app/overview                        (the workspace home; /app/users needs the
//                                                                     manage_team permission, which most roles lack)
//   fund_team                 -> /app/investor/overview               (the investor home; /app/investor/team needs
//                                                                     manage_team too)
//   anything unexpected       -> /app
export type AcceptedInvite = {
  kind: string;
  role: string;
  orgName: string;
  roomId: string | null;
  startupId: string | null;
  investorId: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function joinRedirectTarget(r: Partial<AcceptedInvite>): string {
  if (r.kind === "room_member" || r.kind === "room_counsel")
    return r.roomId && UUID.test(r.roomId)
      ? `/app/deal-rooms/${r.roomId}/overview`
      : "/app";
  if (r.kind === "team") return "/app/overview";
  if (r.kind === "fund_team") return "/app/investor/overview";
  return "/app";
}
