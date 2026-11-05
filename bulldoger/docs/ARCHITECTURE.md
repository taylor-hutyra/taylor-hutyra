# Architecture

```
┌──────────────┐     HTTP      ┌──────────────┐
│  web (React) │ ────────────▶ │ server (API) │
│  swipe deck  │               │   Express    │
└──────┬───────┘               └──────┬───────┘
       │ demo mode                    │
       ▼                              ▼
┌─────────────────────────────────────────────┐
│ shared: BulldogerEngine (all business rules)│
│  ├─ VerificationProvider[]  (KYC, docs, …)  │
│  ├─ FundingProvider         (donor money in) │
│  └─ PaymentRail             (creditor-direct)│
└─────────────────────────────────────────────┘
```

## Case lifecycle

```
submitted → in_review → listed → pledged → paying → bulldoged
                │                                   
                └──────→ rejected        (any check failed)
```

## Pledge lifecycle

```
right swipe → awaiting_confirmation ──(48h)──▶ expired
                     │
                 confirm (donor KYC'd, case still listed)
                     ▼
                 disbursing ──(all creditors confirm)──▶ completed
```

First donor to *confirm* wins. Other donors' open holds on the same case are cancelled.

## Data privacy

- Donors only ever receive `PublicCard` (see `toPublicCard`): first name, age, city/state, story, creditor names and amounts. No account masks, no check notes, no last names.
- Recipients see their own check statuses but not internal notes.

## Swapping pieces

| Piece | Today | Production |
|---|---|---|
| Storage | in-memory `Map`s in the engine | Postgres (Supabase/Neon) behind a repository interface |
| Auth | `x-donor-id` / `x-admin-key` headers | Clerk, Auth0, or Supabase Auth; caseworker role |
| Verification | `MockVerificationProvider` | see VERIFICATION.md |
| Donor funding | `MockFundingProvider` | Stripe / Plaid ACH / wire (see PAYMENTS.md) |
| Creditor payments | `MockPaymentRail` | Method Financial (pays loans/cards directly), check/ACH for landlords & clinics |
| Photos | initials avatars | object storage + moderation; recipients approve their photo |
| Mobile | responsive web app (installable) | wrap with Capacitor or port to React Native/Expo |
