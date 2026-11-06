import { useCallback, useEffect, useRef, useState } from "react";
import { formatUSD, type Pledge, type PublicCard, type SwipeDirection } from "@bulldoger/shared";
import { api } from "../api.ts";
import { StoryCard } from "./StoryCard.tsx";
import { Doge } from "./Doge.tsx";

const THRESHOLD = 110;

type Sheet =
  | { kind: "confirm"; card: PublicCard; pledge: Pledge }
  | { kind: "paying"; card: PublicCard; pledge: Pledge }
  | { kind: "done"; card: PublicCard; pledge: Pledge };

export function SwipeDeck({ onBulldoged }: { onBulldoged: () => void }) {
  const [cards, setCards] = useState<PublicCard[] | null>(null);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const start = useRef<number | null>(null);

  const load = useCallback(() => {
    api.feed().then(setCards).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const top = cards?.[0];

  const commit = useCallback(
    async (direction: SwipeDirection) => {
      if (!top || leaving) return;
      setLeaving(direction);
      setDx(direction === "right" ? 600 : -600);
      try {
        const { pledge } = await api.swipe(top.id, direction);
        if (direction === "right" && pledge) setSheet({ kind: "confirm", card: top, pledge });
      } catch (e) {
        setError((e as Error).message);
      }
      window.setTimeout(() => {
        setCards((cs) => cs?.slice(1) ?? null);
        setDx(0);
        setLeaving(null);
      }, 250);
    },
    [top, leaving],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || (e.target as HTMLElement).closest("input,textarea")) return;
      if (e.key === "ArrowLeft") void commit("left");
      if (e.key === "ArrowRight") void commit("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, sheet]);

  async function confirm(message: string) {
    if (sheet?.kind !== "confirm") return;
    try {
      const paying = await api.confirm(sheet.pledge.id, message || undefined);
      setSheet({ kind: "paying", card: sheet.card, pledge: paying });
      // In production the rail's webhook confirms each creditor payment.
      window.setTimeout(async () => {
        const done = await api.settle(paying.id);
        setSheet({ kind: "done", card: sheet.card, pledge: done });
        onBulldoged();
      }, 1600);
    } catch (e) {
      setError((e as Error).message);
      setSheet(null);
    }
  }

  if (error) return <div className="empty">⚠️ {error}</div>;
  if (!cards) return <div className="empty">Warming up the engine…</div>;

  return (
    <section className="deck-wrap">
      <div className="deck">
        {cards.length === 0 && (
          <div className="empty">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={120} />
            <p>You've seen every verified story for now.</p>
            <p className="muted">New cases appear as caseworkers finish verifying them.</p>
          </div>
        )}
        {cards
          .slice(0, 2)
          .reverse()
          .map((card) => {
            const isTop = card.id === top?.id;
            const style = isTop
              ? {
                  transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
                  transition: start.current === null ? "transform .25s ease" : "none",
                }
              : { transform: "scale(.96) translateY(10px)" };
            return (
              <div
                key={card.id}
                className={`deck-card ${isTop ? "top" : ""}`}
                style={style}
                onPointerDown={
                  isTop
                    ? (e) => {
                        start.current = e.clientX;
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      }
                    : undefined
                }
                onPointerMove={isTop ? (e) => start.current !== null && setDx(e.clientX - start.current) : undefined}
                onPointerUp={
                  isTop
                    ? () => {
                        start.current = null;
                        if (dx > THRESHOLD) void commit("right");
                        else if (dx < -THRESHOLD) void commit("left");
                        else setDx(0);
                      }
                    : undefined
                }
              >
                {isTop && (
                  <>
                    <span className="stamp stamp-right" style={{ opacity: Math.max(0, dx / THRESHOLD) }}>
                      <Doge>BULLDOGE</Doge>
                    </span>
                    <span className="stamp stamp-left" style={{ opacity: Math.max(0, -dx / THRESHOLD) }}>
                      PASS
                    </span>
                  </>
                )}
                <StoryCard card={card} />
              </div>
            );
          })}
      </div>

      {top && (
        <div className="actions">
          <button className="btn-round pass" onClick={() => void commit("left")} aria-label={`Pass on ${top.firstName}`}>
            ✕
          </button>
          <button className="btn-round bulldoge" onClick={() => void commit("right")} aria-label={`Bulldoge ${top.firstName}'s bills`}>
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={54} height={54} />
          </button>
        </div>
      )}

      {sheet && <PledgeSheet sheet={sheet} onConfirm={confirm} onClose={() => setSheet(null)} />}
    </section>
  );
}

const LEDGER_LABELS: Record<string, string> = {
  funds_authorized: "Funds held on your payment method",
  payee_verified: "Creditor account verified",
  payoff_quoted: "Payoff amount re-confirmed",
  funds_captured: "Your payment captured",
  disbursement_sent: "Sent to creditor",
  creditor_confirmed: "Creditor confirmed receipt",
};

function PledgeSheet({ sheet, onConfirm, onClose }: { sheet: Sheet; onConfirm: (msg: string) => void; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [source, setSource] = useState<string>("");
  useEffect(() => {
    void api.fundingSource().then(setSource);
  }, []);
  const { card, pledge } = sheet;
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Confirm payment">
      <div className="sheet">
        {sheet.kind === "confirm" && (
          <>
            <h2>
              <Doge>Bulldoge</Doge> {card.firstName}'s bills?
            </h2>
            <p className="muted">
              Your money goes <strong>straight to the creditors</strong> below, never as cash. {card.firstName} gets a
              notification when each one is paid.
            </p>
            <ul className="debts">
              {card.debts.map((d) => (
                <li key={d.id}>
                  <span>{d.creditorName}</span>
                  <b>{formatUSD(d.amountCents)}</b>
                </li>
              ))}
              <li className="total">
                <span>Total</span>
                <b>{formatUSD(pledge.amountCents)}</b>
              </li>
            </ul>
            <p className="paying-from">
              <span>Paying from</span> <b>{source || "…"}</b>
            </p>
            <label className="field">
              Note to {card.firstName} (optional)
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={2} placeholder="Rooting for you." />
            </label>
            <p className="fine">
              Held for 48 hours. Payoff amounts are re-confirmed with each creditor before payment. Gifts to individuals are
              generally not tax-deductible.
            </p>
            <div className="sheet-actions">
              <button className="btn ghost" onClick={onClose}>
                Not now
              </button>
              <button className="btn primary" onClick={() => onConfirm(message)}>
                Pay {formatUSD(pledge.amountCents)}
              </button>
            </div>
          </>
        )}
        {sheet.kind === "paying" && (
          <div className="center">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={120} className="rumble" />
            <h2>
              <Doge>Bulldoging…</Doge>
            </h2>
            <p className="muted">Sending {pledge.disbursements.length} payment(s) directly to creditors.</p>
          </div>
        )}
        {sheet.kind === "done" && (
          <div className="center">
            <div className="confetti" aria-hidden>
              🎉
            </div>
            <h2>
              <Doge>Bulldoged!</Doge>
            </h2>
            <p>
              {formatUSD(pledge.amountCents)} of {card.firstName}'s bills are paid off.
            </p>
            <ul className="debts">
              {pledge.disbursements.map((d) => (
                <li key={d.id}>
                  <span>
                    {d.creditorName}
                    <small>ref {d.externalRef}</small>
                  </span>
                  <b>✅ Paid</b>
                </li>
              ))}
            </ul>
            <details className="trail">
              <summary>Payment trail ({pledge.ledger.length} steps)</summary>
              <ol>
                {pledge.ledger.map((l, i) => (
                  <li key={i}>
                    {LEDGER_LABELS[l.event] ?? l.event}
                    {l.amountCents ? ` · ${formatUSD(l.amountCents)}` : ""}
                    {l.ref ? <small> {l.ref}</small> : null}
                  </li>
                ))}
              </ol>
            </details>
            <p className="fine">Demo: every processor is mocked. No real money moved.</p>
            <button className="btn primary" onClick={onClose}>
              Keep swiping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
