import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { syncContactToHubSpot } from '@/lib/hubspot'
import { submitWaitlistEntry } from '@/lib/notion-waitlist'

// Waitlist wiring pass, 9 Sep 2026 — new signups are paused; this page
// no longer creates real accounts. AUTH LOGIC (src/lib/auth.tsx,
// src/lib/supabase.ts) is untouched per CLAUDE.md §4 — nothing here
// calls supabase.auth.signUp any more, so there's nothing to gate at
// that layer; the account-creation path itself is simply not rendered.
// Same two-step shape kept (role, then details) since the fields are
// the same ones a waitlist entry needs. Submits to all three real
// destinations: Supabase (waitlist_entries — same table and open
// insert policy the footer newsletter form already uses), Notion (the
// new "Lengdon Waitlist" database, src/lib/notion-waitlist.ts), and
// HubSpot (via the existing, already-working syncContactToHubSpot —
// NOT the raw fetch()-to-a-server-fn-route pattern the footer form's
// dead HubSpot call used, which has no real HTTP handler behind it).
// No confirmation email of any kind is sent from here — the "You're on
// the waitlist" state below is the only acknowledgment, per instruction.

export const Route = createFileRoute('/sign-up')({
  head: () => ({
    meta: [
      { title: "Join the waitlist | Lengdon" },
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
  { id: 'founder', label: 'Founder', desc: 'Raising capital or running a deal room' },
  { id: 'investor', label: 'Investor', desc: 'Angel, VC, PE, family office, or syndicate' },
]

function SignUp() {
  const search = useSearch({ from: '/sign-up' })
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role>(search.role ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) { setError('Please select your role.'); return }
    setError('')
    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) {
      setError('Name and email are required.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const { error: dbError } = await supabase.from('waitlist_entries').insert({
        full_name: name,
        email: email.trim().toLowerCase(),
        role: role || null,
        type: 'sign-up page',
      })
      if (dbError) console.error('[sign-up] waitlist insert failed:', dbError)

      const [firstName, ...rest] = name.trim().split(' ')
      await syncContactToHubSpot({
        data: {
          email: email.trim().toLowerCase(),
          properties: {
            firstname: firstName || '',
            lastname: rest.join(' '),
            lifecyclestage: 'lead',
            hs_lead_status: 'NEW',
            ...(role ? { user_type: role === 'founder' ? 'Founder' : 'Investor' } : {}),
          },
        },
      }).catch((e) => console.error('[sign-up] HubSpot sync failed:', e))

      await submitWaitlistEntry({
        data: {
          name,
          email: email.trim().toLowerCase(),
          role: role || undefined,
          source: 'sign-up page',
        },
      }).catch((e) => console.error('[sign-up] Notion submit failed:', e))

      setDone(true)
    } catch (e) {
      console.error('[sign-up] waitlist submission error:', e)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
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
              In beta
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
            We're not onboarding new accounts right now. Join the waitlist and we'll reach out when it's your turn.
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
            Join the waitlist
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
                  {s === 1 ? "Your role" : "Your details"}
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
                    You're on the waitlist
                  </h2>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.65] max-w-[320px]">
                    We've got your details. We'll reach out at <strong>{email}</strong> when we're ready to bring you on.
                  </p>
                </div>
                <div className="w-full border-t border-[#e6e9ef] pt-6">
                  <Link
                    to="/"
                    style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                    className="inline-block bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-10 py-3.5 transition-colors duration-200"
                  >
                    Back to home
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
                    We're not onboarding new accounts right now
                  </h1>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px]">
                    Join the waitlist and we'll reach out. Tell us how you'd use Lengdon.
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
                    We'll use this to reach out when we're ready for you.
                  </p>
                </div>

                <form onSubmit={handleStep2} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-name" style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">
                      Full name
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
                        Joining…
                      </>
                    ) : (
                      "Join the waitlist"
                    )}
                  </button>

                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#c9d0db] text-[12px] leading-[1.6] text-center">
                    By joining the waitlist, you agree to our{" "}
                    <Link to="/legal/terms" className="text-[#94a3b8] hover:text-[#0a2540] transition-colors">Terms</Link>
                    {" "}and{" "}
                    <Link to="/legal/privacy" className="text-[#94a3b8] hover:text-[#0a2540] transition-colors">Privacy Policy</Link>.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
