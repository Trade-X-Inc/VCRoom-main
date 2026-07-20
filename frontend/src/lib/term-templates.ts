// R15A — Instrument-type term templates (config, not hardcoded JSX).
//
// Each of the four supported instrument types exports an ordered array of term
// definitions. These are STARTING templates: both parties can add custom terms
// beyond this set (deal_room_terms.is_custom = true). The negotiation UI renders
// one interactive row per term from this config plus any custom rows.
//
// value_type drives input rendering and formatting only — it does not gate
// negotiation. It matches the deal_room_terms.value_type CHECK constraint
// ('currency' | 'percentage' | 'boolean' | 'text' | 'date' | 'number').

export type InstrumentType = "safe" | "equity" | "debt" | "company_sale";

export type TermValueType =
  | "currency"
  | "percentage"
  | "boolean"
  | "text"
  | "date"
  | "number";

export interface TermDefinition {
  term_key: string;
  label: string;
  description: string;
  value_type: TermValueType;
}

export interface InstrumentTemplate {
  type: InstrumentType;
  label: string;
  description: string;
  terms: TermDefinition[];
}

const SAFE: InstrumentTemplate = {
  type: "safe",
  label: "SAFE",
  description: "Simple Agreement for Future Equity — converts to shares at a later priced round.",
  terms: [
    { term_key: "valuation_cap", label: "Valuation cap", description: "Maximum valuation at which the SAFE converts to equity.", value_type: "currency" },
    { term_key: "discount_rate", label: "Discount rate", description: "Discount to the next round's price the SAFE holder receives.", value_type: "percentage" },
    { term_key: "pro_rata_rights", label: "Pro-rata rights", description: "Right to invest in future rounds to maintain ownership percentage.", value_type: "boolean" },
    { term_key: "mfn_clause", label: "MFN clause", description: "Most-favoured-nation: right to adopt better terms offered to later SAFE holders.", value_type: "boolean" },
  ],
};

const EQUITY: InstrumentTemplate = {
  type: "equity",
  label: "Equity",
  description: "Priced equity round — shares issued at an agreed valuation.",
  terms: [
    { term_key: "pre_money_valuation", label: "Pre-money valuation", description: "Company valuation before the new investment.", value_type: "currency" },
    { term_key: "share_price", label: "Share price", description: "Price per share for the new issuance.", value_type: "currency" },
    { term_key: "board_seats", label: "Board seats", description: "Number of board seats granted to the investor.", value_type: "number" },
    { term_key: "liquidation_preference", label: "Liquidation preference", description: "Payout priority and multiple on a liquidity event (e.g. 1x non-participating).", value_type: "text" },
    { term_key: "anti_dilution", label: "Anti-dilution", description: "Protection against future down-rounds (e.g. broad-based weighted average).", value_type: "text" },
    { term_key: "vesting_schedule", label: "Vesting schedule", description: "Founder/employee equity vesting terms (e.g. 4 years, 1-year cliff).", value_type: "text" },
    { term_key: "drag_along_tag_along", label: "Drag-along / tag-along", description: "Rights governing forced and co-sale in an exit.", value_type: "text" },
  ],
};

const DEBT: InstrumentTemplate = {
  type: "debt",
  label: "Debt",
  description: "Loan or convertible note — principal repaid with interest, may convert to equity.",
  terms: [
    { term_key: "principal_amount", label: "Principal amount", description: "The loan principal advanced to the company.", value_type: "currency" },
    { term_key: "interest_rate", label: "Interest rate", description: "Annual interest rate on the outstanding principal.", value_type: "percentage" },
    { term_key: "maturity_date", label: "Maturity date", description: "Date the loan must be repaid or converted.", value_type: "date" },
    { term_key: "conversion_terms", label: "Conversion terms", description: "Whether and how the debt converts to equity (cap, discount, trigger).", value_type: "text" },
    { term_key: "security_collateral", label: "Security / collateral", description: "Assets pledged as security for the loan, if any.", value_type: "text" },
    { term_key: "covenants", label: "Covenants", description: "Ongoing obligations or restrictions on the company.", value_type: "text" },
  ],
};

const COMPANY_SALE: InstrumentTemplate = {
  type: "company_sale",
  label: "Company Sale (M&A)",
  description: "Acquisition of the company — negotiated identically to any other instrument.",
  terms: [
    { term_key: "purchase_price", label: "Purchase price", description: "Total consideration for the acquisition.", value_type: "currency" },
    { term_key: "payment_structure", label: "Payment structure", description: "Mix of cash, stock, or both, and timing.", value_type: "text" },
    { term_key: "earnout_terms", label: "Earnout terms", description: "Performance-based deferred consideration, if any.", value_type: "text" },
    { term_key: "retention_non_compete", label: "Retention / non-compete", description: "Founder/key-employee retention and non-compete obligations.", value_type: "text" },
    { term_key: "asset_vs_share_sale", label: "Asset vs share sale", description: "Whether the deal is structured as an asset purchase or a share purchase.", value_type: "text" },
    { term_key: "reps_warranties_scope", label: "Representations & warranties scope", description: "Scope of the seller's representations and warranties.", value_type: "text" },
    { term_key: "indemnification_cap", label: "Indemnification cap", description: "Maximum seller liability under indemnification.", value_type: "currency" },
  ],
};

export const INSTRUMENT_TEMPLATES: Record<InstrumentType, InstrumentTemplate> = {
  safe: SAFE,
  equity: EQUITY,
  debt: DEBT,
  company_sale: COMPANY_SALE,
};

export const INSTRUMENT_ORDER: InstrumentType[] = ["safe", "equity", "debt", "company_sale"];

export function getTemplate(type: InstrumentType): InstrumentTemplate {
  return INSTRUMENT_TEMPLATES[type];
}

/** Format a raw stored value for display based on its declared value_type. */
export function formatTermValue(value: string | null | undefined, valueType: TermValueType): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (valueType) {
    case "boolean":
      return value === "true" ? "Yes" : value === "false" ? "No" : value;
    case "percentage":
      return /%$/.test(value) ? value : `${value}%`;
    default:
      return value;
  }
}
