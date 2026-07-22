import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

export const Route = createFileRoute('/sign-in')({
  head: () => ({
    meta: [
      { title: "Sign in | Hockystick" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignIn
})

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
    if (error) setError(error.message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('Sign in failed — please try again')
      setLoading(false)
      return
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.session.user.id)
      .maybeSingle()

    const role = userRecord?.role || data.session.user.user_metadata?.role || 'founder'
    window.location.href = role === 'investor' ? '/app/investor/' : '/app'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-5">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-10">
        <div className="mb-8">
          <Link to="/" className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <Link to="/" className="mb-6 block w-fit">
            <Logo />
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your workspace</p>
        </div>

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
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-xs">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg hs-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
          <Link to="/sign-up" className="text-brand hover:text-brand">
            Create account →
          </Link>
        </div>
      </div>
    </div>
  )
}
