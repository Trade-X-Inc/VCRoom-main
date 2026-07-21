import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 block">
          ← Back to Hockystick
        </a>

        <p className="text-xs text-brand uppercase tracking-[0.2em] mb-4">
          About
        </p>
        <h1 className="font-syne font-bold text-4xl text-foreground mb-6 leading-tight">
          Fundraising, without the warm intro.<br />
          For founders who don't know the right people.
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed mb-12">
          Most fundraising still runs on who you know. It assumes a warm
          network, an alumni connection, or a prior exit. Most founders,
          almost everywhere, have none of these — and lose deals because
          of it.
        </p>

        <div className="space-y-8 mb-16">
          <div>
            <h2 className="font-syne font-bold text-xl text-foreground mb-3">
              The problem we're solving
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              There is a structural trust gap between founders and
              investors. Founders can't get meetings without warm intros.
              Investors receive hundreds of pitch decks with no way to
              verify what's real. Both sides lose. Deals don't close.
              Good companies don't get funded.
            </p>
          </div>

          <div>
            <h2 className="font-syne font-bold text-xl text-foreground mb-3">
              What Hockystick does
            </h2>
            <p className="text-muted-foreground leading-relaxed">
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
            <h2 className="font-syne font-bold text-xl text-foreground mb-3">
              Where we're based
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Hockystick is a global platform, headquartered at DIFC FinTech
              Hive in Dubai. Founders and investors from any jurisdiction can
              use it — the platform is built for anyone raising or deploying
              capital, wherever they are based.
            </p>
          </div>

          <div>
            <h2 className="font-syne font-bold text-xl text-foreground mb-3">
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
                  <span className="text-brand mt-0.5">✦</span>
                  <p className="text-muted-foreground text-sm leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-syne font-bold text-xl text-foreground mb-3">
              Who built this
            </h2>
            <p className="text-muted-foreground leading-relaxed">
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
          <a href="/sign-up?role=founder"
            className="px-6 py-3 rounded-[2px] text-sm font-semibold text-center"
            style={{ background: "#7C3AED", color: "#FFFFFF" }}>
            Create your account →
          </a>
          <a href="/pricing"
            className="px-6 py-3 border border-[#E4E4E7] rounded-[2px] text-sm font-medium text-[#0A0A0B] hover:bg-[#FAFAFA] transition-colors text-center">
            See what&rsquo;s inside →
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
