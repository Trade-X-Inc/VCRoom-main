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
    <div className="min-h-screen flex items-center justify-center bg-white p-5">
      <div className="w-full max-w-md border border-[#e6e9ef] p-10">
        {sent ? (
          <div className="text-center">
            <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="text-xl text-[#0a2540] mb-2">Check your email</h2>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-sm">
              Password reset link sent to{' '}
              <strong style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540]">{email}</strong>
            </p>
            <Link to="/sign-in" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="inline-block mt-6 text-[#0a2540] text-sm hover:text-[#13233a] transition-colors">
              Back to sign in →
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="text-2xl text-[#0a2540] mb-2">Reset password</h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-sm mb-8">
              Enter your email and we'll send you a reset link
            </p>

            {error && (
              <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3">
                <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-red-700 text-[13px]">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                className="w-full border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#64748b] focus:outline-none focus:border-[#0a2540] transition-colors duration-150"
              />
              <button
                type="submit"
                disabled={loading}
                style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                className="w-full bg-[#0a2540] hover:bg-[#13233a] disabled:opacity-50 text-white text-sm py-4 transition-colors duration-200"
              >
                {loading ? 'Sending...' : 'Send reset link →'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/sign-in" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#64748b] text-sm hover:text-[#0a2540] transition-colors">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
