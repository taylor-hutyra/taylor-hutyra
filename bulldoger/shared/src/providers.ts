import type { Case, CheckKind, CheckStatus, Debt, Disbursement } from "./types.ts";

/**
 * Vendor seams. EVERYTHING HERE IS A STUB FOR NOW: no real identity checks,
 * no real money. Each interface is shaped like the real integration it will
 * become (see docs/PAYMENTS.md and docs/VERIFICATION.md), so swapping in a
 * real vendor means writing one class, not changing the engine.
 */

// ------------------------------------------------------------ verification

export interface CheckResult {
  status: CheckStatus;
  notes?: string;
}

/** Runs one or more verification steps for a case. */
export interface VerificationProvider {
  readonly name: string;
  readonly handles: CheckKind[];
  run(kind: CheckKind, c: Case): Promise<CheckResult>;
}

// --------------------------------------------------- donor side (money in)

export type AuthorizationResult =
  | { status: "authorized"; authorizationId: string }
  | { status: "declined"; reason: string };

/**
 * Where the donor's money comes from. Real version: Stripe / Plaid / bank
 * wire, with the donor's payment details tokenized by the processor so
 * BullDOGEr never stores card or bank numbers.
 *
 * Authorize → (verify every payee) → capture. If anything fails before
 * capture, the hold is voided and the donor is never charged.
 */
export interface FundingProvider {
  readonly name: string;
  /** Short label for the UI, e.g. "Visa •••• 4242". */
  describeSource(donorId: string): Promise<string>;
  authorize(donorId: string, amountCents: number): Promise<AuthorizationResult>;
  capture(authorizationId: string, amountCents: number): Promise<{ captureId: string }>;
  void(authorizationId: string): Promise<void>;
}

// ------------------------------------------------- creditor side (money out)

export type PayeeVerification =
  | { verified: true; payeeId: string }
  | { verified: false; reason: string };

/**
 * Moves money from the platform to a creditor. Never to the recipient.
 * Real version: Method Financial (loans/cards), bill-pay / ACH to verified
 * biller accounts, or mailed checks for small landlords and clinics.
 */
export interface PaymentRail {
  readonly name: string;
  /**
   * Confirm the receiving account really belongs to the creditor named on
   * the bill (biller directory match, account ownership check). This is the
   * "we know the money is going to the right place" step.
   */
  verifyPayee(debt: Debt): Promise<PayeeVerification>;
  /** Get a fresh payoff quote straight from the creditor. */
  quotePayoff(debt: Debt): Promise<{ amountCents: number; expiresAt: string }>;
  pay(payeeId: string, debt: Debt, amountCents: number): Promise<Pick<Disbursement, "status" | "externalRef">>;
}

// ------------------------------------------------------------------ mocks

/**
 * Auto-passes every automated check. `story_review` is not handled here on
 * purpose: a human caseworker must read every story.
 */
export class MockVerificationProvider implements VerificationProvider {
  readonly name = "mock";
  readonly handles: CheckKind[] = ["consent", "identity", "debt_documents", "creditor_confirmation", "eligibility_screen"];
  async run(kind: CheckKind, c: Case): Promise<CheckResult> {
    if (kind === "eligibility_screen" && /casino|sportsbook|betting/i.test(c.story)) {
      return { status: "failed", notes: "Gambling indicators found during screening." };
    }
    return { status: "passed", notes: `Auto-passed by mock provider (${kind}).` };
  }
}

/** Pretend card on file. Optional `declineOverCents` lets tests simulate a decline. */
export class MockFundingProvider implements FundingProvider {
  readonly name = "mock-funding";
  private seq = 0;
  readonly voided = new Set<string>();
  constructor(private readonly opts: { declineOverCents?: number } = {}) {}
  async describeSource() {
    return "Demo card •••• 4242 (no real charge)";
  }
  async authorize(_donorId: string, amountCents: number): Promise<AuthorizationResult> {
    if (this.opts.declineOverCents !== undefined && amountCents > this.opts.declineOverCents) {
      return { status: "declined", reason: "Mock decline: amount over test limit." };
    }
    return { status: "authorized", authorizationId: `mock_auth_${String(++this.seq).padStart(5, "0")}` };
  }
  async capture(authorizationId: string) {
    return { captureId: authorizationId.replace("auth", "cap") };
  }
  async void(authorizationId: string) {
    this.voided.add(authorizationId);
  }
}

/** Pretend creditor network. `rejectPayees` lets tests simulate an unverifiable creditor. */
export class MockPaymentRail implements PaymentRail {
  readonly name = "mock-rail";
  private seq = 0;
  constructor(private readonly opts: { rejectPayees?: string[] } = {}) {}
  async verifyPayee(debt: Debt): Promise<PayeeVerification> {
    if (this.opts.rejectPayees?.includes(debt.creditorName)) {
      return { verified: false, reason: `Could not verify a receiving account for ${debt.creditorName}.` };
    }
    return { verified: true, payeeId: `mock_payee_${debt.id}` };
  }
  async quotePayoff(debt: Debt) {
    const expiresAt = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
    return { amountCents: debt.amountCents, expiresAt };
  }
  async pay(_payeeId: string, _debt: Debt, _amountCents: number) {
    return { status: "sent" as const, externalRef: `mock_txn_${String(++this.seq).padStart(5, "0")}` };
  }
}
