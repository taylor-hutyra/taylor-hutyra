import { CATEGORY_LABELS, DEBT_TYPE_LABELS, formatUSD, type PublicCard } from "@bulldoger/shared";

const GRADIENTS: Record<string, string> = {
  student: "linear-gradient(135deg,#6a8dff,#9b6bff)",
  single_parent: "linear-gradient(135deg,#ff8a65,#ff5f8f)",
  housing_recovery: "linear-gradient(135deg,#3fbf8f,#2a9dbf)",
  medical: "linear-gradient(135deg,#ff6b6b,#f5b700)",
  veteran: "linear-gradient(135deg,#4f6d7a,#2f4858)",
  caregiver: "linear-gradient(135deg,#c56cf0,#ff9ff3)",
  disaster_recovery: "linear-gradient(135deg,#1e90ff,#00b894)",
  other: "linear-gradient(135deg,#888,#555)",
};

export function Avatar({ card, size = 96 }: { card: PublicCard; size?: number }) {
  if (card.photoUrl) {
    return <img className="avatar" src={card.photoUrl} alt={`Photo of ${card.firstName}`} style={{ width: size, height: size }} />;
  }
  return (
    <div className="avatar" style={{ width: size, height: size, background: GRADIENTS[card.category], fontSize: size * 0.42 }} aria-hidden>
      {card.firstName[0]}
    </div>
  );
}

export function StoryCard({ card }: { card: PublicCard }) {
  return (
    <article className="story-card">
      <div className="story-hero" style={{ background: GRADIENTS[card.category] }}>
        <Avatar card={card} size={84} />
        <div className="story-hero-text">
          <h2>
            {card.firstName}
            {card.age ? <span className="age">, {card.age}</span> : null}
          </h2>
          <p>
            {card.city}, {card.state} · {CATEGORY_LABELS[card.category]}
          </p>
        </div>
        <div className="story-total">
          <span>{formatUSD(card.totalCents)}</span>
          <small>to bulldoge</small>
        </div>
      </div>
      <div className="story-body">
        <h3>{card.headline}</h3>
        <p className="story-text">{card.story}</p>
        <p className="unlocks">
          <strong>This unlocks:</strong> {card.unlocks}
        </p>
        <ul className="debts">
          {card.debts.map((d) => (
            <li key={d.id}>
              <span>
                {DEBT_TYPE_LABELS[d.type]}
                <small>{d.creditorName}</small>
              </span>
              <b>{formatUSD(d.amountCents)}</b>
            </li>
          ))}
        </ul>
        <p className="verified">
          <span aria-hidden>✅</span> Verified: identity, bills, payoff confirmed with creditor, background screen, caseworker review
        </p>
      </div>
    </article>
  );
}
