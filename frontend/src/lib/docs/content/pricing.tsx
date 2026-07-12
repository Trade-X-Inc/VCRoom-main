import type { DocPage } from "../primitives";
import { A, Callout, DocTable, H2, Lead, P } from "../primitives";

const UPDATED = "2026-07-12";

export const PRICING_PAGES: Record<string, DocPage> = {
  // ── /docs/pricing ─────────────────────────────────────────────────────────
  "pricing": {
    meta: {
      slug: "pricing",
      title: "Pricing & plans",
      description:
        "The six Hockystick plans, the 1.5% success fee, and what 'by invitation' means for investors. Honest numbers, no hidden tiers.",
      updated: UPDATED,
      toc: [
        { id: "model", label: "The model" },
        { id: "founder-plans", label: "Founder plans" },
        { id: "investor-plans", label: "Investor plans" },
        { id: "success-fee", label: "The success fee" },
        { id: "invitation", label: "Investor access by invitation" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Hockystick charges founders, not investors' wallets-by-data: the platform's job is to
          make founders fundable, so founders pay a subscription and a success fee only when a
          round actually closes. Full live comparison at <A href="/pricing">hockystick.app/pricing</A>.
        </Lead>

        <H2 id="model">The model</H2>
        <P>
          Six plans — three founder tiers, three investor tiers — plus pay-as-you-go add-ons
          (extra deal rooms and team seats at $5/month each) and a success fee on closed rounds.
          Every plan starts with a 30-day free trial, no credit card required. Founder data is
          never sold; investors pay for tooling, not for access to founder information.
        </P>

        <H2 id="founder-plans">Founder plans</H2>
        <DocTable
          head={["Plan", "Price", "Deal rooms", "Team", "AI calls/mo"]}
          rows={[
            ["Founder Starter", "$19/month", "3", "1", "100"],
            ["Founder Pro", "$49/month", "13", "3", "500"],
            ["Founder Scale", "$199/month", "30", "5", "Unlimited"],
          ]}
        />
        <P>
          All founder plans include verification — the trust layer is never paywalled. Pro and
          Scale add full AI access; Scale includes a free Founder Roast seat.
        </P>

        <H2 id="investor-plans">Investor plans</H2>
        <DocTable
          head={["Plan", "Price", "Deal rooms", "Team", "AI calls/mo"]}
          rows={[
            ["Investor Growth", "$99/month", "50", "3", "500"],
            ["Investor Pro", "$299/month", "150", "10", "Unlimited"],
            ["Enterprise", "$1,999/month", "Unlimited", "20", "Unlimited"],
          ]}
        />

        <H2 id="success-fee">The success fee</H2>
        <P>
          When a round closes through a Hockystick deal room, the platform charges a success fee
          of <strong>1.5% of the closed amount — minimum $500, maximum $15,000</strong>. The cap
          matters: on a $5M round the fee is $15K, not $75K. The fee funds the parts of the
          platform that make closing possible — verification infrastructure, the NDA framework,
          and the confrontational due-diligence engine — and aligns Hockystick's incentive with
          the founder's: we only earn meaningfully when you close.
        </P>

        <H2 id="invitation">Investor access by invitation</H2>
        <P>
          During beta, investor accounts are granted by application rather than open signup. Each
          applicant's fund, thesis, and active deal mandate are reviewed before access. This is
          deliberate: founders share sensitive material on Hockystick, and the value of the
          network to them depends on every investor on it being real and actively deploying.
        </P>
        <Callout>
          Applying is free and takes minutes — the review is about who you are, not what you pay.
          Apply from <A href="/pricing">the pricing page</A>.
        </Callout>
      </>
    ),
  },
};
