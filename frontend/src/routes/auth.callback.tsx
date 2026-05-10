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
      await new Promise(r => setTimeout(r, 1500))

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setMsg('Could not sign in. Redirecting...')
        setTimeout(() => { window.location.href = '/sign-in' }, 2000)
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
        pending ||
        session.user.user_metadata?.role ||
        'founder'

      setMsg(`Welcome! Setting up your ${role} account...`)

      await supabase.from('users').upsert(
        {
          id: userId,
          role,
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            userEmail.split('@')[0],
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )

      setMsg('Redirecting to your dashboard...')
      setTimeout(() => {
        window.location.href = role === 'investor' ? '/app/investor/' : '/app'
      }, 500)
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
