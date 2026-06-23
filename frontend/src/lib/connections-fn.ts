import { createServerFn } from "@tanstack/react-start";

// ── Types ──────────────────────────────────────────────────────────────────

type SendIntakeInviteInput = {
  investorId: string;
  investorProfileId: string;
  candidateIds: string[];
  investorName: string;
  investorFundName: string;
};

type GenerateInviteLinkInput = {
  investorId: string;
  label?: string;
};

type JoinViaInviteLinkInput = {
  token: string;
  companyName: string;
  investorId: string;
  inviteLinkId: string;
};

// ── DB helpers ─────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

async function sbFetch(url: string, key: string, path: string, method: string, body?: unknown, prefer?: string) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": prefer ?? (method === "POST" ? "return=representation" : "return=minimal"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── 1. Send Hockystick invite to intake candidates ─────────────────────────
// Confirm-first rule applies — caller must show confirmation UI before calling this.

export const sendIntakeInvites = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SendIntakeInviteInput)
  .handler(async ({ data }): Promise<{ ok: boolean; sent: number; errors: string[] }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, sent: 0, errors: ["db_unavailable"] };

    const cfEnv = (globalThis as any).__cf_env || {};
    const resendKey = cfEnv.RESEND_API_KEY || "";
    const fromEmail = cfEnv.RESEND_FROM_EMAIL || "hello@hockystick.app";

    // Fetch the candidates
    const candidates: any[] = await sbFetch(
      url, key,
      `investor_intake_candidates?id=in.(${data.candidateIds.map((id) => `"${id}"`).join(",")})&select=id,company_name,contact_name,contact_email,thesis_fit_score,watchlist_id`,
      "GET"
    ).catch(() => []);

    const errors: string[] = [];
    let sent = 0;

    for (const candidate of candidates) {
      if (!candidate.contact_email) {
        errors.push(`No email for ${candidate.company_name}`);
        continue;
      }
      // Skip if already invited
      if (candidate.watchlist_id) continue;

      const inviteUrl = `https://hockystick.app/join?invited_by_fund=${encodeURIComponent(data.investorFundName)}`;

      // Create watchlist entry
      let watchlistId: string | null = null;
      try {
        const wlRows: any[] = await sbFetch(url, key, "investor_watchlist", "POST", {
          investor_id: data.investorId,
          company_name: candidate.company_name,
          source: "intake",
          status: "Sourcing",
          auto_added: false,
          seen_by_investor: true,
        });
        watchlistId = wlRows?.[0]?.id ?? null;
      } catch (e: any) {
        errors.push(`Watchlist insert failed for ${candidate.company_name}: ${e.message}`);
        continue;
      }

      // Stamp invite_sent_at + watchlist_id on candidate
      if (watchlistId) {
        await sbFetch(
          url, key,
          `investor_intake_candidates?id=eq.${candidate.id}`,
          "PATCH",
          { invite_sent_at: new Date().toISOString(), watchlist_id: watchlistId }
        ).catch(() => null);
      }

      // Send email via Resend
      if (resendKey) {
        try {
          const html = buildInviteEmail({
            recipientName: candidate.contact_name || candidate.company_name,
            investorName: data.investorName,
            fundName: data.investorFundName,
            inviteUrl,
          });

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: `Hockystick <${fromEmail}>`,
              to: [candidate.contact_email],
              subject: `${data.investorFundName} invited you to Hockystick`,
              html,
            }),
          });
          sent++;
        } catch {
          errors.push(`Email failed for ${candidate.contact_email}`);
        }
      } else {
        // No Resend key — still count as sent (watchlist entry created)
        sent++;
      }
    }

    return { ok: true, sent, errors };
  });

// ── 2. Generate a personal invite link ────────────────────────────────────

export const generateInviteLink = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as GenerateInviteLinkInput)
  .handler(async ({ data }): Promise<{ ok: boolean; link?: any; error?: string }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    // Check if investor already has an active link
    const existing: any[] = await sbFetch(
      url, key,
      `investor_invite_links?investor_id=eq.${data.investorId}&active=eq.true&select=*`,
      "GET"
    ).catch(() => []);

    if (existing?.length > 0) return { ok: true, link: existing[0] };

    // Generate a new UUID token
    const token = crypto.randomUUID();
    const inserted: any[] = await sbFetch(url, key, "investor_invite_links", "POST", {
      investor_id: data.investorId,
      token,
      label: data.label ?? null,
      active: true,
      uses_count: 0,
    });

    return { ok: true, link: inserted?.[0] ?? null };
  });

// ── 3. Handle founder joining via investor invite link ────────────────────
// Called server-side after founder confirms their profile.

export const processInviteLinkJoin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as JoinViaInviteLinkInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    // Validate token still active
    const links: any[] = await sbFetch(
      url, key,
      `investor_invite_links?token=eq.${data.token}&active=eq.true&select=id,investor_id,uses_count`,
      "GET"
    ).catch(() => []);

    if (!links?.length) return { ok: false, error: "invalid_or_expired_link" };
    const link = links[0];

    // Prevent duplicate watchlist entry by company_name
    const existing: any[] = await sbFetch(
      url, key,
      `investor_watchlist?investor_id=eq.${link.investor_id}&company_name=eq.${encodeURIComponent(data.companyName)}&select=id`,
      "GET"
    ).catch(() => []);
    if (existing?.length > 0) return { ok: true }; // already added

    // Insert watchlist row — auto_added, unseen (watchlist has no startup_id column)
    await sbFetch(url, key, "investor_watchlist", "POST", {
      investor_id: link.investor_id,
      company_name: data.companyName,
      source: "invite_link",
      status: "Sourcing",
      auto_added: true,
      seen_by_investor: false,
      source_invite_link_id: link.id,
    });

    // Increment uses_count
    await sbFetch(
      url, key,
      `investor_invite_links?id=eq.${link.id}`,
      "PATCH",
      { uses_count: (link.uses_count ?? 0) + 1 }
    ).catch(() => null);

    // Send in-app notification to investor (notifications uses 'kind' not 'type')
    await sbFetch(url, key, "notifications", "POST", {
      user_id: link.investor_id,
      title: "New founder joined via your invite link",
      body: `${data.companyName} joined through your invite link and has been added to your pipeline.`,
      kind: "deal",
      action_url: "/app/investor/connections",
    }).catch(() => null);

    return { ok: true };
  });

// ── Email template ─────────────────────────────────────────────────────────

function buildInviteEmail({ recipientName, investorName, fundName, inviteUrl }: {
  recipientName: string;
  investorName: string;
  fundName: string;
  inviteUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f4f4f5; color:#09090b; }
.wrapper { max-width:600px; margin:0 auto; padding:40px 20px; }
.card { background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08); }
.header { background:#0a0a0b; padding:28px 32px; text-align:center; }
.logo { font-size:20px; font-weight:700; color:#fff; }
.logo-dot { color:#7c3aed; }
.body { padding:32px; }
.footer { padding:24px 32px; text-align:center; background:#fafafa; border-top:1px solid #e4e4e7; }
.footer p { color:#71717a; font-size:12px; line-height:1.6; }
.btn { display:inline-block; padding:12px 28px; background:#7c3aed; color:#fff !important; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px; margin:20px 0; }
h1 { font-size:22px; font-weight:700; color:#09090b; margin-bottom:12px; }
p { color:#3f3f46; font-size:15px; line-height:1.7; margin-bottom:16px; }
.highlight { background:#f5f3ff; border-left:3px solid #7c3aed; padding:12px 16px; border-radius:0 6px 6px 0; margin:20px 0; }
.highlight p { margin:0; color:#4c1d95; font-weight:500; }
</style></head>
<body>
<div class="wrapper"><div class="card">
  <div class="header"><div class="logo">Hocky<span class="logo-dot">stick</span></div>
  <div style="color:#a1a1aa;font-size:12px;margin-top:4px;">Where deals get done</div></div>
  <div class="body">
    <h1>You've been invited to Hockystick</h1>
    <p>Hi ${recipientName},</p>
    <p>${investorName} at ${fundName} wants to connect with your company on Hockystick — the platform where founders and investors manage their deal flow.</p>
    <div class="highlight"><p>${fundName} has expressed interest in reviewing your company.</p></div>
    <p>Create your founder profile to connect, share your deck, and manage your fundraising process in one place.</p>
    <div style="text-align:center;"><a href="${inviteUrl}" class="btn">Accept invitation →</a></div>
    <p style="font-size:13px;color:#71717a;">If you didn't expect this invitation, you can safely ignore this email.</p>
  </div>
  <div class="footer">
    <p>Hockystick · <a href="https://hockystick.app" style="color:#7c3aed;">hockystick.app</a></p>
    <p style="margin-top:8px;">You're receiving this because an investor sent you an invitation.</p>
  </div>
</div></div>
</body></html>`;
}
