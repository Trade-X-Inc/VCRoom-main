import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
})

function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      console.log('[Auth Callback] Starting...')

      // Wait up to 1s for session to be set after OAuth redirect
      let session = null
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession()
        session = data.session
        if (session) break
        await new Promise(r => setTimeout(r, 100))
      }

      if (!session) {
        console.error('[Auth Callback] No session after waiting')
        window.location.href = '/sign-in'
        return
      }

      const userEmail = session.user.email ?? ''
      const metadata = session.user.user_metadata

      console.log('[Auth Callback] User:', userEmail)

      // Read both localStorage keys
      const pendingRole =
        localStorage.getItem('oauth_pending_role') ||
        localStorage.getItem(`pending_role_${userEmail}`)

      console.log('[Auth Callback] Pending role from localStorage:', pendingRole)
      console.log('[Auth Callback] Metadata role:', metadata?.role)

      // Check if user already has a role in DB
      const { data: existingUser, error: fetchErr } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (fetchErr) console.error('[Auth Callback] DB fetch error:', fetchErr)

      const finalRole = existingUser?.role || pendingRole || metadata?.role || 'founder'
      console.log('[Auth Callback] Final role:', finalRole)

      // Clean up localStorage
      localStorage.removeItem('oauth_pending_role')
      localStorage.removeItem(`pending_role_${userEmail}`)

      // Upsert user to DB
      const { error: upsertError } = await supabase.from('users').upsert(
        {
          id: session.user.id,
          email: userEmail,
          role: finalRole,
          full_name: metadata?.full_name || metadata?.name || userEmail.split('@')[0] || '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )

      if (upsertError) console.error('[Auth Callback] Upsert error:', upsertError)
      else console.log('[Auth Callback] Upserted successfully')

      const target = finalRole === 'investor' ? '/app/investor/' : '/app'
      console.log('[Auth Callback] Navigating to:', target)

      // Use window.location for a clean full-page navigation so beforeLoad runs fresh
      setTimeout(() => {
        window.location.href = target
      }, 500)
    }

    handleCallback()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0F0F13',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '36px', height: '36px', border: '3px solid rgba(108,92,231,0.3)',
          borderTop: '3px solid #6C5CE7', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ color: '#8B8FA8', fontSize: '15px' }}>Signing you in…</p>
      </div>
    </div>
  )
}
