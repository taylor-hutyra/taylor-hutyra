export * from "./types.ts";
export * from "./eligibility.ts";
export * from "./providers.ts";
export * from "./engine.ts";
export * from "./seed.ts";

import { BulldogerEngine } from "./engine.ts";
import { MockPaymentRail, MockVerificationProvider } from "./providers.ts";
import { SEED_CASES, SEED_DONORS } from "./seed.ts";

/** An engine wired to mock vendors and loaded with fictional sample data. */
export function createDemoEngine(): BulldogerEngine {
  const engine = new BulldogerEngine({
    verifiers: [new MockVerificationProvider()],
    rail: new MockPaymentRail(),
  });
  engine.load({ cases: SEED_CASES, donors: SEED_DONORS });
  return engine;
}
