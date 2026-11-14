import { CATEGORY_LABELS, DEBT_TYPE_LABELS, formatUSD, type PublicCard } from "@bulldoger/shared";
import { KeyRound, MapPin, ShieldCheck } from "lucide-react";
import { CATEGORY_ICONS, DEBT_ICONS, Portrait } from "../brand.tsx";
import { Doge } from "./Doge.tsx";

export function StoryCard({ card }: { card: PublicCard }) {
  const CategoryIcon = CATEGORY_ICONS[card.category];
  return (
    <article className="story-card" aria-label={`${card.firstName}'s story`}>
      <header className="story-head">
        <Portrait card={card} size={56} />
        <div className="story-who">
          <h2>
            {card.firstName}
            {card.age ? <span className="story-age">, {card.age}</span> : null}
          </h2>
          <p>
            <MapPin size={14} aria-hidden /> {card.city}, {card.state}
          </p>
        </div>
        <span className={`chip tone-${card.category}`}>
          <CategoryIcon size={14} aria-hidden />
          {CATEGORY_LABELS[card.category]}
        </span>
      </header>

      <div className="story-amount">
        <div>
          <span className="eyebrow">
            To <Doge>bulldoge</Doge>
          </span>
          <span className="amount">{formatUSD(card.totalCents)}</span>
        </div>
        <span className="verified-badge">
          <ShieldCheck size={15} aria-hidden /> Verified
        </span>
      </div>

      <div className="story-body">
        <h3 className="story-headline">{card.headline}</h3>
        <p className="story-text">{card.story}</p>

        <div className="unlocks">
          <span className="unlocks-icon" aria-hidden>
            <KeyRound size={16} />
          </span>
          <div>
            <span className="eyebrow">What this unlocks</span>
            <p>{card.unlocks}</p>
          </div>
        </div>

        <ul className="bills" aria-label="Bills">
          {card.debts.map((d) => {
            const Icon = DEBT_ICONS[d.type];
            return (
              <li key={d.id}>
                <span className="bill-icon" aria-hidden>
                  <Icon size={17} />
                </span>
                <span className="bill-text">
                  <b>{DEBT_TYPE_LABELS[d.type]}</b>
                  <small>{d.creditorName}</small>
                </span>
                <span className="bill-amount">{formatUSD(d.amountCents)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="story-foot">
        <ShieldCheck size={15} aria-hidden />
        {card.verifiedChecks.length} of 6 checks passed · Paid directly to creditors
      </footer>
    </article>
  );
}
