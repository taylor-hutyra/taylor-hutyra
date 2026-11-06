import { Doge } from "./Doge.tsx";

const STEPS = [
  { icon: "📝", title: "They apply", body: "People share their story, a photo, and the specific bills holding them back." },
  { icon: "🪪", title: "Identity check", body: "KYC confirms they're a real person and match the story." },
  { icon: "📄", title: "Bills verified", body: "Statements are reviewed and each payoff amount is confirmed directly with the creditor." },
  { icon: "🔎", title: "Background screen", body: "Screened for gambling, fraud and repeat requests. Gambling debts are never eligible." },
  { icon: "🧑‍⚖️", title: "Caseworker review", body: "A human reads every story before it goes live. No exceptions." },
  { icon: "👉", title: "You swipe right", body: "You see the story, the bills, and the total. Confirm to bulldoge." },
  { icon: "🏦", title: "Creditor-direct", body: "Money goes straight to the landlord, hospital, or school. Never cash in hand." },
];

export function HowItWorks() {
  return (
    <section className="panel">
      <h2>
        How <Doge>Bulldoger</Doge> keeps it real
      </h2>
      <ol className="steps">
        {STEPS.map((s) => (
          <li key={s.title}>
            <span className="step-icon" aria-hidden>
              {s.icon}
            </span>
            <div>
              <strong>{s.title}</strong>
              <p>
                <Doge>{s.body}</Doge>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
