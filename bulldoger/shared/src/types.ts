/**
 * Core domain model for Bulldoger.
 *
 * Key principles baked into the model:
 *  1. Money never goes to the recipient as cash. Every dollar is paid
 *     directly to a verified creditor (landlord, hospital, loan servicer...).
 *  2. A case is only shown to donors after every verification check passes.
 *  3. Recipients control what is shown; account numbers are always masked.
 */

export type Cents = number;

export type StoryCategory =
  | "student"
  | "single_parent"
  | "housing_recovery"
  | "medical"
  | "veteran"
  | "caregiver"
  | "disaster_recovery"
  | "other";

export type DebtType =
  | "medical"
  | "student_loan"
  | "rent_arrears"
  | "utility"
  | "childcare"
  | "car_loan"
  | "credit_card"
  | "personal_loan"
  // Ineligible types are still modeled so the screener can reject them explicitly.
  | "gambling"
  | "payday_loan_rollover"
  | "crypto_margin"
  | "court_restitution";

export interface Debt {
  id: string;
  type: DebtType;
  /** Display name of the creditor, e.g. "Mercy General Hospital". */
  creditorName: string;
  /** Always masked: "•••• 4821". Full numbers live only in the payment rail vault. */
  accountMask: string;
  amountCents: Cents;
  /** Set true once the creditor confirms the payoff amount directly. */
  creditorConfirmed: boolean;
  /** Payoff quotes expire; donors only see unexpired, confirmed balances. */
  payoffQuoteExpiresAt?: string;
}

export type CheckKind =
  | "consent" // recipient agreed to terms + what is public
  | "identity" // KYC: real person, matches the story
  | "debt_documents" // statements uploaded and parsed
  | "creditor_confirmation" // payoff amounts confirmed with the creditor
  | "eligibility_screen" // background review: gambling, fraud, repeat requests
  | "story_review"; // human caseworker read the story & photos

export type CheckStatus = "pending" | "in_progress" | "passed" | "failed" | "needs_info";

export interface VerificationCheck {
  kind: CheckKind;
  status: CheckStatus;
  provider: string; // "manual", "mock-kyc", "persona", "method-fi", etc.
  notes?: string;
  updatedAt: string;
}

export type CaseStatus =
  | "submitted" // intake form received
  | "in_review" // verification pipeline running
  | "listed" // verified + visible in the swipe deck
  | "pledged" // a donor swiped right and confirmed
  | "paying" // disbursements to creditors in flight
  | "bulldozed" // all debts paid. 🎉
  | "rejected"
  | "withdrawn";

export interface Case {
  id: string;
  firstName: string;
  age?: number;
  city: string;
  state: string;
  category: StoryCategory;
  headline: string;
  story: string;
  /** What paying this off unlocks: "keep my apartment", "re-enroll for spring". */
  unlocks: string;
  photoUrl?: string;
  debts: Debt[];
  status: CaseStatus;
  checks: VerificationCheck[];
  createdAt: string;
  listedAt?: string;
  /** Rejection reason shown to the applicant (never to donors). */
  rejectionReason?: string;
}

export type SwipeDirection = "left" | "right";

export interface Swipe {
  id: string;
  donorId: string;
  caseId: string;
  direction: SwipeDirection;
  createdAt: string;
}

export interface Donor {
  id: string;
  displayName: string;
  /** Donors pass KYC/AML before they can fund anything. */
  kycVerified: boolean;
  /** Show donor name to the recipient, or stay anonymous. */
  anonymous: boolean;
}

export type PledgeStatus =
  | "awaiting_confirmation" // right swipe = intent; donor must confirm amount
  | "confirmed" // funds authorized
  | "disbursing"
  | "completed"
  | "cancelled"
  | "expired";

export type DisbursementStatus = "scheduled" | "sent" | "confirmed_by_creditor" | "failed";

export interface Disbursement {
  id: string;
  debtId: string;
  creditorName: string;
  amountCents: Cents;
  status: DisbursementStatus;
  rail: string; // "mock", "method-fi", "stripe-treasury", "check"...
  externalRef?: string;
  updatedAt: string;
}

export interface Pledge {
  id: string;
  donorId: string;
  caseId: string;
  amountCents: Cents;
  status: PledgeStatus;
  disbursements: Disbursement[];
  /** Optional note the recipient will see. */
  messageToRecipient?: string;
  createdAt: string;
  expiresAt: string;
}

/** What a donor sees in the deck: a case with sensitive fields stripped. */
export interface PublicCard {
  id: string;
  firstName: string;
  age?: number;
  city: string;
  state: string;
  category: StoryCategory;
  headline: string;
  story: string;
  unlocks: string;
  photoUrl?: string;
  totalCents: Cents;
  debts: Array<Pick<Debt, "id" | "type" | "creditorName" | "amountCents">>;
  verifiedChecks: CheckKind[];
  listedAt?: string;
}

export interface ApplicationInput {
  firstName: string;
  age?: number;
  city: string;
  state: string;
  category: StoryCategory;
  headline: string;
  story: string;
  unlocks: string;
  photoUrl?: string;
  debts: Array<Pick<Debt, "type" | "creditorName" | "accountMask" | "amountCents">>;
  consentToShare: boolean;
}
