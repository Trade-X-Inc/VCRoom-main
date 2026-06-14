import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/contact')({
  component: Contact,
})

function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('founder')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name || !email || !message) {
      setError('Please fill in all fields.')
      return
    }
    setSubmitting(true)
    setError('')

    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert({ name, email, role, message })

    if (dbError) {
      setError('Something went wrong. Email us directly at hello@hockystick.app')
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <SiteHeader />
      <main className="max-w-xl mx-auto px-6 py-24">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-12 block">
          ← Back to Hockystick
        </a>

        <p className="text-xs text-[#7C3AED] uppercase tracking-[0.2em] mb-4">
          Contact
        </p>
        <h1 className="font-syne font-bold text-3xl text-white mb-2">
          Get in touch
        </h1>
        <p className="text-white/50 mb-10 text-sm">
          For founders, investors, partnerships, or enterprise enquiries.
        </p>

        {submitted ? (
          <div className="p-6 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-center">
            <p className="text-white font-semibold mb-1">Message received</p>
            <p className="text-white/50 text-sm">
              We'll get back to you within 24 hours.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-[#7C3AED]/50 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-[#7C3AED]/50 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">I am a</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#7C3AED]/50 outline-none transition-colors"
              >
                <option value="founder">Founder</option>
                <option value="investor">Investor</option>
                <option value="accelerator">Accelerator / VC firm</option>
                <option value="enterprise">Enterprise / Platform</option>
                <option value="press">Press</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                placeholder="How can we help?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-[#7C3AED]/50 outline-none transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 bg-[#7C3AED] text-white rounded-xl font-medium text-sm hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending...' : 'Send message'}
            </button>

            <p className="text-xs text-white/30 text-center pt-2">
              Or email directly:{' '}
              <a href="mailto:hello@hockystick.app" className="text-white/50 hover:text-white">
                hello@hockystick.app
              </a>
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
