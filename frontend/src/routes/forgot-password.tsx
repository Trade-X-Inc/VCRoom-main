import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/forgot-password')({
  head: () => ({
    meta: [
      { title: "Reset password — Lengdon" },
      { name: "description", content: "Reset your Lengdon account password." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/forgot-password" }],
  }),
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
    <div className="min-h-screen flex items-center justify-center bg-white p-5">
      <div className="w-full max-w-md border border-[var(--v2-rule)] p-10">
        {sent ? (
          <div className="text-center">
            <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="text-xl text-[var(--v2-accent)] mb-2">Check your email</h2>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-sm">
              Password reset link sent to{' '}
              <strong style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)]">{email}</strong>
            </p>
            <Link to="/sign-in" style={{ fontFamily: "var(--font-v2-ui)" }} className="inline-block mt-6 text-[var(--v2-accent)] text-sm hover:opacity-70 transition-colors">
              Back to sign in →
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="text-2xl text-[var(--v2-accent)] mb-2">Reset password</h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-sm mb-8">
              Enter your email and we'll send you a reset link
            </p>

            {error && (
              <div className="mb-4 border border-v2-adverse/30 bg-v2-adverse-wash px-4 py-3">
                <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-v2-adverse text-[13px]">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={{ fontFamily: "var(--font-v2-ui)" }}
                className="w-full border border-[var(--v2-rule)] px-4 py-3 text-[14px] text-[var(--v2-accent)] placeholder-[var(--v2-ink-muted)] focus:outline-none focus:border-[var(--v2-accent)] transition-colors duration-150"
              />
              <button
                type="submit"
                disabled={loading}
                style={{ fontFamily: "var(--font-v2-ui)" }}
                className="w-full bg-[var(--v2-accent)] hover:bg-[var(--v2-accent)]/90 disabled:opacity-50 text-white text-sm py-4 transition-colors duration-200"
              >
                {loading ? 'Sending...' : 'Send reset link →'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/sign-in" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-sm hover:text-[var(--v2-accent)] transition-colors">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
