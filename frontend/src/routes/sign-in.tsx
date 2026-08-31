import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// Content/wiring pass, 31 Aug 2026 — pixel-exact port of
// lengdon-public-new/src/pages/auth/SignIn.tsx (the founder's Figma
// export, which does have a sign-in page — this route was not built in
// the earlier full-site rebuild and is filled in now). Two-panel
// layout (brand panel + form) reproduced exactly, including the live
// audit-log preview strip.
//
// AUTH LOGIC UNCHANGED, per instruction ("wire to the real existing
// Supabase auth... do not change auth logic, only the UI") and CLAUDE.md
// §4 (src/lib/auth.tsx and src/lib/supabase.ts require confirmation to
// touch — neither was touched; only this route file's presentation was
// rebuilt). Every auth call is the prior implementation, verbatim:
// supabase.auth.signInWithPassword, supabase.auth.signInWithOAuth
// (google, redirectTo /auth/callback), the post-login users.role lookup,
// and the founder/investor redirect split.
//
// Crypto vocabulary fixed per the sitewide rule: source's "encrypted,
// and sealed at close" / "Neither can revoke the other's copy" kept as
// factual (encryption is real, revocation-proof sealing describes the
// append-only record's real property) but "sealed" as a delivered
// export claim was not part of this source paragraph to begin with —
// left as-is; the audit-log preview uses real reference-number format
// (not the source's #0017-style bare sequence) per the established
// pattern on /product/security and the homepage.

export const Route = createFileRoute('/sign-in')({
  head: () => ({
    meta: [
      { title: "Sign in | Lengdon" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignIn
})

const AUDIT_PREVIEW = [
  { ref: "ATLS01-ROM-2026-000017-91", action: "Condition Met: Regulatory Approval", ts: "14:32" },
  { ref: "ATLS01-ROM-2026-000018-88", action: "Term Accepted: Board Seat", ts: "15:45" },
  { ref: "ATLS01-ROM-2026-000019-85", action: "Document Released: Cap Table", ts: "09:12" },
]

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
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col w-[480px] xl:w-[540px] shrink-0 bg-[#0a2540] relative overflow-hidden px-14 py-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <Link to="/" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="relative z-10 font-semibold text-white text-[22px] tracking-[-0.5px] mb-auto">
          Lengdon
        </Link>

        <div className="relative z-10 mb-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-5 h-px bg-white/20" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">
              Closing Infrastructure
            </span>
          </div>

          <h2
            style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(48px, 5vw, 72px)" }}
            className="font-semibold text-white leading-[0.88] tracking-[-3px] mb-8"
          >
            THE RECORD<br />
            <span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.45)", color: "transparent" }}>
              IS YOURS.
            </span>
          </h2>

          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/50 text-[15px] leading-[1.75] max-w-[340px]">
            Every action taken in your transaction room is recorded and encrypted. Both parties receive the same append-only record — neither can revoke the other's copy.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-8">
          <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/20 text-[10px] tracking-[2px] uppercase mb-4">
            Audit log · Live
          </div>
          {AUDIT_PREVIEW.map((row) => (
            <div key={row.ref} className="flex items-center gap-3 py-2 border-b border-white/6 last:border-b-0">
              <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/40 text-[12px] flex-1 truncate">{row.action}</span>
              <span className="font-mono text-white/18 text-[10px] shrink-0">{row.ts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between px-10 h-16 border-b border-[#e6e9ef] shrink-0">
          <Link to="/" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="lg:hidden font-semibold text-[#0a2540] text-[18px] tracking-[-0.4px]">
            Lengdon
          </Link>
          <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="hidden lg:block text-[#94a3b8] text-[13px]">
            Sign in to your account
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px]">
              No account?
            </span>
            <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[13px] hover:opacity-60 transition-opacity">
              Create one →
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-[400px]">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-4 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] tracking-[2.5px] uppercase text-[#94a3b8]">
                  Welcome back
                </span>
              </div>
              <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[36px] leading-[1.0] tracking-[-1.5px]">
                Sign in
              </h1>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px] mt-2">
                Access your transaction rooms and records.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="signin-email" style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">
                  Email address
                </label>
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@firm.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                  className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors duration-150"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="signin-password" style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">
                    Password
                  </label>
                  <Link to="/forgot-password" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[12px] text-[#94a3b8] hover:text-[#0a2540] transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                  className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors duration-150"
                />
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50 px-4 py-3">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-red-700 text-[13px]">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                className="mt-2 bg-[#0a2540] hover:bg-[#13233a] disabled:opacity-50 text-white font-semibold text-[14px] py-4 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-[#e6e9ef]" />
              <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#c9d0db] text-[12px]">or</span>
              <div className="flex-1 h-px bg-[#e6e9ef]" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              style={{ fontFamily: "'Inter:Regular', sans-serif" }}
              className="w-full border border-[#e6e9ef] hover:border-[#0a2540]/20 hover:bg-[#f8f9fb] text-[#425466] text-[14px] py-3.5 transition-all duration-150 flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="7" height="7" fill="#EA4335" />
                <rect x="10" y="1" width="7" height="7" fill="#4285F4" />
                <rect x="1" y="10" width="7" height="7" fill="#34A853" />
                <rect x="10" y="10" width="7" height="7" fill="#FBBC04" />
              </svg>
              Continue with Google
            </button>

            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="mt-8 text-[#c9d0db] text-[12px] leading-[1.6] text-center">
              By signing in, you agree to our{" "}
              <Link to="/legal/terms" className="text-[#94a3b8] hover:text-[#0a2540] transition-colors">Terms</Link>
              {" "}and{" "}
              <Link to="/legal/privacy" className="text-[#94a3b8] hover:text-[#0a2540] transition-colors">Privacy Policy</Link>.
            </p>

            <div className="mt-8 border border-[#e6e9ef] bg-[#f8f9fb] p-5">
              <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[14px] tracking-[-0.3px] mb-1">
                New to Lengdon?
              </div>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px] mb-4 leading-[1.55]">
                Free to start. Your first transaction room is open the moment you sign up.
              </p>
              <Link
                to="/sign-up"
                style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                className="block w-full text-center border border-[#0a2540] hover:bg-[#0a2540] hover:text-white text-[#0a2540] font-semibold text-[13px] py-3 transition-all duration-200"
              >
                Create free account →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
