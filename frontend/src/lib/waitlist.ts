import { supabase } from "@/lib/supabase";
import { syncContactToHubSpot } from "@/lib/hubspot";
import { submitWaitlistEntry } from "@/lib/notion-waitlist";

// SEO-020 Phase 2 — shared submission path for the new WaitlistPrompt
// popup, factored out rather than reusing sign-up.tsx or SiteFooter.tsx
// directly (per instruction: extract rather than risk changing either's
// existing behaviour). Same three real destinations both of those already
// use — Supabase waitlist_entries, HubSpot (syncContactToHubSpot), Notion
// (submitWaitlistEntry) — same call shape, nothing new invented.
//
// Name is not collected by this popup. Confirmed from source, not
// assumed: SiteFooter.tsx's NewsletterBar already submits
// `full_name: ""` to Supabase with no error (no NOT NULL/role.required
// problem — insert fires the same open policy the footer form uses), and
// notion-waitlist.ts's own handler already falls back `data.name ||
// data.email` when name is empty (line 36 of that file) — this helper
// relies on that existing fallback rather than duplicating it.
//
// Duplicate email -> Supabase's insert policy has no unique constraint
// enforced client-side that would surface as an error here (the footer
// form already relies on the same open insert succeeding on a repeat
// email), and HubSpot's upsertHubSpotContact searches by email first and
// PATCHes the existing contact rather than erroring on a second create —
// so a duplicate submission already reads as success through the normal
// code path, not a special case this helper has to add.

export type WaitlistRole = "founder" | "investor";
export type WaitlistSource = "sign-up page" | "footer newsletter" | "popup";

export interface SubmitWaitlistArgs {
  email: string;
  role?: WaitlistRole;
  source: WaitlistSource;
}

export interface SubmitWaitlistResult {
  ok: boolean;
  error?: string;
}

export async function submitToWaitlist({ email, role, source }: SubmitWaitlistArgs): Promise<SubmitWaitlistResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, error: "Enter an email address." };
  }

  try {
    const { error: dbError } = await supabase.from("waitlist_entries").insert({
      email: normalizedEmail,
      full_name: "",
      role: role ?? null,
      type: source,
    });
    if (dbError) {
      console.error("[waitlist] Supabase insert failed:", dbError);
      return { ok: false, error: "Something went wrong. Please try again." };
    }

    syncContactToHubSpot({
      data: {
        email: normalizedEmail,
        properties: {
          lifecyclestage: "lead",
          hs_lead_status: "NEW",
          ...(role ? { user_type: role === "founder" ? "Founder" : "Investor" } : {}),
        },
      },
    }).catch((e) => console.error("[waitlist] HubSpot sync failed:", e));

    submitWaitlistEntry({
      data: {
        name: normalizedEmail,
        email: normalizedEmail,
        role,
        source,
      },
    }).catch((e) => console.error("[waitlist] Notion submit failed:", e));

    return { ok: true };
  } catch (e) {
    console.error("[waitlist] submission error:", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
