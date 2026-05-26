import { createAPIHandler } from '@tanstack/react-start/api'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const InviteSchema = z.object({
  dealRoomId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['viewer', 'investor', 'founder']).default('viewer'),
  invitedBy: z.string().uuid(),
  dealRoomName: z.string().optional(),
  founderName: z.string().optional(),
  startupName: z.string().optional(),
  message: z.string().optional(),
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default createAPIHandler({
  method: 'POST',
  handler: async ({ request }) => {
    try {
      // Resolve env vars — supabaseAdmin created inside handler to avoid
      // module-level throw when env vars are missing at boot time.
      const supabaseUrl =
        process.env.SUPABASE_URL || (globalThis as any).SUPABASE_URL || ''
      const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (globalThis as any).SUPABASE_SERVICE_ROLE_KEY ||
        ''

      console.log('supabaseUrl present:', !!supabaseUrl)
      console.log('serviceKey present:', !!supabaseServiceKey)

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('api/invites: missing Supabase env vars')
        return json({ success: false, error: 'Server configuration error: missing Supabase credentials' }, 500)
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Parse + validate body
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ success: false, error: 'Invalid JSON body' }, 400)
      }

      const result = InviteSchema.safeParse(body)
      if (!result.success) {
        return json({ success: false, error: result.error.flatten() }, 400)
      }

      const { dealRoomId, email, role, invitedBy, dealRoomName, founderName, startupName, message } =
        result.data

      // Insert invite record
      const { data: invite, error: dbErr } = await supabaseAdmin
        .from('invites')
        .insert({ deal_room_id: dealRoomId, email, role, invited_by: invitedBy })
        .select('token')
        .single()

      if (dbErr || !invite) {
        console.error('api/invites: DB insert failed:', dbErr?.message)
        return json({ success: false, error: dbErr?.message ?? 'Failed to create invite record' }, 500)
      }

      const baseUrl =
        process.env.SITE_URL ||
        (globalThis as any).SITE_URL ||
        'https://hockeystick.app'
      const inviteLink = `${baseUrl}/join/${invite.token}`
      const roomName = startupName ?? dealRoomName ?? 'a deal room'
      const senderName = founderName ?? 'A founder'
      const resendKey =
        process.env.RESEND_API_KEY || (globalThis as any).RESEND_API_KEY || ''
      const fromEmail =
        process.env.RESEND_FROM_EMAIL ||
        (globalThis as any).RESEND_FROM_EMAIL ||
        'onboarding@resend.dev'

      console.log('Resend key present:', !!resendKey)
      console.log('Sending to:', email)
      console.log('From:', fromEmail)
      console.log('Invite link:', inviteLink)

      // No Resend key — invite created, skip email, still return success + link
      if (!resendKey) {
        console.warn('No RESEND_API_KEY — skipping email')
        return json({
          success: true,
          emailSent: false,
          token: invite.token,
          inviteLink,
          message: 'Invite created. Email not sent — copy link manually.',
        })
      }

      const emailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#111827">
          <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">You've been invited to a deal room</h1>
          <p style="color:#6b7280;margin:0 0 24px;font-size:15px">${senderName} has invited you to evaluate <strong>${roomName}</strong> on Hockeystick.</p>
          ${message ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 24px"><p style="color:#374151;margin:0;font-size:14px;white-space:pre-line">${message}</p></div>` : ''}
          <a href="${inviteLink}" style="background:#6C5CE7;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:15px">View deal room →</a>
          <p style="color:#9ca3af;font-size:12px;margin:32px 0 0">This link expires in 7 days. If you didn't expect this, you can ignore it.</p>
        </div>
      `

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `${senderName} invited you to the ${roomName} deal room`,
          html: emailHtml,
        }),
      })

      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Resend error:', emailRes.status, errText)
        // Invite was created — email failure is non-fatal, still return link
        return json({
          success: true,
          emailSent: false,
          token: invite.token,
          inviteLink,
          message: 'Invite created but email failed to send.',
        })
      }

      return json({
        success: true,
        emailSent: true,
        token: invite.token,
        inviteLink,
      })
    } catch (err) {
      console.error('api/invites unhandled error:', err)
      return json({
        success: false,
        error: String(err),
        inviteLink: null,
      }, 500)
    }
  },
})
