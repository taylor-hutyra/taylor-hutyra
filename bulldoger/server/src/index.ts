import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createDemoEngine, EngineError, type CheckKind, type CheckStatus } from "@bulldoger/shared";

/**
 * Bulldoger API. Thin HTTP layer over the shared engine.
 *
 * ALL VENDORS ARE MOCKED (verification, donor funding, creditor payments):
 * no real money moves. See docs/PAYMENTS.md.
 *
 * AUTH IS STUBBED: the donor is identified by an `x-donor-id` header and
 * caseworker routes by an `x-admin-key` header. Replace both with real
 * auth (e.g. Clerk/Auth0/Supabase) before anything touches real money.
 */

const PORT = Number(process.env.PORT ?? 8787);
const IS_PROD = process.env.NODE_ENV === "production";
// In production, never fall back to the well-known dev key.
const ADMIN_KEY = process.env.ADMIN_KEY ?? (IS_PROD ? randomBytes(24).toString("hex") : "dev-admin-key");
// Everything is mocked, so letting a donor "settle" their own pledge is safe for the demo.
// Turn off (DEMO_SETTLE=false) once a real payment rail sends creditor webhooks.
const DEMO_SETTLE = process.env.DEMO_SETTLE !== "false";
const WEB_DIST = join(dirname(fileURLToPath(import.meta.url)), "../../web/dist");

const engine = createDemoEngine();
const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const donorId = (req: Request) => String(req.header("x-donor-id") ?? "donor_demo");
const param = (req: Request, name: string) => String(req.params[name]);

function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.header("x-admin-key") !== ADMIN_KEY) throw new EngineError("forbidden", "Caseworker access only.");
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bulldoger", ...engine.stats() });
});

// ------------------------------------------------------------ donor side

app.get("/api/me", (req, res) => {
  res.json(engine.getDonor(donorId(req)));
});

app.get("/api/me/funding-source", async (req, res) => {
  res.json({ label: await engine.fundingSourceLabel(donorId(req)) });
});

app.get("/api/feed", (req, res) => {
  res.json(engine.feed(donorId(req), Number(req.query.limit ?? 20)));
});

app.post("/api/swipes", (req, res) => {
  const { caseId, direction } = req.body ?? {};
  if (direction !== "left" && direction !== "right") throw new EngineError("invalid", "direction must be left|right");
  res.status(201).json(engine.swipe(donorId(req), String(caseId), direction));
});

app.get("/api/pledges", (req, res) => {
  res.json(engine.pledgesFor(donorId(req)));
});

app.post("/api/pledges/:id/confirm", async (req, res) => {
  const pledge = await engine.confirmPledge(param(req, "id"), donorId(req), req.body?.message);
  res.json(pledge);
});

// -------------------------------------------------------- recipient side

app.post("/api/applications", async (req, res) => {
  const result = await engine.apply(req.body);
  if (!result.ok) {
    res.status(422).json({ error: "ineligible", reasons: result.reasons });
    return;
  }
  // Applicants see their own status but not internal check notes.
  res.status(201).json({ id: result.case.id, status: result.case.status });
});

app.get("/api/applications/:id", (req, res) => {
  const c = engine.getCase(param(req, "id"));
  res.json({
    id: c.id,
    status: c.status,
    rejectionReason: c.rejectionReason,
    checks: c.checks.map(({ kind, status }) => ({ kind, status })),
  });
});

// ---------------------------------------------------- caseworker / admin

app.get("/api/admin/queue", requireAdmin, (_req, res) => {
  res.json(engine.reviewQueue());
});

app.post("/api/admin/cases/:id/checks/:kind", requireAdmin, (req, res) => {
  const { status, notes } = req.body ?? {};
  res.json(engine.reviewCheck(param(req, "id"), param(req, "kind") as CheckKind, status as CheckStatus, notes));
});

/** Payment rail webhook stand-in: a creditor confirmed it posted a payment. */
app.post("/api/webhooks/rail/:pledgeId/:disbursementId", requireAdmin, (req, res) => {
  res.json(engine.markDisbursementConfirmed(param(req, "pledgeId"), param(req, "disbursementId")));
});

app.post("/api/admin/pledges/:id/settle", requireAdmin, (req, res) => {
  res.json(engine.settleAll(param(req, "id")));
});

/** Demo only: simulate every creditor confirming, for the donor's own pledge. */
app.post("/api/demo/pledges/:id/settle", (req, res) => {
  if (!DEMO_SETTLE) throw new EngineError("forbidden", "Demo settlement is turned off.");
  const id = param(req, "id");
  if (!engine.pledgesFor(donorId(req)).some((p) => p.id === id)) throw new EngineError("not_found", "Pledge not found");
  res.json(engine.settleAll(id));
});

// ------------------------------------------------------------ web app

// Serve the built web app (npm run build) from the same origin as the API.
if (existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(WEB_DIST, "index.html")));
}

// ---------------------------------------------------------------- errors

const STATUS: Record<EngineError["code"], number> = { not_found: 404, forbidden: 403, conflict: 409, invalid: 400 };

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof EngineError) {
    res.status(STATUS[err.code]).json({ error: err.code, message: err.message, details: err.details });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "internal", message: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`🐶🚜 Bulldoger API listening on http://localhost:${PORT}`);
});
