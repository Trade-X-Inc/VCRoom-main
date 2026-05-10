import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPassword
})

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/callback'
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-5">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-10">
        {sent ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              Password reset link sent to{' '}
              <strong className="text-foreground">{email}</strong>
            </p>
            <Link to="/sign-in" className="inline-block mt-6 text-purple-500 text-sm">
              Back to sign in →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Reset password</h1>
            <p className="text-muted-foreground text-sm mb-8">
              Enter your email and we'll send you a reset link
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link →'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/sign-in" className="text-muted-foreground text-sm hover:text-foreground">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
