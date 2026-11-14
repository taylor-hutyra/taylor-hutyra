import { useCallback, useEffect, useRef, useState } from "react";
import { formatUSD, type CheckKind, type Pledge, type PublicCard, type SwipeDirection } from "@bulldoger/shared";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  FileCheck2,
  Fingerprint,
  Lock,
  ScanSearch,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { api } from "../api.ts";
import { BrandIcon, Mascot } from "../brand.tsx";
import { Doge } from "./Doge.tsx";
import { StoryCard } from "./StoryCard.tsx";

const THRESHOLD = 110;

type Sheet =
  | { kind: "confirm"; card: PublicCard; pledge: Pledge }
  | { kind: "paying"; card: PublicCard; pledge: Pledge }
  | { kind: "done"; card: PublicCard; pledge: Pledge };

const CHECKS: Array<{ kind: CheckKind; label: string; detail: string; icon: typeof Check }> = [
  { kind: "consent", label: "Consent on file", detail: "Agreed to share story and screening", icon: FileCheck2 },
  { kind: "identity", label: "Identity verified", detail: "Real person, matches the story", icon: Fingerprint },
  { kind: "debt_documents", label: "Bills documented", detail: "Statements reviewed", icon: FileCheck2 },
  { kind: "creditor_confirmation", label: "Creditor confirmed", detail: "Payoff amounts confirmed directly", icon: Building2 },
  { kind: "eligibility_screen", label: "Background screened", detail: "No gambling, fraud or repeat asks", icon: ScanSearch },
  { kind: "story_review", label: "Caseworker reviewed", detail: "A person read every word", icon: UserCheck },
];

export function SwipeDeck({ onBulldoged }: { onBulldoged: () => void }) {
  const [cards, setCards] = useState<PublicCard[] | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    api.feed().then(setCards).catch((e: Error) => setError(e.message));
  }, []);

  const top = cards?.[0];

  const commit = useCallback(
    async (direction: SwipeDirection) => {
      if (!top || leaving) return;
      setLeaving(direction);
      setDx(direction === "right" ? 700 : -700);
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
      }, 260);
    },
    [top, leaving],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || (e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "ArrowLeft") void commit("left");
      if (e.key === "ArrowRight") void commit("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, sheet]);

  async function confirm(message: string) {
    if (sheet?.kind !== "confirm") return;
    const { card } = sheet;
    try {
      const paying = await api.confirm(sheet.pledge.id, message || undefined);
      setSheet({ kind: "paying", card, pledge: paying });
      // In production the payment rail's webhook confirms each creditor payment.
      window.setTimeout(async () => {
        const done = await api.settle(paying.id);
        setSheet({ kind: "done", card, pledge: done });
        onBulldoged();
      }, 2200);
    } catch (e) {
      setError((e as Error).message);
      setSheet(null);
    }
  }

  if (error) {
    return (
      <div className="state">
        <Mascot pose="thumbs" height={140} />
        <h2>Something went sideways</h2>
        <p className="muted">{error}</p>
        <button className="btn btn-secondary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (!cards) {
    return (
      <div className="state">
        <Mascot pose="dozer" height={120} className="rumble" />
        <p className="muted">Warming up the engine…</p>
      </div>
    );
  }

  return (
    <div className="discover">
      <section className="deck-col" aria-label="Verified cases">
        <div className="page-head">
          <div>
            <span className="eyebrow">Discover</span>
            <h1 className="page-title">Verified cases</h1>
          </div>
          {cards.length > 0 && (
            <span className="count-pill">
              <BadgeCheck size={15} aria-hidden /> {cards.length} awaiting
            </span>
          )}
        </div>

        <div className="deck">
          {cards.length === 0 && (
            <div className="state deck-empty">
              <Mascot pose="thumbs" height={150} />
              <h2>You've reviewed every verified case</h2>
              <p className="muted">New cases appear here as caseworkers finish verifying them.</p>
            </div>
          )}
          {cards
            .slice(0, 3)
            .reverse()
            .map((card, i, arr) => {
              const depth = arr.length - 1 - i; // 0 = top
              const isTop = depth === 0;
              const style = isTop
                ? {
                    transform: `translateX(${dx}px) rotate(${dx / 22}deg)`,
                    transition: dragging ? "none" : "transform .32s cubic-bezier(.2,.8,.2,1)",
                  }
                : { transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.04})`, opacity: 1 - depth * 0.25 };
              return (
                <div
                  key={card.id}
                  className={`deck-card ${isTop ? "is-top" : ""}`}
                  style={style}
                  aria-hidden={!isTop}
                  onPointerDown={
                    isTop
                      ? (e) => {
                          if ((e.target as HTMLElement).closest("button,a")) return;
                          start.current = e.clientX;
                          setDragging(true);
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        }
                      : undefined
                  }
                  onPointerMove={isTop ? (e) => start.current !== null && setDx(e.clientX - start.current) : undefined}
                  onPointerUp={
                    isTop
                      ? () => {
                          start.current = null;
                          setDragging(false);
                          if (dx > THRESHOLD) void commit("right");
                          else if (dx < -THRESHOLD) void commit("left");
                          else setDx(0);
                        }
                      : undefined
                  }
                  onPointerCancel={() => {
                    start.current = null;
                    setDragging(false);
                    setDx(0);
                  }}
                >
                  {isTop && (
                    <>
                      <span className="stamp stamp-yes" style={{ opacity: Math.min(1, Math.max(0, dx / THRESHOLD)) }}>
                        <Check size={18} strokeWidth={3} aria-hidden /> <Doge>Bulldoge</Doge>
                      </span>
                      <span className="stamp stamp-no" style={{ opacity: Math.min(1, Math.max(0, -dx / THRESHOLD)) }}>
                        <X size={18} strokeWidth={3} aria-hidden /> Pass
                      </span>
                    </>
                  )}
                  <StoryCard card={card} />
                </div>
              );
            })}
        </div>

        {top && (
          <div className="deck-actions">
            <button className="btn-pass" onClick={() => void commit("left")} aria-label={`Pass on ${top.firstName}`}>
              <X size={24} aria-hidden />
            </button>
            <button className="btn btn-primary btn-xl" onClick={() => void commit("right")}>
              <BrandIcon size={30} />
              <span>
                <Doge>Bulldoge</Doge> {formatUSD(top.totalCents)}
              </span>
            </button>
          </div>
        )}
        {top && (
          <p className="kbd-hint" aria-hidden>
            <kbd>
              <ArrowLeft size={12} />
            </kbd>{" "}
            pass · <kbd>
              <ArrowRight size={12} />
            </kbd>{" "}
            <Doge>bulldoge</Doge> · or drag the card
          </p>
        )}
      </section>

      <aside className="rail" aria-label="Due diligence">
        {top ? (
          <>
            <div className="panel">
              <span className="eyebrow">Due diligence</span>
              <h2 className="panel-title">{top.firstName}'s case file</h2>
              <ul className="checklist">
                {CHECKS.map(({ kind, label, detail, icon: Icon }) => {
                  const ok = top.verifiedChecks.includes(kind);
                  return (
                    <li key={kind} className={ok ? "ok" : ""}>
                      <span className="check-icon" aria-hidden>
                        <Icon size={16} />
                      </span>
                      <span>
                        <b>{label}</b>
                        <small>{detail}</small>
                      </span>
                      <span className="check-state">{ok ? <Check size={16} strokeWidth={3} aria-label="Passed" /> : "Pending"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="panel panel-dark">
              <span className="eyebrow">How your money moves</span>
              <ol className="flow">
                <li>
                  <Lock size={15} aria-hidden /> Funds held, not charged
                </li>
                <li>
                  <Building2 size={15} aria-hidden /> Each creditor account verified
                </li>
                <li>
                  <CreditCard size={15} aria-hidden /> Charged only when all check out
                </li>
                <li>
                  <ShieldCheck size={15} aria-hidden /> Paid straight to the creditor
                </li>
              </ol>
            </div>
          </>
        ) : (
          <div className="panel">
            <Mascot pose="wave" height={110} />
            <p className="muted">Check back soon. Caseworkers verify new stories every day.</p>
          </div>
        )}
      </aside>

      {sheet && <PledgeDialog sheet={sheet} onConfirm={confirm} onClose={() => setSheet(null)} />}
    </div>
  );
}

const LEDGER_LABELS: Record<string, string> = {
  funds_authorized: "Funds held on your payment method",
  payee_verified: "Creditor account verified",
  payoff_quoted: "Payoff amount re-confirmed",
  funds_captured: "Payment captured",
  disbursement_sent: "Sent to creditor",
  creditor_confirmed: "Creditor confirmed receipt",
};

const PAYING_STEPS = ["Holding funds on your card", "Verifying each creditor account", "Re-confirming payoff amounts", "Paying creditors directly"];

function PledgeDialog({ sheet, onConfirm, onClose }: { sheet: Sheet; onConfirm: (msg: string) => void; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void api.fundingSource().then(setSource);
  }, []);
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && sheet.kind !== "paying" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet.kind, onClose]);

  const { card, pledge } = sheet;
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && sheet.kind !== "paying" && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} ref={dialogRef}>
        {sheet.kind !== "paying" && (
          <button className="dialog-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        )}

        {sheet.kind === "confirm" && (
          <>
            <div className="dialog-hero">
              <Mascot pose="dozer-debt" height={104} />
            </div>
            <span className="eyebrow">Confirm payoff</span>
            <h2 id="dialog-title" className="dialog-title">
              <Doge>Bulldoge</Doge> {card.firstName}'s bills
            </h2>
            <p className="muted">
              Paid <strong>directly to each creditor</strong>, never as cash. {card.firstName} is notified as each bill clears.
            </p>
            <ul className="ledger-list">
              {card.debts.map((d) => (
                <li key={d.id}>
                  <span className="ledger-name">
                    <Building2 size={15} aria-hidden />
                    <span>{d.creditorName}</span>
                  </span>
                  <b>{formatUSD(d.amountCents)}</b>
                </li>
              ))}
              <li className="total">
                <span>Total</span>
                <b>{formatUSD(pledge.amountCents)}</b>
              </li>
            </ul>
            <div className="paying-from">
              <CreditCard size={18} aria-hidden />
              <span>
                <small>Paying from</small>
                <b>{source || "…"}</b>
              </span>
            </div>
            <label className="field">
              <span>Note to {card.firstName} (optional)</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={2} placeholder="Rooting for you." />
            </label>
            <p className="fine">
              <Lock size={12} aria-hidden /> Held for 48 hours. Payoffs are re-confirmed with each creditor before you're charged. Gifts to
              individuals are generally not tax-deductible.
            </p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={onClose}>
                Not now
              </button>
              <button
                className="btn btn-black"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  onConfirm(message);
                }}
              >
                Confirm {formatUSD(pledge.amountCents)}
              </button>
            </div>
          </>
        )}

        {sheet.kind === "paying" && (
          <div className="dialog-center">
            <Mascot pose="dozer" height={120} className="rumble" />
            <h2 id="dialog-title" className="dialog-title">
              <Doge>Bulldoging</Doge>…
            </h2>
            <ol className="progress-steps">
              {PAYING_STEPS.map((s, i) => (
                <li key={s} style={{ animationDelay: `${i * 450}ms` }}>
                  <span className="step-dot" style={{ animationDelay: `${i * 450 + 350}ms` }}>
                    <Check size={12} strokeWidth={3} aria-hidden />
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {sheet.kind === "done" && (
          <div className="dialog-center">
            <Mascot pose="paid" height={150} className="pop" />
            <h2 id="dialog-title" className="dialog-title">
              <Doge>Bulldoged</Doge>.
            </h2>
            <p>
              <strong>{formatUSD(pledge.amountCents)}</strong> of {card.firstName}'s bills, paid in full.
            </p>
            <ul className="ledger-list">
              {pledge.disbursements.map((d) => (
                <li key={d.id}>
                  <span className="ledger-name">
                    <Building2 size={15} aria-hidden />
                    <span>
                      {d.creditorName}
                      <small>Ref {d.externalRef}</small>
                    </span>
                  </span>
                  <span className="paid-chip">
                    <Check size={13} strokeWidth={3} aria-hidden /> Paid
                  </span>
                </li>
              ))}
            </ul>
            <details className="trail">
              <summary>
                Payment trail · {pledge.ledger.length} steps <ChevronDown size={15} aria-hidden />
              </summary>
              <ol>
                {pledge.ledger.map((l, i) => (
                  <li key={i}>
                    <span>{LEDGER_LABELS[l.event] ?? l.event}</span>
                    <small>
                      {l.amountCents ? formatUSD(l.amountCents) : ""} {l.ref ?? ""}
                    </small>
                  </li>
                ))}
              </ol>
            </details>
            <p className="fine">Demo: every processor is mocked. No real money moved.</p>
            <button className="btn btn-primary btn-block" onClick={onClose}>
              Keep going
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
