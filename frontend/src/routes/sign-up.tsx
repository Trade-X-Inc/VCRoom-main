import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Turnstile } from '@marsidev/react-turnstile'

export const Route = createFileRoute('/sign-up')({
  head: () => ({
    meta: [
      { title: "Sign up | Hockystick" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignUp
})

type Role = 'founder' | 'investor'

function SignUp() {
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')

  const saveRole = async (userId: string, userRole: Role, fullName: string) => {
    const { error } = await supabase.from('users').upsert(
      { id: userId, role: userRole, full_name: fullName, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (error) console.error('[sign-up] role save failed:', error)
  }

  const handleGoogle = async () => {
    if (!role) return
    localStorage.setItem('pending_role', role)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, full_name: name },
        captchaToken: turnstileToken || undefined,
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await saveRole(data.user.id, role, name)

      if (data.session) {
        window.location.href = role === 'investor' ? '/app/investor/' : '/app'
      } else {
        setDone(true)
        setLoading(false)
      }
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-5">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-10 text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            We sent a confirmation link to{' '}
            <strong className="text-foreground">{email}</strong>. Click it to activate your
            account, then sign in.
          </p>
          <Link to="/sign-in" className="inline-block mt-6 text-brand text-sm">
            Go to sign in →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-5">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg hs-gradient-static flex items-center justify-center">
              <span className="text-foreground text-sm font-bold">H</span>
            </div>
            <span className="font-semibold text-foreground">Hockystick</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Create your account</h1>
          <p className="text-muted-foreground text-sm">Choose your role to get started</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['founder', 'investor'] as Role[]).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`p-4 rounded-none border text-left transition-all ${
                role === r
                  ? 'border-brand bg-accent'
                  : 'border-border bg-background hover:border-border/80'
              }`}
            >
              <div className="text-2xl mb-2">{r === 'founder' ? '🚀' : '📈'}</div>
              <div className="text-sm font-semibold text-foreground">
                {r === 'founder' ? "I'm a Founder" : "I'm an Investor"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {r === 'founder' ? 'Raising capital' : 'Reviewing deals'}
              </div>
            </button>
          ))}
        </div>

        {role && (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-none border border-border bg-background hover:bg-accent transition-colors mb-4 text-foreground text-sm font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
              Continue with Google as {role === 'founder' ? 'Founder' : 'Investor'}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-xs">or email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Full name"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Email address"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Password (min 6 chars)"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''}
                onSuccess={(token) => setTurnstileToken(token)}
                options={{ theme: 'dark' }}
              />
              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full py-3 rounded-lg hs-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creating account...' : `Create ${role} account →`}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-brand">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
