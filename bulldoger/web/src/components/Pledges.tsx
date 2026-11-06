import { useEffect, useState } from "react";
import { formatUSD } from "@bulldoger/shared";
import { api, type PledgeWithCard } from "../api.ts";
import { Avatar } from "./StoryCard.tsx";
import { Doge } from "./Doge.tsx";

const STATUS_LABEL: Record<string, string> = {
  awaiting_confirmation: "Waiting for you to confirm",
  confirmed: "Confirmed",
  disbursing: "Paying creditors…",
  completed: "Bulldoged ✅",
  cancelled: "Someone beat you to it",
  expired: "Hold expired",
};

export function Pledges() {
  const [items, setItems] = useState<PledgeWithCard[] | null>(null);
  useEffect(() => {
    void api.pledges().then(setItems);
  }, []);

  if (!items) return <div className="empty">Loading…</div>;
  const done = items.filter((p) => p.status === "completed");
  const total = done.reduce((s, p) => s + p.amountCents, 0);

  return (
    <section className="panel">
      <div className="stat">
        <span>{formatUSD(total)}</span>
        <small>
          <Doge>bulldoged</Doge> across {done.length} {done.length === 1 ? "person" : "people"}
        </small>
      </div>
      {items.length === 0 && <p className="empty">Swipe right on a story to <Doge>bulldoge</Doge> your first bill.</p>}
      <ul className="pledge-list">
        {items.map((p) => (
          <li key={p.id}>
            <Avatar card={p.card} size={48} />
            <div>
              <strong>{p.card.firstName}</strong>
              <small>{p.card.headline}</small>
              <small className={`status status-${p.status}`}><Doge>{STATUS_LABEL[p.status] ?? p.status}</Doge></small>
            </div>
            <b>{formatUSD(p.amountCents)}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
