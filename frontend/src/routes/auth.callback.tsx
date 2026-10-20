import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { triggerWelcomeEmail } from '@/lib/email/triggers'
import { syncOwnContact } from '@/lib/public-forms-fn'
import { isFreshRecoveryUser, isRecoverySession, markRecoverySession } from '@/lib/recovery'
import { takeJoinReturn } from '@/lib/join-stash'

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

        // Link styles that carry no session in the address: a token_hash verify link and a PKCE code. auth-js
        // handles a hash itself (and a PKCE code when its verifier is stored); anything still without a session
        // is exchanged here. A recovery one sets the recovery mark (the address, the PASSWORD_RECOVERY event, or,
        // for a bare code, a recovery email sent to this user moments ago).
        const params = new URL(window.location.href).searchParams
        const tokenHash = params.get('token_hash')
        const linkType = params.get('type')
        const code = params.get('code')
        if (tokenHash || code) {
          const { data: initial } = await supabase.auth.getSession()
          if (!initial.session) {
            if (tokenHash && linkType) {
              await supabase.auth.verifyOtp({ token_hash: tokenHash, type: linkType as 'recovery' })
            } else if (code) {
              const { data: exchanged } = await supabase.auth.exchangeCodeForSession(code)
              if (isFreshRecoveryUser(exchanged?.user)) markRecoverySession()
            }
          }
        }

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

        // A password-reset link: go and set the new password. No role changes, no welcome email.
        if (isRecoverySession()) {
          window.location.replace('/reset-password')
          return
        }

        const userId = session.user.id
        const userEmail = session.user.email || ''

        const pending = localStorage.getItem('pending_role') || ''
        localStorage.removeItem('pending_role')

        const { data: existing, error: existingError } = await supabase
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

        // Send the welcome email only when this callback created the users row (no prior row, and the
        // lookup itself succeeded: a failed read must never look like "new user" and re-send on every sign-in).
        if (!existingError && !existing?.role && upsertResult) {
          // Both server functions take only the caller's own access token: the recipient and the CRM contact
          // are the verified session's own address, never a value from this page.
          try {
            await triggerWelcomeEmail({ data: { accessToken: session.access_token } });
          } catch {
            console.error("[auth.callback] Welcome email failed")
          }

          // Sync to HubSpot via server fn — awaited so it completes before redirect
          try {
            await syncOwnContact({ data: { accessToken: session.access_token, kind: "account_created" } });
          } catch {
            console.error("[auth.callback] HubSpot sync failed")
          }
        }

        // Came here from an invitation page (Google sign-in): go back to it. A fixed path, and only after the users
        // row above exists. A password-reset session never reaches this line (handled before it).
        if (takeJoinReturn()) {
          window.location.href = '/join';
          return;
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
