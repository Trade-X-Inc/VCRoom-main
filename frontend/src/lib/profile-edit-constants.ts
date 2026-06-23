// Pure constants — no imports, no side effects, safe to import from route files.
// profile-edit-fn.ts imports these for its server functions.
// app.index.tsx imports these for the ProfileEditPanel component.
// Kept separate so route files never share a chunk initialization boundary
// with createServerFn declarations.

export const EDITABLE_STARTUP_FIELDS: Record<string, { label: string; multiline: boolean }> = {
  company_name:          { label: "Company name",          multiline: false },
  tagline:               { label: "Tagline",               multiline: false },
  description:           { label: "Description",           multiline: true  },
  sector:                { label: "Sector",                multiline: false },
  stage:                 { label: "Stage",                 multiline: false },
  country:               { label: "Country",               multiline: false },
  website:               { label: "Website",               multiline: false },
  problem:               { label: "Problem",               multiline: true  },
  solution:              { label: "Solution",              multiline: true  },
  traction:              { label: "Traction",              multiline: true  },
  business_model:        { label: "Business model",        multiline: true  },
  use_of_funds:          { label: "Use of funds",          multiline: true  },
  market_size:           { label: "Market size",           multiline: false },
  competitive_advantage: { label: "Competitive advantage", multiline: true  },
  why_now:               { label: "Why now",               multiline: true  },
  why_us:                { label: "Why us",                multiline: true  },
  key_metric:            { label: "Key metric",            multiline: false },
  growth_rate:           { label: "Growth rate",           multiline: false },
  customer_count:        { label: "Customer count",        multiline: false },
  target_customer:       { label: "Target customer",       multiline: true  },
  revenue_model:         { label: "Revenue model",         multiline: true  },
  moat:                  { label: "Moat",                  multiline: true  },
  milestones:            { label: "Milestones",            multiline: true  },
  team_size:             { label: "Team size",             multiline: false },
  funding_target:        { label: "Funding target ($)",    multiline: false },
};

export const EDITABLE_THESIS_FIELDS: Record<string, { label: string; multiline: boolean }> = {
  preferred_check_size_min:  { label: "Min check size",             multiline: false },
  preferred_check_size_max:  { label: "Max check size",             multiline: false },
  preferred_investor_type:   { label: "Investor type preference",   multiline: false },
  board_preference:          { label: "Involvement preference",      multiline: false },
  sector_expertise_wanted:   { label: "Sector expertise wanted",    multiline: false },
  geography_preference:      { label: "Geography preference",       multiline: false },
  exclusions:                { label: "Exclusions / red lines",     multiline: true  },
  what_good_fit_looks_like:  { label: "What a great fit looks like", multiline: true },
};
