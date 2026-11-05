import type { Case, CheckKind, CheckStatus, Debt, Disbursement } from "./types.ts";

/**
 * Vendor seams. Each one has a mock implementation so the whole app runs
 * locally; swap in real vendors (see docs/VERIFICATION.md) without touching
 * the engine.
 */

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

/** Moves money from the platform to a creditor. Never to the recipient. */
export interface PaymentRail {
  readonly name: string;
  /** Get a fresh payoff quote straight from the creditor. */
  quotePayoff(debt: Debt): Promise<{ amountCents: number; expiresAt: string }>;
  pay(debt: Debt, amountCents: number): Promise<Pick<Disbursement, "status" | "externalRef">>;
}

/**
 * Mock provider: auto-passes every automated check. `story_review` is not
 * handled here on purpose: a human caseworker must read every story.
 */
export class MockVerificationProvider implements VerificationProvider {
  readonly name = "mock";
  readonly handles: CheckKind[] = [
    "consent",
    "identity",
    "debt_documents",
    "creditor_confirmation",
    "eligibility_screen",
  ];
  async run(kind: CheckKind, c: Case): Promise<CheckResult> {
    if (kind === "eligibility_screen" && /casino|sportsbook|betting/i.test(c.story)) {
      return { status: "failed", notes: "Gambling indicators found during screening." };
    }
    return { status: "passed", notes: `Auto-passed by mock provider (${kind}).` };
  }
}

export class MockPaymentRail implements PaymentRail {
  readonly name = "mock";
  private seq = 0;
  async quotePayoff(debt: Debt) {
    const expiresAt = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
    return { amountCents: debt.amountCents, expiresAt };
  }
  async pay(_debt: Debt, _amountCents: number) {
    this.seq += 1;
    return { status: "sent" as const, externalRef: `mock_txn_${String(this.seq).padStart(5, "0")}` };
  }
}
