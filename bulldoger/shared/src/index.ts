export * from "./types.ts";
export * from "./eligibility.ts";
export * from "./providers.ts";
export * from "./engine.ts";
export * from "./seed.ts";

import { BulldogerEngine } from "./engine.ts";
import { MockFundingProvider, MockPaymentRail, MockVerificationProvider, type FundingProvider, type PaymentRail } from "./providers.ts";
import { SEED_CASES, SEED_DONORS } from "./seed.ts";

/**
 * An engine wired entirely to MOCK vendors and loaded with fictional sample
 * data. No real verification, no real money. Pass overrides to simulate
 * failures in tests.
 */
export function createDemoEngine(overrides: { funding?: FundingProvider; rail?: PaymentRail } = {}): BulldogerEngine {
  const engine = new BulldogerEngine({
    verifiers: [new MockVerificationProvider()],
    rail: overrides.rail ?? new MockPaymentRail(),
    funding: overrides.funding ?? new MockFundingProvider(),
  });
  engine.load({ cases: SEED_CASES, donors: SEED_DONORS });
  return engine;
}
