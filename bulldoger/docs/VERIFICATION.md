# Verification: the "middleman" layer

The point of Bulldoger is trust in both directions: donors trust the story is real and the money does what it says; recipients trust their information is handled carefully. This layer runs **separately from the swipe app**. A case is invisible to donors until all six checks pass.

## The six checks (`REQUIRED_CHECKS` in `shared/src/engine.ts`)

| # | Check | What it proves | Automated by (candidates) | Human? |
|---|---|---|---|---|
| 1 | `consent` | Recipient agreed to terms, what's public, and a background screen | in-app e-sign | no |
| 2 | `identity` | Real person, matches name/photo/location | Persona, Stripe Identity, Onfido, Socure | escalations |
| 3 | `debt_documents` | Uploaded statements are genuine and match the claimed bills | OCR + document-fraud checks (e.g. Ocrolus, Inscribe) | spot checks |
| 4 | `creditor_confirmation` | Creditor confirms the account exists and the payoff amount | Method Financial (loans/cards), direct creditor portals, phone verification for landlords/clinics | often |
| 5 | `eligibility_screen` | Not gambling, fraud, a repeat request, or a sanctioned person; credit report sanity check | credit pull (soft), OFAC screen, internal duplicate detection | yes for flags |
| 6 | `story_review` | A caseworker read the story and photos and they hold together | — | **always** |

Any `failed` check → case `rejected` with a reason shown only to the applicant. `needs_info` → applicant gets a task.

## Eligibility rules

Enforced at intake by `screenApplication()` in `shared/src/eligibility.ts`:

- **Eligible:** medical, student loan, back rent, utilities, childcare, car loan, credit card, personal loan.
- **Never eligible:** gambling debt, payday-loan rollovers, crypto/margin loans, court-ordered restitution.
- Account numbers must be masked at intake; full numbers live only in the payment rail's vault.
- $50 minimum per bill, $50,000 per-case cap for v1.
- Gambling-related words in the story force manual review (keyword flag, not a verdict).

The credit-report pull in check 5 is what actually catches "credit card debt that's really gambling debt": a caseworker looks at transaction patterns/merchant categories where the applicant has consented to share statements.

## Why creditor-direct payment matters most

Paying the creditor (not the person) removes most of the incentive to fake a case: you can't walk away with cash. Combined with re-quoting the payoff right before paying, it also guarantees the donor's money closes the exact bill they saw.

## Plugging in a real vendor

Implement `VerificationProvider` (`shared/src/providers.ts`):

```ts
class PersonaIdentity implements VerificationProvider {
  name = "persona";
  handles = ["identity"] as const;
  async run(kind, c) {
    const inquiry = await persona.inquiries.retrieve(c.personaInquiryId);
    return { status: inquiry.status === "approved" ? "passed" : "needs_info" };
  }
}
```

Then pass it to `new BulldogerEngine({ verifiers: [new PersonaIdentity(), ...] })`. Most vendors are async (webhook-based), so in production `run()` usually starts the job and a webhook later calls `engine.reviewCheck(...)`.
