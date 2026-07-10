import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-12 block">
          ← Back to Hockystick
        </a>

        <p className="text-xs text-[#7C3AED] uppercase tracking-[0.2em] mb-4">
          About
        </p>
        <h1 className="font-syne font-bold text-4xl text-white mb-6 leading-tight">
          Built in Dubai.<br />
          For the founders who don't know the right people.
        </h1>
        <p className="text-white/60 text-lg leading-relaxed mb-12">
          Most fundraising platforms are built for Silicon Valley.
          They assume you have a warm network, a Stanford alumni
          connection, or a prior exit. Most MENA founders have none
          of these.
        </p>

        <div className="space-y-8 mb-16">
          <div>
            <h2 className="font-syne font-bold text-xl text-white mb-3">
              The problem we're solving
            </h2>
            <p className="text-white/60 leading-relaxed">
              The GCC has a structural trust gap between founders and
              investors. Founders can't get meetings without warm intros.
              Investors receive hundreds of pitch decks with no way to
              verify what's real. Both sides lose. Deals don't close.
              Good companies don't get funded.
            </p>
          </div>

          <div>
            <h2 className="font-syne font-bold text-xl text-white mb-3">
              What Hockystick does
            </h2>
            <p className="text-white/60 leading-relaxed">
              Hockystick replaces the pitch deck with a verified founder
              profile. Investors browse structured, AI-reviewed profiles
              with staged access to documents — from public overview to
              full due diligence — all inside encrypted deal rooms.
              Both founders and investors are verified. The platform
              manufactures trust at scale, without requiring either
              side to know each other first.
            </p>
          </div>

          <div>
            <h2 className="font-syne font-bold text-xl text-white mb-3">
              Where we're based
            </h2>
            <p className="text-white/60 leading-relaxed">
              Hockystick is based at DIFC FinTech Hive, Dubai —
              the region's leading financial technology hub.
              We are GCC-first and global by design. Our platform
              is built for MENA founders raising from regional and
              international investors.
            </p>
          </div>

          <div>
            <h2 className="font-syne font-bold text-xl text-white mb-3">
              Our principles
            </h2>
            <div className="space-y-3">
              {[
                'We only claim what we can prove. Wrong information in investment contexts is worse than none.',
                'Two-way verification. We verify investors too — not just founders.',
                'Staged access. Sensitive documents only unlock when trust is established.',
                'No warm intros required. Merit replaces connections.',
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[#7C3AED] mt-0.5">✦</span>
                  <p className="text-white/60 text-sm leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-syne font-bold text-xl text-white mb-3">
              Who built this
            </h2>
            <p className="text-white/60 leading-relaxed">
              Hockystick is built by a small team operating from DIFC FinTech Hive,
              Dubai. We are in beta, and we say so. Every number on our site is a real
              platform figure, every verification check runs against live registries,
              and every NDA is DIAC-arbitrated. We would rather earn trust slowly with
              working infrastructure than borrow it with logos and press releases.
              Questions about how anything works — verification, deal rooms, data
              handling — reach us at hello@hockystick.app and we answer directly.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a href="/trust"
            className="px-6 py-3 border border-white/15 rounded-xl text-sm text-white/70 hover:border-white/30 hover:text-white transition-colors text-center">
            How our verification works →
          </a>
          <a href="/contact"
            className="px-6 py-3 bg-[#7C3AED] rounded-xl text-sm text-white hover:bg-[#6d28d9] transition-colors text-center">
            Get in touch →
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
