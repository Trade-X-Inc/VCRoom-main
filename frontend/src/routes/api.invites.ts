import { createAPIHandler } from '@tanstack/react-start/api'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const InviteSchema = z.object({
  dealRoomId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['viewer', 'investor', 'founder']).default('viewer'),
  invitedBy: z.string().uuid(),
  dealRoomName: z.string().optional(),
  message: z.string().optional(),
})

export default createAPIHandler({
  method: 'POST',
  handler: async ({ request }) => {
    const body = await request.json()

    const result = InviteSchema.safeParse(body)
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error.flatten() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { dealRoomId, email, role, invitedBy, dealRoomName, message } = result.data

    // Create invite record in Supabase
    const { data: invite, error: dbErr } = await supabaseAdmin
      .from('invites')
      .insert({ deal_room_id: dealRoomId, email, role, invited_by: invitedBy })
      .select('token')
      .single()

    if (dbErr || !invite) {
      return new Response(JSON.stringify({ error: dbErr?.message ?? 'Failed to create invite' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const baseUrl = process.env.SITE_URL ?? 'https://ventureroom.app'
    const inviteLink = `${baseUrl}/join/${invite.token}`
    const roomName = dealRoomName ?? 'a deal room'
    const emailHtml = `
      <p>You have been invited to join <strong>${roomName}</strong> on Venture Room.</p>
      ${message ? `<p>${message.replace(/\n/g, '<br>')}</p>` : ''}
      <p><a href="${inviteLink}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Accept invitation</a></p>
      <p style="color:#888;font-size:12px;margin-top:24px;">This link expires in 7 days.</p>
    `

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Venture Room <deals@ventureroom.app>',
          to: email,
          subject: `You've been invited to ${roomName}`,
          html: emailHtml,
        }),
      })
    }

    return new Response(JSON.stringify({ token: invite.token, inviteLink }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
