# Payments: stubbed today, built for real processors later

**Current state: everything is mocked.** No payment processor, bank, or creditor network is connected. No real money can move. Every money step runs through an interface in `shared/src/providers.ts` with a `Mock*` implementation behind it.

Going live means writing a real class for each interface and passing it to `new BulldogerEngine({...})`. The engine, API, and UI don't change.

## The two seams

| Seam | Interface | Mock today | Real candidates later |
|---|---|---|---|
| **Money in** (donor) | `FundingProvider` | `MockFundingProvider`: "Demo card •••• 4242", always authorizes | Stripe (cards, ACH via Financial Connections), Plaid + bank ACH, wire instructions for large gifts |
| **Money out** (creditor) | `PaymentRail` | `MockPaymentRail`: every payee verifies, every payment "sends" | Method Financial (pays loans and credit cards directly), bill-pay/ACH to verified billers, mailed checks for small landlords and clinics |

## The secure flow (already enforced by the engine)

When a donor confirms a right swipe, `BulldogerEngine.confirmPledge` runs:

1. **Authorize.** Hold the donor's funds. *They're not charged yet.*
2. **Verify every payee.** For each bill, the rail confirms the receiving account really belongs to the named creditor. This is how we know the money is going into the right spot.
3. **Re-quote.** Get a fresh payoff amount straight from the creditor.
4. **Capture.** Only if every payee verified and the total didn't go up do we actually charge the donor.
5. **Pay creditor-direct.** One disbursement per bill, to the verified payee. Never cash to the recipient.
6. **Confirm.** The rail's webhook reports each creditor posting the payment (`/api/webhooks/rail/...`). When all are confirmed, the case is "bulldoged".

If anything fails in steps 1–4, the hold is **voided**, the donor is **not charged**, and the case goes back in the deck. Tests in `shared/src/engine.test.ts` cover the declined card, the unverifiable creditor, and the order of steps.

Every step is written to the pledge's append-only **ledger** (`Pledge.ledger`) with the provider's reference IDs: a full audit trail for donors, recipients, and reconciliation. The app shows it as the "Payment trail" after a bulldoge.

## Security principles for when it's real

- **Never store card or bank numbers.** Processors tokenize them; Bulldoger stores only tokens and display labels.
- **Never pay the recipient.** Payees are creditors only, verified before each payment.
- **Authorize → verify → capture.** The donor is charged only after every payee checks out.
- **Webhooks must be signed.** Verify the processor's signature before trusting any confirmation (the current endpoint is behind a stub admin key).
- **Idempotency.** Use the pledge/disbursement IDs as idempotency keys so a retry can never double-pay.
- **Donor KYC/AML** before large gifts (sanctions screening; source of funds over a threshold).
- **Separate the ledger from the processor.** Reconcile our ledger against processor reports daily.

## Writing a real provider (sketch)

```ts
class StripeFunding implements FundingProvider {
  name = "stripe";
  async describeSource(donorId) { /* "Visa •••• 4242" from the saved PaymentMethod */ }
  async authorize(donorId, amountCents) {
    const pi = await stripe.paymentIntents.create({
      amount: amountCents, currency: "usd", customer: customerFor(donorId),
      capture_method: "manual", confirm: true, payment_method: defaultPmFor(donorId),
    });
    return pi.status === "requires_capture"
      ? { status: "authorized", authorizationId: pi.id }
      : { status: "declined", reason: pi.last_payment_error?.message ?? "Declined" };
  }
  async capture(id, amountCents) { const pi = await stripe.paymentIntents.capture(id, { amount_to_capture: amountCents }); return { captureId: pi.id }; }
  async void(id) { await stripe.paymentIntents.cancel(id); }
}
```

A `PaymentRail` for Method Financial would map `verifyPayee` to matching the creditor in their merchant directory/account verification, `quotePayoff` to their payoff endpoint, and `pay` to creating a payment to that account.
