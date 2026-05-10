import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/sign-in')({
  component: SignIn,
})

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (!data.session) {
        setError('Sign in failed. Please try again.')
        setLoading(false)
        return
      }

      // Get role from users table
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.session.user.id)
        .maybeSingle()

      const role = userRecord?.role || data.session.user.user_metadata?.role || 'founder'

      // Navigate based on role
      if (role === 'investor') {
        window.location.href = '/app/investor/'
      } else {
        window.location.href = '/app'
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) setError(error.message)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0F0F13', padding: '20px',
    }}>
      <div style={{
        background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px',
      }}>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Welcome back
        </h1>
        <p style={{ color: '#8B8FA8', marginBottom: '32px' }}>
          Sign in to your VentureRoom workspace
        </p>

        {error && (
          <div style={{
            background: 'rgba(225,112,85,0.1)', border: '1px solid #E17055',
            borderRadius: '8px', padding: '12px', color: '#E17055',
            marginBottom: '16px', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%', padding: '12px', background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer',
            fontSize: '15px', fontWeight: '500', marginBottom: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', color: '#8B8FA8', marginBottom: '16px', fontSize: '13px' }}>
          or
        </div>

        <form onSubmit={handleEmailSignIn}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#8B8FA8', fontSize: '13px', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', background: '#0F0F13',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#fff', fontSize: '15px', boxSizing: 'border-box',
              }}
              placeholder="you@company.com"
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#8B8FA8', fontSize: '13px', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', background: '#0F0F13',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#fff', fontSize: '15px', boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)',
              border: 'none', borderRadius: '10px', color: '#fff',
              fontSize: '15px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', color: '#8B8FA8', fontSize: '14px' }}>
          Don't have an account?{' '}
          <Link to="/sign-up" style={{ color: '#6C5CE7' }}>Create one</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <Link to="/forgot-password" style={{ color: '#8B8FA8', fontSize: '13px' }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  )
}
