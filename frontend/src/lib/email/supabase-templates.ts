import { renderEmail, type Block, type EmailModel } from "./kit";

// The 13 Supabase Auth email templates, pasted by the owner into the Supabase dashboard (Authentication > Emails).
// Supabase templates are HTML only (no plain-text part) and may use only the documented Go-template variables below;
// scripts/build-supabase-emails.mjs writes them to supabase/email-templates/. Nothing here changes any Supabase setting.
//
// Variables per template, from https://supabase.com/docs/guides/auth/auth-email-templates (checked 20 Oct 2026):
//   confirm signup, invite, magic link, reset password: ConfirmationURL, Token, TokenHash, SiteURL, RedirectTo, Data, Email
//   change email: the same plus NewEmail          reauthentication: Token, Data, Email
//   password changed: Data, Email                  email changed: Data, Email, OldEmail
//   phone changed: Data, Email, Phone, OldPhone    identity linked / removed: Data, Email, Provider
//   MFA method added / removed: Data, Email, FactorType
// We never use {{ .Data }}: it carries user-written profile fields, and a name must not be able to shape an email.
//
// The expiry wording matches the project's Supabase setting "Email OTP expiration" = 900 seconds (owner-reported,
// CLAUDE.md §20.21 (p)): reset password and magic link say "15 minutes". If that setting changes, change them here.

export const ALLOWED_VARIABLES: Record<string, string[]> = {
  confirm_signup: [
    "ConfirmationURL",
    "Token",
    "TokenHash",
    "SiteURL",
    "RedirectTo",
    "Data",
    "Email",
  ],
  invite_user: [
    "ConfirmationURL",
    "Token",
    "TokenHash",
    "SiteURL",
    "RedirectTo",
    "Data",
    "Email",
  ],
  magic_link: [
    "ConfirmationURL",
    "Token",
    "TokenHash",
    "SiteURL",
    "RedirectTo",
    "Data",
    "Email",
  ],
  change_email: [
    "ConfirmationURL",
    "Token",
    "TokenHash",
    "SiteURL",
    "RedirectTo",
    "Data",
    "Email",
    "NewEmail",
  ],
  reset_password: [
    "ConfirmationURL",
    "Token",
    "TokenHash",
    "SiteURL",
    "RedirectTo",
    "Data",
    "Email",
  ],
  reauthentication: ["Token", "Data", "Email"],
  password_changed: ["Data", "Email"],
  email_changed: ["Data", "Email", "OldEmail"],
  phone_changed: ["Data", "Email", "Phone", "OldPhone"],
  identity_linked: ["Data", "Email", "Provider"],
  identity_removed: ["Data", "Email", "Provider"],
  mfa_added: ["Data", "Email", "FactorType"],
  mfa_removed: ["Data", "Email", "FactorType"],
};

export type SupabaseTemplate = {
  id: keyof typeof ALLOWED_VARIABLES;
  /** Name of the template in the Supabase dashboard. */
  dashboardName: string;
  file: string;
  expiryMinutes?: 15;
  model: EmailModel;
};

const IGNORE =
  "If you did not request this, you can ignore this email; nothing changes until the link is used.";
const NOT_YOU_SECURITY =
  "If you did not make this change, reset your password now and write to hello@lengdon.com.";
const SECURITY_RESET_BUTTON: Block = {
  t: "button",
  label: "Reset your password",
  url: "https://lengdon.com/forgot-password",
};
const reasonFor =
  "You received this email because it is the address of a Lengdon account.";

export const SUPABASE_TEMPLATES: SupabaseTemplate[] = [
  {
    id: "confirm_signup",
    dashboardName: "Confirm sign up",
    file: "confirm-signup.html",
    model: {
      subject: "Confirm your email address for Lengdon",
      preheader:
        "Confirm this address to finish creating your Lengdon account.",
      heading: "Confirm your email address",
      blocks: [
        {
          t: "p",
          text: "A Lengdon account was created with the address {{ .Email }}. Confirm the address to finish.",
        },
        {
          t: "button",
          label: "Confirm email address",
          url: "{{ .ConfirmationURL }}",
        },
        {
          t: "fine",
          text: "The link works once. If you did not create a Lengdon account, you can ignore this email; no account is active until the address is confirmed.",
        },
      ],
      reason:
        "You received this email because this address was used to create a Lengdon account.",
    },
  },
  {
    id: "invite_user",
    dashboardName: "Invite user",
    file: "invite-user.html",
    model: {
      subject: "You are invited to Lengdon",
      preheader: "Accept the invitation to create your Lengdon account.",
      heading: "You are invited to Lengdon",
      blocks: [
        {
          t: "p",
          text: "You have been invited to create a Lengdon account with the address {{ .Email }}.",
        },
        {
          t: "button",
          label: "Accept the invitation",
          url: "{{ .ConfirmationURL }}",
        },
        {
          t: "fine",
          text: "The link works once. If you did not expect this invitation, you can ignore this email; nothing changes until the link is used.",
        },
      ],
      reason:
        "You received this email because this address was invited to Lengdon.",
    },
  },
  {
    id: "magic_link",
    dashboardName: "Magic link",
    file: "magic-link.html",
    expiryMinutes: 15,
    model: {
      subject: "Your Lengdon sign-in link",
      preheader:
        "Use this link to sign in to Lengdon. It expires in 15 minutes.",
      heading: "Your sign-in link",
      blocks: [
        {
          t: "p",
          text: "A sign-in link was requested for the Lengdon account {{ .Email }}.",
        },
        {
          t: "button",
          label: "Sign in to Lengdon",
          url: "{{ .ConfirmationURL }}",
        },
        { t: "fine", text: "This link expires in 15 minutes and works once." },
        { t: "fine", text: IGNORE },
      ],
      reason: reasonFor,
    },
  },
  {
    id: "change_email",
    dashboardName: "Change email address",
    file: "change-email.html",
    model: {
      subject: "Confirm your new email address for Lengdon",
      preheader:
        "Confirm the change of the email address on your Lengdon account.",
      heading: "Confirm your new email address",
      blocks: [
        {
          t: "p",
          text: "A request was made to change the email address of a Lengdon account from {{ .Email }} to {{ .NewEmail }}.",
        },
        {
          t: "button",
          label: "Confirm the change",
          url: "{{ .ConfirmationURL }}",
        },
        {
          t: "fine",
          text: "The link works once. If you did not request this change, you can ignore this email; the address stays as it is until the link is used.",
        },
      ],
      reason: reasonFor,
    },
  },
  {
    id: "reset_password",
    dashboardName: "Reset password",
    file: "reset-password.html",
    expiryMinutes: 15,
    model: {
      subject: "Reset your Lengdon password",
      preheader:
        "Choose a new password for your Lengdon account. The link expires in 15 minutes.",
      heading: "Reset your password",
      blocks: [
        {
          t: "p",
          text: "A password reset was requested for the Lengdon account {{ .Email }}. After you use the link you will be asked to choose a new password.",
        },
        {
          t: "button",
          label: "Choose a new password",
          url: "{{ .ConfirmationURL }}",
        },
        { t: "fine", text: "This link expires in 15 minutes and works once." },
        { t: "fine", text: IGNORE },
      ],
      reason: reasonFor,
    },
  },
  {
    id: "reauthentication",
    dashboardName: "Reauthentication",
    file: "reauthentication.html",
    model: {
      subject: "Your Lengdon confirmation code",
      preheader:
        "Use this code to confirm a sensitive change on your Lengdon account.",
      heading: "Confirm it is you",
      blocks: [
        {
          t: "p",
          text: "A sensitive change was requested on the Lengdon account {{ .Email }}. Enter this code to confirm it:",
        },
        { t: "code", text: "{{ .Token }}" },
        {
          t: "fine",
          text: "The code works once and expires soon. Never share it with anyone, including Lengdon staff.",
        },
        {
          t: "fine",
          text: "If you did not request this, you can ignore this email; nothing changes until the code is used.",
        },
      ],
      reason: reasonFor,
    },
  },
  {
    id: "password_changed",
    dashboardName: "Password changed notification",
    file: "password-changed.html",
    model: {
      subject: "Your Lengdon password was changed",
      preheader: "The password for your Lengdon account was just changed.",
      heading: "Your password was changed",
      blocks: [
        {
          t: "p",
          text: "The password for the Lengdon account {{ .Email }} was just changed.",
        },
        { t: "p", text: "If you made this change, no action is needed." },
        { t: "note", label: "If this was not you", text: NOT_YOU_SECURITY },
        SECURITY_RESET_BUTTON,
      ],
      reason: reasonFor,
    },
  },
  {
    id: "email_changed",
    dashboardName: "Email address changed notification",
    file: "email-changed.html",
    model: {
      subject: "Your Lengdon email address was changed",
      preheader: "The email address on your Lengdon account was changed.",
      heading: "Your email address was changed",
      blocks: [
        {
          t: "p",
          text: "The email address of a Lengdon account was changed from {{ .OldEmail }} to {{ .Email }}.",
        },
        { t: "p", text: "If you made this change, no action is needed." },
        { t: "note", label: "If this was not you", text: NOT_YOU_SECURITY },
        SECURITY_RESET_BUTTON,
      ],
      reason: reasonFor,
    },
  },
  {
    id: "phone_changed",
    dashboardName: "Phone number changed notification",
    file: "phone-changed.html",
    model: {
      subject: "Your Lengdon phone number was changed",
      preheader: "The phone number on your Lengdon account was changed.",
      heading: "Your phone number was changed",
      blocks: [
        {
          t: "p",
          text: "The phone number on the Lengdon account {{ .Email }} was changed from {{ .OldPhone }} to {{ .Phone }}.",
        },
        { t: "p", text: "If you made this change, no action is needed." },
        { t: "note", label: "If this was not you", text: NOT_YOU_SECURITY },
        SECURITY_RESET_BUTTON,
      ],
      reason: reasonFor,
    },
  },
  {
    id: "identity_linked",
    dashboardName: "Sign-in method linked notification",
    file: "identity-linked.html",
    model: {
      subject: "A sign-in method was added to your Lengdon account",
      preheader: "A new way to sign in was linked to your Lengdon account.",
      heading: "A sign-in method was added",
      blocks: [
        {
          t: "p",
          text: "The sign-in method {{ .Provider }} was linked to the Lengdon account {{ .Email }}.",
        },
        { t: "p", text: "If you did this, no action is needed." },
        { t: "note", label: "If this was not you", text: NOT_YOU_SECURITY },
        SECURITY_RESET_BUTTON,
      ],
      reason: reasonFor,
    },
  },
  {
    id: "identity_removed",
    dashboardName: "Sign-in method removed notification",
    file: "identity-removed.html",
    model: {
      subject: "A sign-in method was removed from your Lengdon account",
      preheader: "A way to sign in was removed from your Lengdon account.",
      heading: "A sign-in method was removed",
      blocks: [
        {
          t: "p",
          text: "The sign-in method {{ .Provider }} was removed from the Lengdon account {{ .Email }}.",
        },
        { t: "p", text: "If you did this, no action is needed." },
        { t: "note", label: "If this was not you", text: NOT_YOU_SECURITY },
        SECURITY_RESET_BUTTON,
      ],
      reason: reasonFor,
    },
  },
  {
    id: "mfa_added",
    dashboardName: "Verification method added notification",
    file: "mfa-added.html",
    model: {
      subject: "A verification method was added to your Lengdon account",
      preheader: "A new verification method was added to your Lengdon account.",
      heading: "A verification method was added",
      blocks: [
        {
          t: "p",
          text: "A verification method of type {{ .FactorType }} was added to the Lengdon account {{ .Email }}.",
        },
        { t: "p", text: "If you did this, no action is needed." },
        { t: "note", label: "If this was not you", text: NOT_YOU_SECURITY },
        SECURITY_RESET_BUTTON,
      ],
      reason: reasonFor,
    },
  },
  {
    id: "mfa_removed",
    dashboardName: "Verification method removed notification",
    file: "mfa-removed.html",
    model: {
      subject: "A verification method was removed from your Lengdon account",
      preheader: "A verification method was removed from your Lengdon account.",
      heading: "A verification method was removed",
      blocks: [
        {
          t: "p",
          text: "A verification method of type {{ .FactorType }} was removed from the Lengdon account {{ .Email }}.",
        },
        { t: "p", text: "If you did this, no action is needed." },
        { t: "note", label: "If this was not you", text: NOT_YOU_SECURITY },
        SECURITY_RESET_BUTTON,
      ],
      reason: reasonFor,
    },
  },
];

export function renderSupabaseTemplate(t: SupabaseTemplate): string {
  return renderEmail(t.model, { mode: "supabase" }).html;
}
