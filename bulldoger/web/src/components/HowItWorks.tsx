import { ArrowRight, Ban, Building2, FileCheck2, Fingerprint, HandCoins, Lock, ScanSearch, UserCheck } from "lucide-react";
import { asset, Mascot } from "../brand.tsx";
import { Doge } from "./Doge.tsx";

const STEPS = [
  { icon: FileCheck2, title: "They apply", body: "People share their story and the specific bills holding them back." },
  { icon: Fingerprint, title: "Identity verified", body: "KYC confirms a real person who matches the story." },
  { icon: Building2, title: "Bills confirmed", body: "Statements are reviewed and every payoff is confirmed with the creditor." },
  { icon: ScanSearch, title: "Background screened", body: "Checked for gambling, fraud and repeat requests." },
  { icon: UserCheck, title: "Caseworker review", body: "A person reads every story before it goes live. No exceptions." },
  { icon: HandCoins, title: "You bulldoge it", body: "Swipe right, confirm, and each bill is paid directly to its creditor." },
];

const RAILS = [
  { icon: Building2, title: "Creditor-direct", body: "Money goes to the landlord, hospital or school. Never cash in hand." },
  { icon: Lock, title: "Held, then charged", body: "Your card is only charged once every creditor account checks out." },
  { icon: Ban, title: "Not for gambling", body: "Gambling, payday rollovers and margin debt are never eligible." },
];

export function HowItWorks() {
  return (
    <div className="page how">
      <section className="hero">
        <picture>
          <source media="(min-width: 700px)" srcSet={asset("brand/hero.webp")} />
          <img src={asset("brand/hero-900.webp")} alt="The Bulldoger corgi driving a bulldozer through a pile of debt, leaving paid bills behind" />
        </picture>
        <div className="hero-copy">
          <span className="eyebrow">How it works</span>
          <h1>Verified need. Direct payoff.</h1>
          <p>
            <Doge>Bulldoger</Doge> connects people ready to give with people ready to get back on their feet, and makes sure
            every dollar lands exactly where it should.
          </p>
          <a className="btn btn-primary" href="#swipe">
            Review verified cases <ArrowRight size={16} aria-hidden />
          </a>
        </div>
      </section>

      <section>
        <h2 className="section-title">Six steps from story to paid</h2>
        <ol className="steps">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="step">
              <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="step-icon" aria-hidden>
                <Icon size={20} />
              </span>
              <b>
                <Doge>{title}</Doge>
              </b>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rails-band">
        <Mascot pose="dozer-debt" height={170} className="rails-mascot" />
        <div>
          <h2 className="section-title">Safety rails, built in</h2>
          <ul className="rails">
            {RAILS.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Icon size={18} aria-hidden />
                <span>
                  <b>{title}</b>
                  <small>{body}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
