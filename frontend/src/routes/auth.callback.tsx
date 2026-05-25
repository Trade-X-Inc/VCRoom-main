import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

        await supabase.from('users').upsert({
          id: userId,
          role: finalRole,
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            userEmail.split('@')[0],
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

        window.location.href =
          finalRole === 'investor'
            ? '/app/investor/'
            : '/app'
      } catch (err) {
        console.error('Callback error:', err)
        window.location.href = '/sign-in'
      }
    }

    run()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-purple-600/30 border-t-purple-600 animate-spin" />
      <p className="text-muted-foreground text-sm">{msg}</p>
    </div>
  )
}
