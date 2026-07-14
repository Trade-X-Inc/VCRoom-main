import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { triggerWelcomeEmail } from '@/lib/email/triggers'
import { syncContactToHubSpot } from '@/lib/hubspot'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback
})

function AuthCallback() {
  const [msg, setMsg] = useState('Signing you in...')

  useEffect(() => {
    const run = async () => {
      try {
        // Supabase puts tokens in the URL hash
        // We need to let it process automatically
        // onAuthStateChange will fire when ready

        let session = null
        let attempts = 0

        // Poll for session up to 5 seconds
        while (!session && attempts < 10) {
          const { data } = await supabase.auth.getSession()
          session = data.session
          if (!session) {
            await new Promise(r => setTimeout(r, 500))
          }
          attempts++
        }

        if (!session) {
          setMsg('Could not sign in. Redirecting...')
          setTimeout(() => {
            window.location.href = '/sign-in'
          }, 2000)
          return
        }

        const userId = session.user.id
        const userEmail = session.user.email || ''

        const pending = localStorage.getItem('pending_role') || ''
        localStorage.removeItem('pending_role')

        const { data: existing } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle()

        const role =
          existing?.role ||
          session.user.user_metadata?.role ||
          pending ||
          'founder'

        // Never downgrade an existing investor to founder
        const finalRole = existing?.role === 'investor' && role === 'founder'
          ? 'investor'
          : role

        setMsg(`Welcome! Loading your dashboard...`)

        const fullName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          userEmail.split('@')[0];

        const { data: upsertResult } = await supabase.from('users').upsert({
          id: userId,
          role: finalRole,
          full_name: fullName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' }).select('id').maybeSingle();

        // Send welcome email only on first sign-up (no prior role = new user)
        if (!existing?.role && upsertResult) {
          try {
            await triggerWelcomeEmail({
              data: { userId, name: fullName, role: finalRole as "founder" | "investor", email: userEmail },
            });
            console.log("[auth.callback] Welcome email triggered for:", userEmail);
          } catch (e) {
            console.error("[auth.callback] Welcome email failed:", e);
          }

          // Sync to HubSpot via server fn — awaited so it completes before redirect
          try {
            const nameParts = fullName.split(' ');
            await syncContactToHubSpot({
              data: {
                email: userEmail,
                properties: {
                  firstname: nameParts[0] || "",
                  lastname: nameParts.slice(1).join(' ') || "",
                  lifecyclestage: "lead",
                  hs_lead_status: "NEW",
                  user_type: finalRole === "founder" ? "Founder" : "Investor",
                  platform_signup_date: new Date().toISOString().split("T")[0],
                },
              },
            });
            console.log("[auth.callback] HubSpot sync complete for:", userEmail);
          } catch (e) {
            console.error("[auth.callback] HubSpot sync failed:", e);
          }
        }

        // Route to the correct landing page after sign-in
        if (finalRole === 'investor') {
          // Investor default landing: Overview page (not the AI Advisor index)
          window.location.href = '/app/investor/overview';
        } else if (!existing?.role) {
          // Brand new founder — go to profile builder unless they already dismissed it
          const alreadySkipped = localStorage.getItem('pb_skipped') === '1';
          window.location.href = alreadySkipped ? '/app/overview' : '/app/profile-builder';
        } else {
          // Returning founder — if they have a startup, go straight to /app/overview.
          // Only send to profile-builder if they have no startup row yet.
          const { data: startup } = await supabase
            .from('startups')
            .select('id')
            .eq('founder_id', userId)
            .maybeSingle();
          window.location.href = startup?.id ? '/app/overview' : '/app/profile-builder';
        }
      } catch (err) {
        console.error('Callback error:', err)
        window.location.href = '/sign-in'
      }
    }

    run()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-border border-t-brand animate-spin" />
      <p className="text-muted-foreground text-sm">{msg}</p>
    </div>
  )
}
