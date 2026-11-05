import { describe, expect, it } from "vitest";
import { createDemoEngine, MockFundingProvider, MockPaymentRail } from "./index.ts";
import type { ApplicationInput } from "./types.ts";

const goodApp: ApplicationInput = {
  firstName: "Sam",
  city: "Omaha",
  state: "ne",
  category: "medical",
  headline: "Surgery bill after a bike accident",
  story:
    "I was hit by a car while biking to work. I'm healed up and back on the job, but the hospital bill went to collections while I was out.",
  unlocks: "Collections closed.",
  debts: [{ type: "medical", creditorName: "Plains Regional", accountMask: "•••• 1234", amountCents: 1500_00 }],
  consentToShare: true,
};

describe("intake screening", () => {
  it("rejects gambling debt outright", async () => {
    const e = createDemoEngine();
    const res = await e.apply({
      ...goodApp,
      debts: [{ type: "gambling", creditorName: "Lucky Star", accountMask: "•••• 9999", amountCents: 5000_00 }],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reasons.join(" ")).toMatch(/Gambling debt is not eligible/);
  });

  it("requires masked account numbers", async () => {
    const e = createDemoEngine();
    const res = await e.apply({ ...goodApp, debts: [{ ...goodApp.debts[0]!, accountMask: "4111111111111234" }] });
    expect(res.ok).toBe(false);
  });

  it("holds a good application for human story review, then lists it", async () => {
    const e = createDemoEngine();
    const res = await e.apply(goodApp);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.case.status).toBe("in_review");
    expect(e.feed("donor_demo").some((c) => c.id === res.case.id)).toBe(false);

    e.reviewCheck(res.case.id, "story_review", "passed", "Read and approved");
    expect(e.getCase(res.case.id).status).toBe("listed");
    expect(e.feed("donor_demo").some((c) => c.id === res.case.id)).toBe(true);
  });
});

describe("swipe → pledge → creditor-direct payment", () => {
  it("left swipe just hides the card", () => {
    const e = createDemoEngine();
    const first = e.feed("donor_demo")[0]!;
    const { pledge } = e.swipe("donor_demo", first.id, "left");
    expect(pledge).toBeUndefined();
    expect(e.feed("donor_demo").map((c) => c.id)).not.toContain(first.id);
  });

  it("right swipe → confirm pays every creditor directly, then bullDOGEs the case", async () => {
    const e = createDemoEngine();
    const { pledge } = e.swipe("donor_demo", "case_denise", "right");
    expect(pledge?.status).toBe("awaiting_confirmation");

    const p = await e.confirmPledge(pledge!.id, "donor_demo", "You got this!");
    expect(p.status).toBe("disbursing");
    expect(p.disbursements.map((d) => d.creditorName)).toEqual([
      "Saguaro Flats Apartments",
      "Little Sprouts Learning Center",
    ]);
    expect(p.amountCents).toBe(1850_00 + 960_00);

    e.settleAll(p.id);
    expect(p.status).toBe("completed");
    expect(e.getCase("case_denise").status).toBe("bulldoged");
  });

  it("unverified donors can't fund", async () => {
    const e = createDemoEngine();
    const { pledge } = e.swipe("donor_unverified", "case_maya", "right");
    await expect(e.confirmPledge(pledge!.id, "donor_unverified")).rejects.toThrow(/KYC/);
  });

  it("first confirmed donor wins; the other hold is cancelled", async () => {
    const e = createDemoEngine();
    e.load({ donors: [{ id: "donor_b", displayName: "B", kycVerified: true, anonymous: true }] });
    const a = e.swipe("donor_demo", "case_marcus", "right").pledge!;
    const b = e.swipe("donor_b", "case_marcus", "right").pledge!;
    await e.confirmPledge(a.id, "donor_demo");
    await expect(e.confirmPledge(b.id, "donor_b")).rejects.toThrow();
    expect(e.pledgesFor("donor_b")[0]!.status).toBe("cancelled");
  });

  it("never exposes account masks in public cards", () => {
    const e = createDemoEngine();
    const json = JSON.stringify(e.feed("donor_demo"));
    expect(json).not.toMatch(/accountMask|••••/);
  });

  it("records the secure money flow in order: hold → verify payees → capture → pay", async () => {
    const e = createDemoEngine();
    const { pledge } = e.swipe("donor_demo", "case_denise", "right");
    const p = await e.confirmPledge(pledge!.id, "donor_demo");
    e.settleAll(p.id);
    expect(p.ledger.map((l) => l.event)).toEqual([
      "funds_authorized",
      "payee_verified",
      "payoff_quoted",
      "payee_verified",
      "payoff_quoted",
      "funds_captured",
      "disbursement_sent",
      "disbursement_sent",
      "creditor_confirmed",
      "creditor_confirmed",
    ]);
    expect(p.disbursements.every((d) => d.payeeId.startsWith("mock_payee_"))).toBe(true);
  });
});

describe("payment safety rails (stubbed vendors)", () => {
  it("declined donor payment: nothing charged, case stays in the deck", async () => {
    const e = createDemoEngine({ funding: new MockFundingProvider({ declineOverCents: 1000_00 }) });
    const { pledge } = e.swipe("donor_demo", "case_maya", "right");
    await expect(e.confirmPledge(pledge!.id, "donor_demo")).rejects.toThrow(/declined/);
    expect(e.getCase("case_maya").status).toBe("listed");
    expect(e.pledgesFor("donor_demo")[0]!.ledger.map((l) => l.event)).toEqual(["funds_declined"]);
  });

  it("unverifiable creditor: hold released, no payments sent, case stays listed", async () => {
    const funding = new MockFundingProvider();
    const e = createDemoEngine({ funding, rail: new MockPaymentRail({ rejectPayees: ["Little Sprouts Learning Center"] }) });
    const { pledge } = e.swipe("donor_demo", "case_denise", "right");
    await expect(e.confirmPledge(pledge!.id, "donor_demo")).rejects.toThrow(/not charged/);
    const p = e.pledgesFor("donor_demo")[0]!;
    expect(p.status).toBe("cancelled");
    expect(p.disbursements).toHaveLength(0);
    expect(p.ledger.map((l) => l.event)).not.toContain("funds_captured");
    expect(p.ledger.at(-1)!.event).toBe("funds_released");
    expect(funding.voided.has(p.fundingAuthorizationId!)).toBe(true);
    expect(e.getCase("case_denise").status).toBe("listed");
  });
});
