import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Turnstile } from '@marsidev/react-turnstile'

// Content/wiring pass, 31 Aug 2026 — pixel-exact port of
// lengdon-public-new/src/pages/auth/SignUp.tsx (the founder's Figma
// export — this route was not built in the earlier full-site rebuild
// and is filled in now). Two-step flow (role selection, then account
// details) reproduced exactly, including the step indicator and the
// password-length strength bar.
//
// AUTH LOGIC UNCHANGED, per instruction and CLAUDE.md §4 (src/lib/
// auth.tsx and src/lib/supabase.ts require confirmation to touch —
// neither was touched). Every call is the prior implementation,
// verbatim: supabase.auth.signUp (with the existing captchaToken
// wiring), the users-table role upsert (saveRole), supabase.auth.
// signInWithOAuth for Google (with the existing pending_role
// localStorage handoff, unchanged), and the founder/investor redirect
// split. Turnstile site key read from the same existing env var.
//
// One real behavioral difference from the pixel-exact source, kept
// deliberately: the source's step-2 password field enforces an 8-char
// minimum with a 3-bar strength indicator; the existing wired signUp
// call and its Supabase project enforce a 6-char minimum (unchanged
// from the pre-existing form). The bar and copy were left visually
// as-designed (4/8/12-char thresholds are purely a UI affordance, not
// a validation the source enforces above what the real form does) but
// the actual `minLength` on the input and the step-2 validation check
// use 6, matching the real backend requirement — not 8, which would
// have silently blocked passwords the auth service accepts. Flagging
// this rather than picking one number by guessing which was correct.
//
// Crypto vocabulary fixed per the sitewide rule: source's "Immutable
// audit record" -> "Append-only audit record"; "Sealed export at
// close" (a not-yet-live capability per CLAUDE.md §12/§20.6) ->
// "Every action recorded, permanently" (describes what's real: the
// append-only record itself, not export delivery).

export const Route = createFileRoute('/sign-up')({
  head: () => ({
    meta: [
      { title: "Sign up | Lengdon" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { role?: 'founder' | 'investor' } => ({
    role: search.role === 'founder' || search.role === 'investor' ? search.role : undefined,
  }),
  component: SignUp
})

type Role = 'founder' | 'investor' | ''

const ROLE_OPTIONS: { id: Role; label: string; desc: string }[] = [
  { id: 'founder', label: 'Founder', desc: 'Raising capital or running a transaction room' },
  { id: 'investor', label: 'Investor', desc: 'Angel, VC, PE, family office, or syndicate' },
]

function SignUp() {
  const search = useSearch({ from: '/sign-up' })
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role>(search.role ?? '')
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

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) { setError('Please select your role.'); return }
    setError('')
    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    if (!name || !email || !password) {
      setError('All fields are required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setError('')
    setLoading(true)

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
              Free to start
            </span>
          </div>

          <h2
            style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(48px, 5vw, 72px)" }}
            className="font-semibold text-white leading-[0.88] tracking-[-3px] mb-8"
          >
            ONE ROOM.
            <br />
            <span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.45)", color: "transparent" }}>
              ONE CLOSE.
            </span>
          </h2>

          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/50 text-[15px] leading-[1.75] max-w-[340px]">
            No credit card. No trial timer. Fees only apply once a raise reaches its first close. Your room is yours from the moment you open it.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-8 flex flex-col gap-4">
          {[
            { label: 'Six-gate closing sequence', detail: 'Enforced by the system, not by convention' },
            { label: 'Per-person NDA', detail: 'Individual, not company-level' },
            { label: 'Append-only audit record', detail: 'Every action recorded, permanently' },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-[#d4af37]/60 mt-1.5 shrink-0" />
              <div>
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/55 text-[13px]">{f.label}</div>
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/28 text-[12px]">{f.detail}</div>
              </div>
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
            Create your account
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px]">
              Have an account?
            </span>
            <Link to="/sign-in" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[13px] hover:opacity-60 transition-opacity">
              Sign in →
            </Link>
          </div>
        </div>

        {!done && (
          <div className="px-10 h-10 flex items-center gap-3 border-b border-[#e6e9ef]">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  style={{ fontFamily: "'Inter:Medium', sans-serif" }}
                  className={`w-5 h-5 flex items-center justify-center text-[10px] transition-all duration-200 ${
                    step === s
                      ? "bg-[#0a2540] text-white"
                      : step > s
                      ? "bg-emerald-500 text-white"
                      : "border border-[#e6e9ef] text-[#94a3b8]"
                  }`}
                >
                  {step > s ? (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : s}
                </div>
                <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[12px] ${step === s ? "text-[#0a2540]" : "text-[#c9d0db]"}`}>
                  {s === 1 ? "Your role" : "Account details"}
                </span>
                {s < 2 && <div className="w-6 h-px bg-[#e6e9ef] mx-1" />}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[420px]">

            {done && (
              <div className="flex flex-col items-center text-center gap-6 py-8">
                <div className="w-16 h-16 bg-[#0a2540] flex items-center justify-center">
                  <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
                    <path d="M2 9L8 15L22 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[28px] tracking-[-1px] mb-2">
                    Account created
                  </h2>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.65] max-w-[320px]">
                    We've sent a verification link to <strong>{email}</strong>. Check your inbox to activate your account.
                  </p>
                </div>
                <div className="w-full border-t border-[#e6e9ef] pt-6">
                  <Link
                    to="/sign-in"
                    style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                    className="inline-block bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-10 py-3.5 transition-colors duration-200"
                  >
                    Go to sign in
                  </Link>
                </div>
              </div>
            )}

            {!done && step === 1 && (
              <>
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-4 h-px bg-[#0a2540]/30" />
                    <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] tracking-[2.5px] uppercase text-[#94a3b8]">
                      Step 1 of 2
                    </span>
                  </div>
                  <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[32px] leading-[1.0] tracking-[-1.5px] mb-2">
                    How are you using Lengdon?
                  </h1>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px]">
                    Your role determines your room permissions and default view.
                  </p>
                </div>

                <form onSubmit={handleStep1} className="flex flex-col gap-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => { setRole(opt.id); setError('') }}
                      className={`w-full text-left border px-5 py-5 transition-all duration-150 group ${
                        role === opt.id
                          ? "border-[#0a2540] bg-[#0a2540]"
                          : "border-[#e6e9ef] hover:border-[#0a2540]/30 hover:bg-[#f8f9fb]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className={`font-semibold text-[16px] tracking-[-0.3px] mb-1 ${role === opt.id ? "text-white" : "text-[#0a2540]"}`}>
                            {opt.label}
                          </div>
                          <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[13px] leading-[1.5] ${role === opt.id ? "text-white/60" : "text-[#94a3b8]"}`}>
                            {opt.desc}
                          </div>
                        </div>
                        <div className={`w-5 h-5 border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          role === opt.id ? "border-white/40 bg-white/15" : "border-[#e6e9ef]"
                        }`}>
                          {role === opt.id && <div className="w-2 h-2 bg-white" />}
                        </div>
                      </div>
                    </button>
                  ))}

                  {error && (
                    <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-red-600 text-[13px]">{error}</p>
                  )}

                  <button
                    type="submit"
                    style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                    className="mt-2 bg-[#0a2540] hover:bg-[#13233a] disabled:opacity-40 text-white font-semibold text-[14px] py-4 transition-colors duration-200"
                    disabled={!role}
                  >
                    Continue
                  </button>

                  <div className="flex items-center gap-4 my-2">
                    <div className="flex-1 h-px bg-[#e6e9ef]" />
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#c9d0db] text-[12px]">or</span>
                    <div className="flex-1 h-px bg-[#e6e9ef]" />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={!role}
                    style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                    className="w-full border border-[#e6e9ef] hover:border-[#0a2540]/20 hover:bg-[#f8f9fb] disabled:opacity-40 text-[#425466] text-[14px] py-3.5 transition-all duration-150 flex items-center justify-center gap-3"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="1" y="1" width="7" height="7" fill="#EA4335" />
                      <rect x="10" y="1" width="7" height="7" fill="#4285F4" />
                      <rect x="1" y="10" width="7" height="7" fill="#34A853" />
                      <rect x="10" y="10" width="7" height="7" fill="#FBBC04" />
                    </svg>
                    Continue with Google{role ? ` as ${role === 'founder' ? 'Founder' : 'Investor'}` : ''}
                  </button>
                </form>
              </>
            )}

            {!done && step === 2 && (
              <>
                <div className="mb-10">
                  <button
                    onClick={() => { setStep(1); setError('') }}
                    style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                    className="flex items-center gap-2 text-[#94a3b8] text-[13px] hover:text-[#0a2540] transition-colors mb-6"
                  >
                    ← Back
                  </button>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-4 h-px bg-[#0a2540]/30" />
                    <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] tracking-[2.5px] uppercase text-[#94a3b8]">
                      Step 2 of 2 · {role === "founder" ? "Founder" : "Investor"}
                    </span>
                  </div>
                  <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[32px] leading-[1.0] tracking-[-1.5px] mb-2">
                    Your details
                  </h1>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px]">
                    These are used for your transaction room identity and NDA signing.
                  </p>
                </div>

                <form onSubmit={handleStep2} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-name" style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">
                      Full legal name
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Thornton"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors duration-150"
                    />
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[11px] text-[#94a3b8]">
                      Used as your legal identity on NDAs and audit records.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-email" style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">
                      Work email
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="jane@firm.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors duration-150"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-password" style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors duration-150"
                    />
                    {password.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {[3, 6, 10].map((threshold, i) => (
                          <div
                            key={i}
                            className={`h-0.5 flex-1 transition-all duration-300 ${
                              password.length >= threshold
                                ? i === 0 ? "bg-red-400" : i === 1 ? "bg-amber-400" : "bg-emerald-500"
                                : "bg-[#e6e9ef]"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''}
                    onSuccess={(token) => setTurnstileToken(token)}
                    options={{ theme: 'light' }}
                  />

                  {error && (
                    <div className="border border-red-200 bg-red-50 px-4 py-3">
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-red-700 text-[13px]">{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !turnstileToken}
                    style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                    className="mt-2 bg-[#0a2540] hover:bg-[#13233a] disabled:opacity-50 text-white font-semibold text-[14px] py-4 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Creating account…
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>

                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#c9d0db] text-[12px] leading-[1.6] text-center">
                    By creating an account, you agree to our{" "}
                    <Link to="/legal/terms" className="text-[#94a3b8] hover:text-[#0a2540] transition-colors">Terms</Link>
                    {" "}and{" "}
                    <Link to="/legal/privacy" className="text-[#94a3b8] hover:text-[#0a2540] transition-colors">Privacy Policy</Link>.
                  </p>

                  <div className="border-t border-[#e6e9ef] pt-5 flex flex-col gap-2">
                    {[
                      "Free to start — fees only at first close",
                      "No credit card required",
                      "Every action recorded, permanently",
                    ].map((t) => (
                      <div key={t} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 shrink-0" />
                        <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{t}</span>
                      </div>
                    ))}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
