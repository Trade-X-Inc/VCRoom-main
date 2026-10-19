// Sample data for the email preview and the tests. Fictional people and companies; no real address anywhere.
import {
  dealRoomInviteEmail,
  documentUploadedEmail,
  lawyerInviteEmail,
  ndaSignedEmail,
  startupTeamInviteEmail,
  welcomeEmail,
} from "./templates";

export const SAMPLE_APP_URL = "https://lengdon.com";
export const SAMPLE_ROOM = "3f2b8c1e-4d5a-4e6f-8a9b-0c1d2e3f4a5b";
export const SAMPLE_TOKEN = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const SOON = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

export const APP_SAMPLES = [
  {
    id: "welcome-founder",
    to: "Policy A: the signed-in user's own address",
    mail: welcomeEmail({
      name: "Alex Morgan",
      role: "founder",
      appUrl: SAMPLE_APP_URL,
    }),
  },
  {
    id: "welcome-investor",
    to: "Policy A: the signed-in user's own address",
    mail: welcomeEmail({
      name: "Sam Rivera",
      role: "investor",
      appUrl: SAMPLE_APP_URL,
    }),
  },
  {
    id: "deal-room-invite",
    to: "Policy E: the address on the invite record",
    mail: dealRoomInviteEmail({
      founderName: "Alex Morgan",
      companyName: "Example Robotics",
      token: SAMPLE_TOKEN,
      message: "Hello Sam,\nHere is the room I mentioned.\nAlex",
      expiresAt: SOON,
      appUrl: SAMPLE_APP_URL,
    }),
  },
  {
    id: "nda-signed",
    to: "Policy B: founder members of the same deal room",
    mail: ndaSignedEmail({
      investorName: "Sam Rivera",
      investorEmail: "sam@example.com",
      companyName: "Example Robotics",
      roomId: SAMPLE_ROOM,
      appUrl: SAMPLE_APP_URL,
    }),
  },
  {
    id: "document-uploaded",
    to: "Policy B: investor members of the same deal room",
    mail: documentUploadedEmail({
      uploaderName: "Alex Morgan",
      companyName: "Example Robotics",
      documentName: "Cap table (Q3).xlsx",
      roomId: SAMPLE_ROOM,
      appUrl: SAMPLE_APP_URL,
    }),
  },
  {
    id: "team-invite",
    to: "Policy E: the address on the invite record",
    mail: startupTeamInviteEmail({
      inviterName: "Alex Morgan",
      companyName: "Example Robotics",
      role: "analyst",
      token: SAMPLE_TOKEN,
      expiresAt: SOON,
      appUrl: SAMPLE_APP_URL,
    }),
  },
  {
    id: "lawyer-invite",
    to: "Policy E: the address on the invite record",
    mail: lawyerInviteEmail({
      inviterName: "Alex Morgan",
      companyName: "Example Robotics",
      side: "founder",
      token: SAMPLE_TOKEN,
      expiresAt: SOON,
      appUrl: SAMPLE_APP_URL,
    }),
  },
];

const SAMPLE_VALUES: Record<string, string> = {
  "{{ .ConfirmationURL }}":
    "https://lengdon.com/auth/v1/verify?token=SAMPLE&type=signup",
  "{{ .Email }}": "alex@example.com",
  "{{ .NewEmail }}": "alex.new@example.com",
  "{{ .OldEmail }}": "alex.old@example.com",
  "{{ .Token }}": "482913",
  "{{ .Provider }}": "google",
  "{{ .FactorType }}": "totp",
  "{{ .Phone }}": "+971 50 000 0000",
  "{{ .OldPhone }}": "+971 50 111 1111",
};
export const fillSample = (html: string) =>
  Object.entries(SAMPLE_VALUES).reduce((s, [k, v]) => s.split(k).join(v), html);
