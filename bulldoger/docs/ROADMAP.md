# Roadmap & open questions

## Now: everything stubbed

All processors, identity checks and logins are mocks. The app is safe to demo: nothing real can be charged or paid.

## Before real money moves (must-do)

- [ ] Replace `MockFundingProvider` and `MockPaymentRail` with real processors (see PAYMENTS.md): tokenized donor payments, verified creditor payees, signed webhooks, idempotency keys, daily ledger reconciliation.

- [ ] **Legal structure.** Decide: (a) a 501(c)(3) nonprofit, so donations are tax-deductible and the org makes grants to pay creditors, or (b) a for-profit platform facilitating person-to-person gifts. (a) is usually simpler for donor trust and taxes. Talk to a nonprofit attorney.
- [ ] **Money transmission.** Holding and forwarding funds can require state money-transmitter licenses. Using a licensed partner (or a nonprofit making grants from its own account) avoids most of this.
- [ ] **Gift tax.** Under (b), a donor giving one person more than the annual exclusion has to file a gift tax return. Under (a), it's a charitable donation instead.
- [ ] **Donor KYC/AML.** Large donors must be identified (sanctions screening, source of funds for big amounts) so the platform can't be used to launder money.
- [ ] **Real auth** for donors, recipients, and caseworkers.
- [ ] **Recipient privacy + consent** review: photos, stories, the right to withdraw and be forgotten.
- [ ] **Branding/IP.** Check trademark availability for "Bulldoger." Keep the brand original; don't use any real person's name or likeness in marketing without written permission.

## v0.2

- [ ] Postgres persistence + migrations
- [ ] Caseworker dashboard (review queue UI on top of `/api/admin/queue`)
- [ ] Document upload + identity flow for applicants
- [ ] Notifications (email/SMS) to recipients when listed and when bulldoged
- [ ] Thank-you notes from recipients back to donors

## Later ideas

- Partial pledges / "chip in" for big cases, with group bulldoges
- Donor filters (category, state, amount range)
- Impact profile: total bulldoged, people helped
- Partnerships with hospitals/colleges for verified hardship referrals
- Native iOS/Android app
