import { screenApplication } from "./eligibility.ts";
import type { FundingProvider, PaymentRail, VerificationProvider } from "./providers.ts";
import type {
  ApplicationInput,
  Case,
  CaseStatus,
  CheckKind,
  CheckStatus,
  Donor,
  LedgerEntry,
  Pledge,
  PublicCard,
  Swipe,
  SwipeDirection,
  VerificationCheck,
} from "./types.ts";

/** Every case must pass all of these, in this order, before it is listed. */
export const REQUIRED_CHECKS: CheckKind[] = [
  "consent",
  "identity",
  "debt_documents",
  "creditor_confirmation",
  "eligibility_screen",
  "story_review",
];

/** A right swipe holds a case for this long while the donor confirms. */
export const PLEDGE_HOLD_MS = 48 * 3600 * 1000;

export class EngineError extends Error {
  constructor(
    public readonly code: "not_found" | "forbidden" | "conflict" | "invalid",
    message: string,
    public readonly details?: string[],
  ) {
    super(message);
  }
}

export interface EngineOptions {
  verifiers: VerificationProvider[];
  rail: PaymentRail;
  funding: FundingProvider;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export type ApplyResult = { ok: true; case: Case } | { ok: false; reasons: string[] };

/**
 * The BullDOGEr engine: all business rules live here, with no HTTP or
 * storage concerns. The server wraps it in an API; the web app's demo mode
 * runs it directly in the browser. Storage is in-memory for now; swap the
 * Maps for a repository interface when you add a database.
 */
export class BulldogerEngine {
  private cases = new Map<string, Case>();
  private donors = new Map<string, Donor>();
  private swipes: Swipe[] = [];
  private pledges = new Map<string, Pledge>();
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(private readonly opts: EngineOptions) {
    this.now = opts.now ?? (() => new Date());
    let n = 0;
    this.newId = opts.newId ?? ((p) => `${p}_${Date.now().toString(36)}${(n++).toString(36)}`);
  }

  // ---------------------------------------------------------------- seeding

  load(data: { cases?: Case[]; donors?: Donor[] }) {
    for (const c of data.cases ?? []) this.cases.set(c.id, structuredClone(c));
    for (const d of data.donors ?? []) this.donors.set(d.id, structuredClone(d));
  }

  // --------------------------------------------------------------- donors

  getDonor(id: string): Donor {
    const d = this.donors.get(id);
    if (!d) throw new EngineError("not_found", `Donor ${id} not found`);
    return d;
  }

  /** Verified, listed cases this donor hasn't swiped on yet. */
  feed(donorId: string, limit = 20): PublicCard[] {
    this.getDonor(donorId);
    this.expireStalePledges();
    const seen = new Set(this.swipes.filter((s) => s.donorId === donorId).map((s) => s.caseId));
    return [...this.cases.values()]
      .filter((c) => c.status === "listed" && !seen.has(c.id))
      .sort((a, b) => (a.listedAt ?? "").localeCompare(b.listedAt ?? ""))
      .slice(0, limit)
      .map(toPublicCard);
  }

  swipe(donorId: string, caseId: string, direction: SwipeDirection): { swipe: Swipe; pledge?: Pledge } {
    this.getDonor(donorId);
    const c = this.getCase(caseId);
    if (c.status !== "listed") throw new EngineError("conflict", "This case is no longer available.");

    const swipe: Swipe = { id: this.newId("swp"), donorId, caseId, direction, createdAt: this.iso() };
    this.swipes.push(swipe);
    if (direction === "left") return { swipe };

    // A right swipe is *intent*. The donor still confirms before money moves.
    const pledge: Pledge = {
      id: this.newId("plg"),
      donorId,
      caseId,
      amountCents: totalOf(c),
      status: "awaiting_confirmation",
      disbursements: [],
      ledger: [],
      createdAt: this.iso(),
      expiresAt: new Date(this.now().getTime() + PLEDGE_HOLD_MS).toISOString(),
    };
    this.pledges.set(pledge.id, pledge);
    return { swipe, pledge };
  }

  pledgesFor(donorId: string): Array<Pledge & { card: PublicCard }> {
    this.expireStalePledges();
    return [...this.pledges.values()]
      .filter((p) => p.donorId === donorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({ ...p, card: toPublicCard(this.getCase(p.caseId)) }));
  }

  /**
   * Donor confirms a pledge. v1 is "bullDOGE it all": the donor covers the
   * full verified balance, and every debt is paid directly to its creditor.
   */
  async confirmPledge(pledgeId: string, donorId: string, message?: string): Promise<Pledge> {
    this.expireStalePledges();
    const p = this.getPledge(pledgeId);
    if (p.donorId !== donorId) throw new EngineError("forbidden", "Not your pledge.");
    if (p.status !== "awaiting_confirmation") throw new EngineError("conflict", `Pledge is ${p.status}.`);
    const donor = this.getDonor(donorId);
    if (!donor.kycVerified) {
      throw new EngineError("forbidden", "Finish donor verification (KYC) before funding a case.");
    }
    const c = this.getCase(p.caseId);
    if (c.status !== "listed") {
      p.status = "cancelled";
      throw new EngineError("conflict", "Another donor already bullDOGEd this one. 🐶");
    }

    // Lock the case while we line up the money.
    c.status = "pledged";
    const { funding, rail } = this.opts;
    const log = (entry: Omit<LedgerEntry, "at">) => p.ledger.push({ at: this.iso(), ...entry });
    const abort = async (authId: string | undefined, reason: string): Promise<never> => {
      if (authId) {
        await funding.void(authId);
        log({ event: "funds_released", ref: authId, note: reason });
      }
      c.status = "listed"; // back in the deck; nobody was charged
      p.status = "cancelled";
      throw new EngineError("conflict", reason);
    };

    // 1. Hold the donor's funds (not charged yet).
    const auth = await funding.authorize(donorId, p.amountCents);
    if (auth.status === "declined") {
      log({ event: "funds_declined", amountCents: p.amountCents, note: auth.reason });
      c.status = "listed";
      throw new EngineError("invalid", `Payment method declined: ${auth.reason}`);
    }
    p.fundingAuthorizationId = auth.authorizationId;
    log({ event: "funds_authorized", amountCents: p.amountCents, ref: auth.authorizationId });

    // 2. Verify every creditor's receiving account and get a fresh payoff quote.
    const plan: Array<{ debt: (typeof c.debts)[number]; payeeId: string; amountCents: number }> = [];
    for (const debt of c.debts) {
      const payee = await rail.verifyPayee(debt);
      if (!payee.verified) {
        log({ event: "payee_rejected", debtId: debt.id, note: payee.reason });
        return abort(auth.authorizationId, `${payee.reason} You were not charged.`);
      }
      log({ event: "payee_verified", debtId: debt.id, ref: payee.payeeId });
      const quote = await rail.quotePayoff(debt);
      log({ event: "payoff_quoted", debtId: debt.id, amountCents: quote.amountCents });
      plan.push({ debt, payeeId: payee.payeeId, amountCents: quote.amountCents });
    }
    const total = plan.reduce((s, x) => s + x.amountCents, 0);
    if (total > p.amountCents) {
      return abort(auth.authorizationId, "A balance went up since this case was verified. You were not charged.");
    }

    // 3. Everything checks out: capture the funds and cancel other donors' holds.
    const { captureId } = await funding.capture(auth.authorizationId, total);
    log({ event: "funds_captured", amountCents: total, ref: captureId });
    for (const other of this.pledges.values()) {
      if (other.caseId === c.id && other.id !== p.id && other.status === "awaiting_confirmation") {
        other.status = "cancelled";
      }
    }
    p.status = "disbursing";
    p.amountCents = total;
    p.messageToRecipient = message?.slice(0, 500);
    c.status = "paying";

    // 4. Pay each creditor directly.
    for (const { debt, payeeId, amountCents } of plan) {
      const res = await rail.pay(payeeId, debt, amountCents);
      log({ event: "disbursement_sent", debtId: debt.id, amountCents, ref: res.externalRef });
      p.disbursements.push({
        id: this.newId("dsb"),
        debtId: debt.id,
        creditorName: debt.creditorName,
        amountCents,
        status: res.status,
        rail: rail.name,
        payeeId,
        externalRef: res.externalRef,
        updatedAt: this.iso(),
      });
    }
    return p;
  }

  /** Label for the donor's funding source (stubbed card in demo). */
  fundingSourceLabel(donorId: string): Promise<string> {
    this.getDonor(donorId);
    return this.opts.funding.describeSource(donorId);
  }

  /** Called from the payment rail webhook when a creditor posts the payment. */
  markDisbursementConfirmed(pledgeId: string, disbursementId: string): Pledge {
    const p = this.getPledge(pledgeId);
    const d = p.disbursements.find((x) => x.id === disbursementId);
    if (!d) throw new EngineError("not_found", "Disbursement not found");
    if (d.status === "confirmed_by_creditor") return p;
    d.status = "confirmed_by_creditor";
    d.updatedAt = this.iso();
    p.ledger.push({ at: this.iso(), event: "creditor_confirmed", debtId: d.debtId, amountCents: d.amountCents, ref: d.externalRef });
    if (p.disbursements.every((x) => x.status === "confirmed_by_creditor")) {
      p.status = "completed";
      this.getCase(p.caseId).status = "bulldoged";
    }
    return p;
  }

  /** Demo helper: pretend every creditor confirmed. */
  settleAll(pledgeId: string): Pledge {
    const p = this.getPledge(pledgeId);
    for (const d of p.disbursements) this.markDisbursementConfirmed(p.id, d.id);
    return p;
  }

  // --------------------------------------------------------- recipients

  /** Intake: screen, create the case, kick off automated verification. */
  async apply(input: ApplicationInput): Promise<ApplyResult> {
    const screen = screenApplication(input);
    if (!screen.eligible) return { ok: false, reasons: screen.reasons };

    const c: Case = {
      id: this.newId("case"),
      firstName: input.firstName.trim(),
      age: input.age,
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      category: input.category,
      headline: input.headline.trim(),
      story: input.story.trim(),
      unlocks: input.unlocks.trim(),
      photoUrl: input.photoUrl,
      debts: input.debts.map((d) => ({ ...d, id: this.newId("debt"), creditorConfirmed: false })),
      status: "submitted",
      checks: REQUIRED_CHECKS.map((kind) => ({
        kind,
        status: "pending" as CheckStatus,
        provider: "unassigned",
        updatedAt: this.iso(),
      })),
      createdAt: this.iso(),
    };
    this.cases.set(c.id, c);
    await this.runAutomatedChecks(c.id);
    return { ok: true, case: c };
  }

  /** Run every check that has an automated provider. Humans handle the rest. */
  async runAutomatedChecks(caseId: string): Promise<Case> {
    const c = this.getCase(caseId);
    c.status = "in_review";
    for (const check of c.checks) {
      if (check.status === "passed") continue;
      const provider = this.opts.verifiers.find((v) => v.handles.includes(check.kind));
      if (!provider) continue;
      check.status = "in_progress";
      check.provider = provider.name;
      const result = await provider.run(check.kind, c);
      this.applyCheck(c, check, result.status, result.notes);
      if (result.status === "failed") break;
    }
    return this.recompute(c);
  }

  /** Caseworker records the outcome of a check (e.g. story_review). */
  reviewCheck(caseId: string, kind: CheckKind, status: CheckStatus, notes?: string, reviewer = "caseworker"): Case {
    const c = this.getCase(caseId);
    const check = c.checks.find((x) => x.kind === kind);
    if (!check) throw new EngineError("invalid", `Unknown check ${kind}`);
    check.provider = reviewer;
    this.applyCheck(c, check, status, notes);
    return this.recompute(c);
  }

  getCase(id: string): Case {
    const c = this.cases.get(id);
    if (!c) throw new EngineError("not_found", `Case ${id} not found`);
    return c;
  }

  listCases(filter?: { status?: CaseStatus }): Case[] {
    return [...this.cases.values()]
      .filter((c) => !filter?.status || c.status === filter.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Cases waiting on a human. */
  reviewQueue(): Case[] {
    return this.listCases({ status: "in_review" });
  }

  stats() {
    const all = [...this.cases.values()];
    const bulldoged = all.filter((c) => c.status === "bulldoged");
    return {
      listed: all.filter((c) => c.status === "listed").length,
      inReview: all.filter((c) => c.status === "in_review").length,
      bulldoged: bulldoged.length,
      bulldogedCents: bulldoged.reduce((s, c) => s + totalOf(c), 0),
    };
  }

  // ------------------------------------------------------------ internals

  private applyCheck(c: Case, check: VerificationCheck, status: CheckStatus, notes?: string) {
    check.status = status;
    check.notes = notes;
    check.updatedAt = this.iso();
    if (check.kind === "creditor_confirmation" && status === "passed") {
      for (const d of c.debts) d.creditorConfirmed = true;
    }
  }

  private recompute(c: Case): Case {
    if (["pledged", "paying", "bulldoged", "withdrawn"].includes(c.status)) return c;
    const failed = c.checks.find((x) => x.status === "failed");
    if (failed) {
      c.status = "rejected";
      c.rejectionReason = failed.notes ?? `Did not pass ${failed.kind.replace("_", " ")}.`;
    } else if (c.checks.every((x) => x.status === "passed")) {
      c.status = "listed";
      c.listedAt ??= this.iso();
    } else {
      c.status = "in_review";
    }
    return c;
  }

  private getPledge(id: string): Pledge {
    const p = this.pledges.get(id);
    if (!p) throw new EngineError("not_found", `Pledge ${id} not found`);
    return p;
  }

  private expireStalePledges() {
    const now = this.now().toISOString();
    for (const p of this.pledges.values()) {
      if (p.status === "awaiting_confirmation" && p.expiresAt < now) p.status = "expired";
    }
  }

  private iso() {
    return this.now().toISOString();
  }
}

export function totalOf(c: Pick<Case, "debts">): number {
  return c.debts.reduce((s, d) => s + d.amountCents, 0);
}

/** Strip everything a donor shouldn't see. */
export function toPublicCard(c: Case): PublicCard {
  return {
    id: c.id,
    firstName: c.firstName,
    age: c.age,
    city: c.city,
    state: c.state,
    category: c.category,
    headline: c.headline,
    story: c.story,
    unlocks: c.unlocks,
    photoUrl: c.photoUrl,
    totalCents: totalOf(c),
    debts: c.debts.map(({ id, type, creditorName, amountCents }) => ({ id, type, creditorName, amountCents })),
    verifiedChecks: c.checks.filter((x) => x.status === "passed").map((x) => x.kind),
    listedAt: c.listedAt,
  };
}

export function formatUSD(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
