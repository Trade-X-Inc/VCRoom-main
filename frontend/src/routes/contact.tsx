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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-xl mx-auto px-6 py-24">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 block">
          ← Back to Hockystick
        </a>

        <p className="text-xs text-brand uppercase tracking-[0.2em] mb-4">
          Contact
        </p>
        <h1 className="font-syne font-bold text-3xl text-foreground mb-2">
          Get in touch
        </h1>
        <p className="text-muted-foreground mb-10 text-sm">
          For founders, investors, partnerships, or enterprise enquiries.
        </p>

        {submitted ? (
          <div className="p-6 rounded-lg border border-brand/30 bg-accent text-center">
            <p className="text-foreground font-semibold mb-1">Message received</p>
            <p className="text-muted-foreground text-sm">
              We'll get back to you within 24 hours.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-accent border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-faint focus:border-brand/50 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-accent border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-faint focus:border-brand/50 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">I am a</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:border-brand/50 outline-none transition-colors"
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
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                placeholder="How can we help?"
                className="w-full bg-accent border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-faint focus:border-brand/50 outline-none transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 hs-gradient text-foreground rounded-lg font-medium text-sm hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending...' : 'Send message'}
            </button>

            <p className="text-xs text-faint text-center pt-2">
              Or email directly:{' '}
              <a href="mailto:hello@hockystick.app" className="text-muted-foreground hover:text-foreground">
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
