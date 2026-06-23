import requiredFieldsJson from "../../../shared/investor-required-fields.json";

export type ProfileBuilderSession = {
  id?: string;
  status: string;
  path?: string | null;
  missing_fields?: string[] | null;
};

export type InvestorProfile = {
  id?: string;
  user_id?: string;
  fund_name?: string | null;
  your_name?: string | null;
  thesis?: string | null;
  sectors?: string | null;
  stages?: string | null;
  check_size_min?: string | null;
  check_size_max?: string | null;
  geography?: string | null;
  [key: string]: unknown;
};

export type CompletenessResult = {
  isComplete: boolean;
  percent: number;
  missingFields: string[];
};

export const INVESTOR_REQUIRED_FIELDS = requiredFieldsJson as Array<{ key: string; label: string }>;

export function getFounderCompleteness(
  session: ProfileBuilderSession | null
): CompletenessResult {
  if (!session) return { isComplete: false, percent: 0, missingFields: [] };
  if (session.status === "confirmed") {
    return { isComplete: true, percent: 100, missingFields: [] };
  }
  // in_progress or extracted-but-not-confirmed = incomplete
  const totalFields = 8; // matches the 8 profile-builder questions
  const missingCount = session.missing_fields?.length ?? totalFields;
  const filled = Math.max(0, totalFields - missingCount);
  return {
    isComplete: false,
    percent: Math.round((filled / totalFields) * 100),
    missingFields: session.missing_fields ?? [],
  };
}

export function getInvestorCompleteness(
  profile: InvestorProfile | null
): CompletenessResult {
  if (!profile) return { isComplete: false, percent: 0, missingFields: [] };

  const missing = INVESTOR_REQUIRED_FIELDS
    .filter(({ key }) => !profile[key] || profile[key] === "")
    .map(({ label }) => label);

  const percent = Math.round(
    ((INVESTOR_REQUIRED_FIELDS.length - missing.length) / INVESTOR_REQUIRED_FIELDS.length) * 100
  );

  return {
    isComplete: missing.length === 0,
    percent,
    missingFields: missing,
  };
}

export function getResumeMessage(
  completeness: CompletenessResult,
  accountType: "founder" | "investor",
  session: ProfileBuilderSession | InvestorProfile | null
): string {
  if (accountType === "founder") {
    const path = (session as ProfileBuilderSession | null)?.path;
    const pathLabel = path === "upload" ? "document upload" : "interview";
    return `Let's finish your profile first — you're ${completeness.percent}% done with the ${pathLabel}. It takes about 10–15 minutes and unlocks everything else, including matching with investors and your readiness score. Want to pick up where you left off?`;
  } else {
    const topMissing = completeness.missingFields.slice(0, 2).join(" and ");
    const tail =
      completeness.missingFields.length > 2 ? ", and a few more fields" : "";
    return `Let's finish setting up your investor profile first — you're ${completeness.percent}% complete. Missing: ${topMissing}${tail}. This takes about 5 minutes and unlocks discovery, intake, and deal rooms.`;
  }
}

// Classify a message as an explain_feature (general question) vs a tool request.
// Tool requests are blocked when profile is incomplete; general questions are not.
const TOOL_REQUEST_PATTERNS = [
  /create\s+(a\s+)?deal\s*room/i,
  /upload\s+(a\s+)?(document|doc|file|deck)/i,
  /approve\s+(access|request)/i,
  /decline\s+(access|request)/i,
  /show\s+me\s+my\s+(pipeline|deals|readiness|score)/i,
  /run\s+(the\s+)?profile\s+builder/i,
  /send\s+(an?\s+)?(invite|invitation)/i,
  /schedule\s+(a\s+)?meeting/i,
  /submit\s+(a\s+)?(decision|vote)/i,
  /start\s+(a\s+)?roast/i,
  /add\s+(an?\s+)?investor/i,
  /track\s+(this\s+)?lead/i,
  /what\s+deals?\s+do\s+i\s+have/i,
  /my\s+readiness\s+score/i,
  /my\s+(current\s+)?pipeline/i,
];

export function isToolRequest(message: string): boolean {
  return TOOL_REQUEST_PATTERNS.some((p) => p.test(message));
}
