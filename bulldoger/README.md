<p align="center"><img src="web/public/logo.svg" width="160" alt="Bulldoger logo: a bulldozer with a corgi's head on the front"></p>

# Bulldoger

**Swipe right. Bulldoze a bill.**

Bulldoger is a swipe-to-pay platform. Donors see verified stories (a struggling college student, a single parent, someone climbing out of homelessness), each with a photo and the specific bills holding them back. Swipe left to pass. Swipe right and confirm, and the platform pays those bills **directly to the creditor** (landlord, hospital, school), never as cash.

Every case passes a verification pipeline before any donor sees it: identity, bill documents, payoff confirmed with the creditor, a background/eligibility screen (gambling debts are never eligible), and a human caseworker review.

> Status: **framework / prototype.** Auth, real KYC, and real money movement are stubbed behind interfaces with mock implementations. See [docs/ROADMAP.md](docs/ROADMAP.md) before handling real money.

## Run it

```bash
cd bulldoger
npm install
npm run dev:web        # http://localhost:5173, in-browser demo mode, no server needed
```

Full stack (web + API):

```bash
npm run dev:server     # API on http://localhost:8787
VITE_API_URL=http://localhost:8787 npm run dev:web
```

Other scripts: `npm test` (engine tests), `npm run typecheck`, `npm run build`.

## Layout

```
bulldoger/
├── shared/   Domain model + business rules (the engine). Used by both server and web.
│   └── src/  types.ts · eligibility.ts · providers.ts · engine.ts · seed.ts · engine.test.ts
├── server/   Express API wrapping the engine (auth stubbed)
├── web/      React + Vite mobile-first app: swipe deck, pledges, apply form, how-it-works
└── docs/     ARCHITECTURE · VERIFICATION · ROADMAP
```

The engine runs in both places: the server wraps it in HTTP, and the web app's **demo mode** runs it directly in the browser with fictional sample data. That's what the GitHub Pages deploy serves.

## Core flow

1. **Apply**: recipient submits story, bills (account numbers masked), consent → instant intake screen rejects ineligible debt types.
2. **Verify**: automated checks run through `VerificationProvider`s; `story_review` always waits for a human.
3. **List**: once every check passes, the case appears in donors' decks.
4. **Swipe right**: creates a 48-hour hold (pledge). The donor confirms (must be KYC-verified).
5. **Pay**: the `PaymentRail` re-quotes each payoff with the creditor and pays creditor-direct.
6. **Bulldozed**: when every creditor confirms (webhook), the case closes and the recipient is notified.

## API (server)

| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/health` | anyone |
| GET | `/api/feed` | donor |
| POST | `/api/swipes` `{caseId, direction}` | donor |
| GET | `/api/pledges` | donor |
| POST | `/api/pledges/:id/confirm` `{message?}` | donor |
| POST | `/api/applications` | recipient |
| GET | `/api/applications/:id` | recipient |
| GET | `/api/admin/queue` | caseworker |
| POST | `/api/admin/cases/:id/checks/:kind` `{status, notes}` | caseworker |
| POST | `/api/webhooks/rail/:pledgeId/:disbursementId` | payment rail |

Donor identity is a stub `x-donor-id` header; caseworker routes use `x-admin-key` (`ADMIN_KEY` env, default `dev-admin-key`).

## Hosting the demo on GitHub Pages

`.github/workflows/bulldoger-pages.yml` builds the web app and deploys it on pushes to `main`. One-time: **Settings → Pages → Source: GitHub Actions**. It'll be served at `https://<user>.github.io/<repo>/`.

All people in the sample data are fictional.
