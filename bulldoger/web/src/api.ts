import {
  createDemoEngine,
  EngineError,
  type ApplicationInput,
  type Donor,
  type Pledge,
  type PublicCard,
  type SwipeDirection,
} from "@bulldoger/shared";

export type PledgeWithCard = Pledge & { card: PublicCard };
export type ApplyResponse = { ok: true; id: string; status: string } | { ok: false; reasons: string[] };

/** One interface, two backends: the real API, or the engine running in-browser. */
export interface Api {
  readonly mode: "live" | "demo";
  me(): Promise<Donor>;
  feed(): Promise<PublicCard[]>;
  swipe(caseId: string, direction: SwipeDirection): Promise<{ pledge?: Pledge }>;
  pledges(): Promise<PledgeWithCard[]>;
  confirm(pledgeId: string, message?: string): Promise<Pledge>;
  /** Demo only: simulate creditors confirming the payments. */
  settle(pledgeId: string): Promise<Pledge>;
  apply(input: ApplicationInput): Promise<ApplyResponse>;
}

const DONOR_ID = "donor_demo";

function demoApi(): Api {
  const engine = createDemoEngine();
  const wrap = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    try {
      return structuredClone(await fn());
    } catch (e) {
      throw e instanceof EngineError ? new Error(e.message) : e;
    }
  };
  return {
    mode: "demo",
    me: () => wrap(() => engine.getDonor(DONOR_ID)),
    feed: () => wrap(() => engine.feed(DONOR_ID)),
    swipe: (id, dir) => wrap(() => engine.swipe(DONOR_ID, id, dir)),
    pledges: () => wrap(() => engine.pledgesFor(DONOR_ID)),
    confirm: (id, msg) => wrap(() => engine.confirmPledge(id, DONOR_ID, msg)),
    settle: (id) => wrap(() => engine.settleAll(id)),
    apply: (input) =>
      wrap(async () => {
        const r = await engine.apply(input);
        return r.ok ? { ok: true as const, id: r.case.id, status: r.case.status } : r;
      }),
  };
}

function liveApi(base: string): Api {
  async function call<T>(path: string, init?: RequestInit & { admin?: boolean }): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-donor-id": DONOR_ID,
        ...(init?.admin ? { "x-admin-key": import.meta.env.VITE_ADMIN_KEY ?? "dev-admin-key" } : {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 422) return { ok: false, ...body } as T;
    if (!res.ok) throw new Error(body.message ?? `Request failed (${res.status})`);
    return body as T;
  }
  return {
    mode: "live",
    me: () => call("/api/me"),
    feed: () => call("/api/feed"),
    swipe: (caseId, direction) => call("/api/swipes", { method: "POST", body: JSON.stringify({ caseId, direction }) }),
    pledges: () => call("/api/pledges"),
    confirm: (id, message) => call(`/api/pledges/${id}/confirm`, { method: "POST", body: JSON.stringify({ message }) }),
    settle: (id) => call(`/api/admin/pledges/${id}/settle`, { method: "POST", admin: true }),
    apply: async (input) => {
      const r = await call<{ id?: string; status?: string; ok?: false; reasons?: string[] }>("/api/applications", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return r.ok === false ? { ok: false, reasons: r.reasons ?? [] } : { ok: true, id: r.id!, status: r.status! };
    },
  };
}

const base = import.meta.env.VITE_API_URL as string | undefined;
export const api: Api = base ? liveApi(base.replace(/\/$/, "")) : demoApi();
