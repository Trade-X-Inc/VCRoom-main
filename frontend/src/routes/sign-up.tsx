import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/sign-up')({
  component: SignUp,
})

function SignUp() {
  const [role, setRole] = useState<'founder' | 'investor' | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError('')
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
          data: { full_name: name, role },
        },
      })

      if (signUpError) {
        const msg = signUpError.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          setError('An account with this email already exists. Please sign in instead.')
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      // Save role for callback to use
      localStorage.setItem(`pending_role_${email}`, role)

      // Try to upsert role to DB immediately
      if (data.user?.id) {
        const now = new Date().toISOString()
        await supabase.from('users').upsert(
          { id: data.user.id, email, full_name: name, role, created_at: now, updated_at: now },
          { onConflict: 'id' },
        )
      }

      // Check if we got an immediate session (email confirmation disabled)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        localStorage.removeItem(`pending_role_${email}`)
        window.location.href = role === 'investor' ? '/app/investor/' : '/app'
        return
      }

      setConfirmed(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!role) return
    localStorage.setItem('oauth_pending_role', role)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) setError(error.message)
  }

  if (confirmed) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0F0F13', padding: '20px',
      }}>
        <div style={{
          background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(108,92,231,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>
            Check your inbox
          </h2>
          <p style={{ color: '#8B8FA8', marginBottom: '8px' }}>
            Confirmation email sent to
          </p>
          <p style={{ color: '#6C5CE7', fontWeight: '600', marginBottom: '24px' }}>{email}</p>
          <p style={{ color: '#8B8FA8', fontSize: '13px', marginBottom: '24px' }}>
            Click the link in the email to confirm your account. Check your spam folder if you don't see it.
          </p>
          <Link to="/sign-in" style={{ color: '#6C5CE7', fontSize: '14px' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0F0F13', padding: '20px',
    }}>
      <div style={{
        background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '420px',
      }}>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Create your workspace
        </h1>
        <p style={{ color: '#8B8FA8', marginBottom: '28px' }}>
          Free for founders · 14-day trial for investors
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

        {/* Role selection */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ color: '#8B8FA8', fontSize: '13px', marginBottom: '10px' }}>I am a…</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {(['founder', 'investor'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  padding: '14px 12px', borderRadius: '10px', cursor: 'pointer',
                  border: role === r ? '2px solid #6C5CE7' : '1px solid rgba(255,255,255,0.1)',
                  background: role === r ? 'rgba(108,92,231,0.1)' : '#0F0F13',
                  color: role === r ? '#fff' : '#8B8FA8',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>
                  {r === 'founder' ? '🚀' : '💼'}
                </div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>
                  {r === 'founder' ? "I'm a Founder" : "I'm an Investor"}
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.7 }}>
                  {r === 'founder' ? 'Raising capital' : 'Reviewing deals'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {role && (
          <>
            <button
              onClick={handleGoogleSignUp}
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

            <div style={{ textAlign: 'center', color: '#8B8FA8', marginBottom: '16px', fontSize: '13px' }}>or</div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#8B8FA8', fontSize: '13px', marginBottom: '6px' }}>Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 12px', background: '#0F0F13',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                    color: '#fff', fontSize: '15px', boxSizing: 'border-box',
                  }}
                  placeholder={role === 'investor' ? 'Alex Johnson' : 'Sam Rivera'}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#8B8FA8', fontSize: '13px', marginBottom: '6px' }}>Work email</label>
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
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#8B8FA8', fontSize: '13px', marginBottom: '6px' }}>Password</label>
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
                  placeholder="At least 8 characters"
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
                {loading ? 'Creating account...' : `Create ${role} workspace →`}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', color: '#8B8FA8', fontSize: '14px' }}>
          Already have an account?{' '}
          <Link to="/sign-in" style={{ color: '#6C5CE7' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
