import type { DocPage } from "../primitives";
import { A, Callout, DocTable, H2, Lead, P, Rules } from "../primitives";

const UPDATED = "2026-07-08";

export const TOOLS_PAGES: Record<string, DocPage> = {
  // ── /docs/tools ───────────────────────────────────────────────────────────
  "tools": {
    meta: {
      slug: "tools",
      title: "Financial calculators",
      description:
        "Hockystick's seven free financial calculators: valuation, burn rate, runway, cap table, dilution, COGS, and SAFE notes.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "calculators", label: "The calculators" },
        { id: "rules", label: "How they behave" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Hockystick includes seven financial calculators, free to use with or without an account.
          They exist because the numbers they produce — valuation ranges, runway, dilution — are
          exactly the numbers founders need before walking into the conversations the rest of the
          platform hosts.
        </Lead>

        <H2 id="calculators">The calculators</H2>
        <DocTable
          head={["Calculator", "URL", "What it computes"]}
          rows={[
            [
              "Valuation",
              <A href="/tools/valuation">/tools/valuation</A>,
              "Pre-money valuation range via three methods side by side: VC method, revenue multiples, and Berkus",
            ],
            [
              "Burn rate",
              <A href="/tools/burn-rate">/tools/burn-rate</A>,
              "Gross and net monthly burn from expense and revenue inputs",
            ],
            [
              "Runway",
              <A href="/tools/runway">/tools/runway</A>,
              "Months of runway from cash and burn, with growth-scenario modeling",
            ],
            [
              "Cap table",
              <A href="/tools/cap-table">/tools/cap-table</A>,
              "Ownership breakdown across founders, investors, and option pool",
            ],
            [
              "Dilution",
              <A href="/tools/dilution">/tools/dilution</A>,
              "Ownership impact of a new round across existing shareholders",
            ],
            [
              "COGS",
              <A href="/tools/cogs">/tools/cogs</A>,
              "Cost of goods sold breakdown and gross margin",
            ],
            [
              "SAFE note",
              <A href="/tools/safe-note">/tools/safe-note</A>,
              "SAFE conversion math — caps, discounts, and resulting ownership at the priced round",
            ],
          ]}
        />

        <H2 id="rules">How they behave</H2>
        <Rules
          items={[
            <>All calculation runs in your browser. Inputs are not transmitted or stored — closing the tab discards them.</>,
            <>No sign-up wall. The calculators are public pages.</>,
            <>Results can be downloaded as a PDF for sharing or record-keeping.</>,
            <>These are deliberately human-driven pages — there is no AI in the calculators. Formulas are stated, inputs are yours, arithmetic is arithmetic.</>,
          ]}
        />
        <Callout>
          Calculator outputs are estimates from the model each tool states — useful for
          preparation and sanity checks, not a substitute for financial or legal advice on a live
          transaction.
        </Callout>
      </>
    ),
  },
};
