import {
  cleanLine,
  cleanMultiline,
  formatDateUtc,
  INVITE_TOKEN_SHAPE,
  renderEmail,
  safeDisplayName,
  safeId,
  type Block,
  type EmailModel,
  type RenderedEmail,
} from "./kit";

// App emails sent through Resend. Each function takes RAW values (names, company names, a personal message) and our
// own base URL plus an identifier or token we generated; escaping, cleaning, defanging and link building all happen
// here through the kit, never at the call site. Each returns { subject, html, text }; callers send all three.
// Recipient rules live in handlers.ts (CLAUDE.md §20.23) and are not touched by anything in this file.
//
// Content rule: say only what the product does today. No statistics, prices, discounts or promises.

type Role = "founder" | "investor";

const name = (v: unknown, fallback: string) => cleanLine(v, 80) || fallback;
const org = (v: unknown, fallback: string) => cleanLine(v, 120) || fallback;
const IGNORE_LINE =
  "If you did not expect this, you can ignore this email; nothing changes until the link is used.";

function build(appUrl: string, m: EmailModel): RenderedEmail {
  return renderEmail(m, { mode: "app", appUrl });
}

function expiryBlock(expiresAt: unknown): Block[] {
  const d = formatDateUtc(expiresAt);
  return d
    ? [{ t: "fine", text: `This invitation expires on ${d} (UTC).` }]
    : [];
}

// 1. WELCOME — policy A: sent to the signed-in user's own address only.
export function welcomeEmail({
  name: rawName,
  role,
  appUrl,
}: {
  name: string;
  role: Role;
  appUrl: string;
}): RenderedEmail {
  const who = cleanLine(rawName, 80);
  const steps =
    role === "founder"
      ? [
          "Build your company profile.",
          "Add your documents to your library.",
          "Open a deal room when you are ready to share with an investor.",
        ]
      : [
          "Set your investment thesis.",
          "Add companies to your watchlist.",
          "Open the deal rooms you are invited to.",
        ];
  return build(appUrl, {
    subject: "Welcome to Lengdon",
    preheader: "Your Lengdon account is ready.",
    heading: who ? `Welcome to Lengdon, ${who}` : "Welcome to Lengdon",
    blocks: [
      {
        t: "p",
        text: "Your Lengdon account is ready. Lengdon is in beta, so some features are still being built.",
      },
      { t: "p", text: "Where to start:" },
      { t: "list", items: steps },
      {
        t: "button",
        label: "Open Lengdon",
        url: role === "founder" ? `${appUrl}/app` : `${appUrl}/app/investor/`,
      },
    ],
    reason:
      "You received this email because you created a Lengdon account with this address.",
  });
}

// 2. DEAL ROOM INVITE — policy E: goes to the address on the invite record the sender created.
export function dealRoomInviteEmail({
  founderName,
  companyName,
  token,
  message,
  expiresAt,
  appUrl,
}: {
  founderName: string;
  companyName: string;
  /** The invite token we generated. The link path is kept as the app has always sent it (see the E1 report). */
  token: string;
  message?: string;
  expiresAt?: string;
  appUrl: string;
}): RenderedEmail {
  const sender = name(founderName, "A founder");
  const company = org(companyName, "a company");
  const note = cleanMultiline(message, 1000);
  return build(appUrl, {
    subject: `${sender} invited you to review ${company} on Lengdon`,
    preheader: `${sender} invited you to a Lengdon deal room.`,
    heading: "You have been invited to a deal room",
    blocks: [
      {
        t: "p",
        text: `${sender} invited you to review ${company} on Lengdon.`,
      },
      {
        t: "p",
        text: "A deal room is a private space with controlled access. Before you see any document you sign the room's NDA. Inside you can:",
      },
      {
        t: "list",
        items: [
          "Read the documents the founder shares with you.",
          "Ask questions and read the answers in Q&A.",
        ],
      },
      ...(note
        ? ([
            { t: "message", label: `Message from ${sender}`, text: note },
          ] as Block[])
        : []),
      {
        t: "button",
        label: "Open the deal room",
        url: `${appUrl}/join/${safeId(token)}`,
      },
      ...expiryBlock(expiresAt),
      { t: "fine", text: IGNORE_LINE },
    ],
    reason: `${sender} invited this address to a deal room on Lengdon.`,
  });
}

// 3. NDA SIGNED — policy B: sent to an existing member of the same deal room.
export function ndaSignedEmail({
  investorName,
  investorEmail,
  companyName,
  roomId,
  appUrl,
}: {
  investorName: string;
  investorEmail: string;
  companyName: string;
  roomId: string;
  appUrl: string;
}): RenderedEmail {
  const who = name(investorName, "An investor");
  const company = org(companyName, "your company");
  return build(appUrl, {
    subject: `${who} signed the NDA for ${company} on Lengdon`,
    preheader: `${who} signed the NDA for the ${company} deal room.`,
    heading: `${who} signed the NDA`,
    blocks: [
      {
        t: "p",
        text: `${who} signed the NDA for the ${company} deal room. They can now see what the room shares with them.`,
      },
      {
        t: "facts",
        rows: [
          ["Signed by", who],
          ["Email", cleanLine(investorEmail, 200)],
          ["Deal room", company],
        ],
      },
      {
        t: "button",
        label: "Open the deal room",
        url: `${appUrl}/app/deal-rooms/${safeId(roomId)}`,
      },
    ],
    reason: `You received this email because you are a member of the ${company} deal room on Lengdon.`,
  });
}

// 4. DOCUMENT UPLOADED — policy B.
export function documentUploadedEmail({
  uploaderName,
  companyName,
  documentName,
  roomId,
  appUrl,
}: {
  uploaderName: string;
  companyName: string;
  documentName: string;
  roomId: string;
  appUrl: string;
}): RenderedEmail {
  const who = name(uploaderName, "A member");
  const company = org(companyName, "the company");
  const doc = cleanLine(documentName, 160) || "a document";
  return build(appUrl, {
    subject: `New document in the ${company} deal room on Lengdon`,
    preheader: `${who} added a document to the ${company} deal room.`,
    heading: "A new document was added",
    blocks: [
      { t: "p", text: `${who} added a document to the ${company} deal room.` },
      {
        t: "facts",
        rows: [
          ["Document", doc],
          ["Added by", who],
          ["Deal room", company],
        ],
      },
      {
        t: "button",
        label: "Open the deal room",
        url: `${appUrl}/app/deal-rooms/${safeId(roomId)}`,
      },
    ],
    reason: `You received this email because you are a member of the ${company} deal room on Lengdon.`,
  });
}

// 5. TEAM INVITE — policy E.
const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin:
    "As an Admin you have access to all features, including deal rooms, documents, pipeline and team management.",
  manager:
    "As a Manager you can access the deal rooms, documents and pipeline you are assigned to.",
  analyst:
    "As an Analyst you can review documents and run due diligence on the deal rooms you are assigned to.",
  viewer:
    "As a Viewer you can read documents in the deal rooms you are assigned to.",
};

export function startupTeamInviteEmail({
  inviterName,
  companyName,
  role,
  token,
  expiresAt,
  appUrl,
}: {
  inviterName: string;
  companyName: string;
  role: string;
  token: string;
  expiresAt?: string;
  appUrl: string;
}): RenderedEmail {
  const inviter = name(inviterName, "A colleague");
  const company = org(companyName, "a team");
  const roleKey = cleanLine(role, 40)
    .replace(/[^A-Za-z _-]/g, "")
    .toLowerCase();
  const roleLabel = roleKey
    ? roleKey.charAt(0).toUpperCase() + roleKey.slice(1)
    : "Member";
  const roleText =
    ROLE_DESCRIPTIONS[roleKey] ??
    `You will have access to the ${company} workspace on Lengdon.`;
  return build(appUrl, {
    subject: `${inviter} invited you to join ${company} on Lengdon`,
    preheader: `${inviter} invited you to join ${company}.`,
    heading: `You have been invited to join ${company}`,
    blocks: [
      {
        t: "p",
        text: `${inviter} invited you to join ${company} on Lengdon as ${roleLabel}.`,
      },
      { t: "note", label: "Your access", text: roleText },
      {
        t: "button",
        label: "Accept the invitation",
        url: `${appUrl}/join?token=${safeId(token)}`,
      },
      ...expiryBlock(expiresAt),
      { t: "fine", text: IGNORE_LINE },
    ],
    reason: `${inviter} invited this address to join a team on Lengdon.`,
  });
}

// 6. LEGAL COUNSEL INVITE — policy E. Room-scoped: this account only ever sees one deal room's Investment Terms stage.
export function lawyerInviteEmail({
  inviterName,
  companyName,
  side,
  token,
  expiresAt,
  appUrl,
}: {
  inviterName: string;
  companyName: string;
  side: Role;
  token: string;
  expiresAt?: string;
  appUrl: string;
}): RenderedEmail {
  const inviter = name(inviterName, "A contact");
  const company = org(companyName, "a company");
  return build(appUrl, {
    subject: `${inviter} invited you as legal counsel for ${company} on Lengdon`,
    preheader: `${inviter} invited you as legal counsel on Lengdon.`,
    heading: "You have been invited as legal counsel",
    blocks: [
      {
        t: "p",
        text: `${inviter} invited you to represent the ${side === "founder" ? "founder" : "investor"} side of the ${company} deal room on Lengdon.`,
      },
      {
        t: "note",
        label: "Your access",
        text: "It covers the Investment Terms stage of this one deal room: the deal summary, the term sheet, the Investment Terms meeting and its records. You will not see earlier-stage documents, diligence or private notes.",
      },
      {
        t: "p",
        text: "You will be asked to sign the room's NDA when you join, like every other participant.",
      },
      {
        t: "button",
        label: "Accept the invitation",
        url: `${appUrl}/join-room?token=${safeId(token)}`,
      },
      ...expiryBlock(expiresAt),
      { t: "fine", text: IGNORE_LINE },
    ],
    reason: `${inviter} invited this address to a deal room on Lengdon.`,
  });
}

// 7. INVITATION (invite_v1) — policy E. One template for the four invitation kinds. The link carries the token in the
// URL FRAGMENT (https://…/join#t=<token>), which browsers never send to a server and never put in a Referer header,
// so it cannot reach request logs. The token is passed in, put into the link only, and never into any other text.
export type InvitationKind =
  "room_member" | "room_counsel" | "team" | "fund_team";

/** The same labels invite_v1.role_label gives the anonymous preview, so the email and the join page agree. */
export function invitationRoleLabel(kind: string, role: string): string {
  if (kind === "room_counsel") return "Legal counsel";
  const r = /^[a-z_]{1,20}$/.test(String(role)) ? String(role) : "";
  if (kind === "room_member") return r === "founder" ? "Founder" : "Investor";
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : "Member";
}

export function invitationEmail({
  inviterName,
  orgName,
  kind,
  role,
  token,
  expiresAt,
  appUrl,
}: {
  inviterName: string;
  orgName: string;
  kind: InvitationKind | string;
  role: string;
  token: string;
  expiresAt?: string;
  appUrl: string;
}): RenderedEmail {
  // User-controlled text (the inviter's name, the organisation's name) is cleaned by safeDisplayName; a value that is
  // empty or looks like a link or an address is replaced whole by a neutral fallback, never partly kept.
  const inviter = safeDisplayName(inviterName) ?? "A colleague";
  const orgClean = safeDisplayName(orgName);
  const company = orgClean ?? "a Lengdon workspace";
  const roleLabel = invitationRoleLabel(kind, role);
  const side = role === "founder" ? "founder" : "investor";
  // The token is built into the link only after it matches the issued shape; anything else throws, the sender catches
  // it and the send counts as failed (the invitation stays, the user is told to resend).
  if (!INVITE_TOKEN_SHAPE.test(String(token)))
    throw new Error("invitation token is not in the issued format");
  const link = `${appUrl}/join#t=${token}`;
  const roomName = orgClean
    ? `the ${company} deal room`
    : "a Lengdon deal room";
  const what =
    kind === "room_counsel"
      ? `act as legal counsel for the ${side} side of ${roomName}`
      : kind === "room_member"
        ? `join ${roomName} as ${roleLabel}`
        : `join ${company} as ${roleLabel}`;
  const expiry = formatDateUtc(expiresAt);
  return build(appUrl, {
    subject: orgClean
      ? `${inviter} invited you to ${company} on Lengdon`
      : `${inviter} invited you to Lengdon`,
    preheader: `${inviter} invited you to ${company}.`,
    heading: `You have been invited to ${company}`,
    blocks: [
      { t: "p", text: `${inviter} invited you to ${what} on Lengdon.` },
      {
        t: "facts",
        rows: [
          ["Invited by", inviter],
          ["Organisation", company],
          ["Role", roleLabel],
          ...(expiry
            ? ([["Expires", `${expiry} (UTC)`]] as [string, string][])
            : []),
        ],
      },
      {
        t: "button",
        label: "Accept the invitation",
        url: link,
      },
      {
        t: "note",
        label: "This link is for you only",
        text: "It works only for the email address this message was sent to, and only after that address is confirmed on Lengdon. Anyone else who opens it cannot use it.",
      },
      ...expiryBlock(expiresAt),
      { t: "fine", text: IGNORE_LINE },
    ],
    reason: `${inviter} invited this address to ${company} on Lengdon.`,
  });
}
