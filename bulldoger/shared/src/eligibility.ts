import type { ApplicationInput, DebtType, StoryCategory } from "./types.ts";

/** Debt types BullDOGEr will never list. These are rejected at intake. */
export const INELIGIBLE_DEBT_TYPES: ReadonlySet<DebtType> = new Set<DebtType>([
  "gambling",
  "payday_loan_rollover",
  "crypto_margin",
  "court_restitution",
]);

export const ELIGIBLE_DEBT_TYPES: DebtType[] = [
  "medical",
  "student_loan",
  "rent_arrears",
  "utility",
  "childcare",
  "car_loan",
  "credit_card",
  "personal_loan",
];

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  medical: "Medical bill",
  student_loan: "Student loan",
  rent_arrears: "Back rent",
  utility: "Utilities",
  childcare: "Childcare",
  car_loan: "Car loan",
  credit_card: "Credit card",
  personal_loan: "Personal loan",
  gambling: "Gambling debt",
  payday_loan_rollover: "Payday loan rollover",
  crypto_margin: "Crypto / margin loan",
  court_restitution: "Court-ordered restitution",
};

export const CATEGORY_LABELS: Record<StoryCategory, string> = {
  student: "College student",
  single_parent: "Single parent",
  housing_recovery: "Getting back on their feet",
  medical: "Medical hardship",
  veteran: "Veteran",
  caregiver: "Caregiver",
  disaster_recovery: "Disaster recovery",
  other: "Hardship",
};

/** Per-case ceiling for v1. Large asks go to a manual, higher-scrutiny track. */
export const MAX_CASE_CENTS = 50_000_00;
export const MIN_DEBT_CENTS = 50_00;

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

const FLAG_WORDS = ["casino", "sportsbook", "betting", "parlay", "poker", "slots", "leverage"];

/**
 * Fast, deterministic intake screen. This runs before any human or vendor
 * spends time on a case. It is NOT the background check; that is the
 * `eligibility_screen` verification step, run by a caseworker or vendor.
 */
export function screenApplication(input: ApplicationInput): EligibilityResult {
  const reasons: string[] = [];

  if (!input.consentToShare) reasons.push("Applicant must consent to sharing their story.");
  if (!input.firstName.trim()) reasons.push("First name is required.");
  if (input.story.trim().length < 80) reasons.push("Story must be at least 80 characters.");
  if (input.debts.length === 0) reasons.push("At least one bill is required.");

  for (const d of input.debts) {
    if (INELIGIBLE_DEBT_TYPES.has(d.type)) {
      reasons.push(`${DEBT_TYPE_LABELS[d.type]} is not eligible for BullDOGEr.`);
    }
    if (!(d.amountCents >= MIN_DEBT_CENTS)) {
      reasons.push(`Bills under $${MIN_DEBT_CENTS / 100} aren't eligible (${d.creditorName || "unnamed bill"}).`);
    }
    if (!/^[•*x]{2,}\s?\d{2,4}$/i.test(d.accountMask.trim())) {
      reasons.push(`Account number for ${d.creditorName || "each bill"} must be masked (e.g. "•••• 1234").`);
    }
  }

  const total = input.debts.reduce((s, d) => s + d.amountCents, 0);
  if (total > MAX_CASE_CENTS) {
    reasons.push(`Total exceeds the $${(MAX_CASE_CENTS / 100).toLocaleString()} per-case limit.`);
  }

  // Lightweight keyword flag; a human always makes the final call.
  const text = `${input.headline} ${input.story}`.toLowerCase();
  const hit = FLAG_WORDS.find((w) => text.includes(w));
  if (hit) reasons.push(`Story mentions "${hit}"; this needs manual review and can't be auto-accepted.`);

  return { eligible: reasons.length === 0, reasons };
}
