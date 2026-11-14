import { useEffect, useState } from "react";
import { formatUSD } from "@bulldoger/shared";
import { ArrowRight, Check, Clock, Receipt, Users, Wallet, X } from "lucide-react";
import { api, type PledgeWithCard } from "../api.ts";
import { Mascot, Portrait } from "../brand.tsx";
import { Doge } from "./Doge.tsx";

const STATUS: Record<string, { label: string; tone: "good" | "wait" | "muted"; icon: typeof Check }> = {
  awaiting_confirmation: { label: "Awaiting confirmation", tone: "wait", icon: Clock },
  confirmed: { label: "Confirmed", tone: "wait", icon: Clock },
  disbursing: { label: "Paying creditors", tone: "wait", icon: Clock },
  completed: { label: "Bulldoged", tone: "good", icon: Check },
  cancelled: { label: "Funded by another donor", tone: "muted", icon: X },
  expired: { label: "Hold expired", tone: "muted", icon: X },
};

export function Pledges() {
  const [items, setItems] = useState<PledgeWithCard[] | null>(null);
  useEffect(() => {
    void api.pledges().then(setItems);
  }, []);

  if (!items) {
    return (
      <div className="state">
        <Mascot pose="dozer" height={110} className="rumble" />
      </div>
    );
  }

  const done = items.filter((p) => p.status === "completed");
  const total = done.reduce((s, p) => s + p.amountCents, 0);
  const bills = done.reduce((s, p) => s + p.disbursements.length, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Portfolio</span>
          <h1 className="page-title">
            My <Doge>bulldoges</Doge>
          </h1>
        </div>
      </div>

      <section className="impact-hero">
        <div className="impact-main">
          <span className="eyebrow">Total <Doge>bulldoged</Doge></span>
          <span className="impact-amount">{formatUSD(total)}</span>
          <span className="impact-sub">Paid directly to creditors on behalf of verified people</span>
        </div>
        <Mascot pose={done.length ? "celebrate" : "wave"} height={150} className="impact-mascot" />
      </section>

      <section className="stat-grid" aria-label="Impact">
        <div className="stat">
          <Users size={18} aria-hidden />
          <span className="stat-value">{done.length}</span>
          <span className="stat-label">{done.length === 1 ? "Person helped" : "People helped"}</span>
        </div>
        <div className="stat">
          <Receipt size={18} aria-hidden />
          <span className="stat-value">{bills}</span>
          <span className="stat-label">Bills cleared</span>
        </div>
        <div className="stat">
          <Wallet size={18} aria-hidden />
          <span className="stat-value">{done.length ? formatUSD(Math.round(total / done.length)) : "—"}</span>
          <span className="stat-label">Average payoff</span>
        </div>
      </section>

      <section className="panel" aria-label="Activity">
        <h2 className="panel-title">Activity</h2>
        {items.length === 0 ? (
          <div className="state compact">
            <p className="muted">Nothing yet. Every verified case you fund will show up here with its full payment trail.</p>
            <a className="btn btn-primary" href="#swipe">
              Review verified cases <ArrowRight size={16} aria-hidden />
            </a>
          </div>
        ) : (
          <ul className="activity">
            {items.map((p) => {
              const s = STATUS[p.status] ?? { label: p.status, tone: "muted" as const, icon: Clock };
              return (
                <li key={p.id}>
                  <Portrait card={p.card} size={44} />
                  <div className="activity-main">
                    <b>
                      {p.card.firstName} · {p.card.city}, {p.card.state}
                    </b>
                    <small>{p.card.headline}</small>
                  </div>
                  <span className={`status status-${s.tone}`}>
                    <s.icon size={13} strokeWidth={2.5} aria-hidden /> <Doge>{s.label}</Doge>
                  </span>
                  <span className="activity-amount">{formatUSD(p.amountCents)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
