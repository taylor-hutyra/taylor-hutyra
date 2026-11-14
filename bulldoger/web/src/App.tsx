import { useEffect, useState } from "react";
import { formatUSD } from "@bulldoger/shared";
import { Compass, HandHeart, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { api } from "./api.ts";
import { BrandIcon, Mascot, Wordmark } from "./brand.tsx";
import { ApplyForm } from "./components/ApplyForm.tsx";
import { Doge } from "./components/Doge.tsx";
import { HowItWorks } from "./components/HowItWorks.tsx";
import { Pledges } from "./components/Pledges.tsx";
import { SwipeDeck } from "./components/SwipeDeck.tsx";

const TABS: ReadonlyArray<{ id: string; label: string; short: string; icon: LucideIcon }> = [
  { id: "swipe", label: "Discover", short: "Discover", icon: Compass },
  { id: "bulldoged", label: "My bulldoges", short: "Portfolio", icon: Wallet },
  { id: "apply", label: "Get help", short: "Get help", icon: HandHeart },
  { id: "how", label: "How it works", short: "How it works", icon: ShieldCheck },
];
type Tab = "swipe" | "bulldoged" | "apply" | "how";

function readTab(): Tab {
  const h = location.hash.replace("#", "");
  return (TABS.find((t) => t.id === h)?.id ?? "swipe") as Tab;
}

export function App() {
  const [tab, setTab] = useState<Tab>(readTab);
  const [refreshKey, setRefreshKey] = useState(0);
  const [impact, setImpact] = useState({ cents: 0, people: 0 });

  useEffect(() => {
    const onHash = () => {
      setTab(readTab());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    void api.pledges().then((ps) => {
      const done = ps.filter((p) => p.status === "completed");
      setImpact({ cents: done.reduce((s, p) => s + p.amountCents, 0), people: done.length });
    });
  }, [refreshKey]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#swipe" aria-label="Bulldoger home">
          <BrandIcon size={44} />
          <Wordmark />
        </a>
        <nav className="side-nav" aria-label="Sections">
          {TABS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className={t.id === tab ? "active" : ""} aria-current={t.id === tab ? "page" : undefined}>
              <t.icon size={19} aria-hidden />
              <Doge>{t.label}</Doge>
            </a>
          ))}
        </nav>
        <div className="side-impact">
          <Mascot pose="thumbs" height={92} className="side-mascot" />
          <span className="eyebrow">Your impact</span>
          <span className="side-amount">{formatUSD(impact.cents)}</span>
          <small>
            <Doge>bulldoged</Doge> for {impact.people} {impact.people === 1 ? "person" : "people"}
          </small>
        </div>
        <p className="side-demo">
          <span className="dot" aria-hidden /> Demo mode · no real money moves
        </p>
      </aside>

      <header className="topbar">
        <a className="brand" href="#swipe" aria-label="Bulldoger home">
          <BrandIcon size={36} />
          <Wordmark />
        </a>
        <span className="demo-chip" title="Fictional sample data and mocked payments: no real money moves">
          <span className="dot" aria-hidden /> Demo
        </span>
      </header>

      <main className="main">
        {tab === "swipe" && <SwipeDeck onBulldoged={() => setRefreshKey((k) => k + 1)} />}
        {tab === "bulldoged" && <Pledges key={refreshKey} />}
        {tab === "apply" && <ApplyForm />}
        {tab === "how" && <HowItWorks />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <a key={t.id} href={`#${t.id}`} className={t.id === tab ? "active" : ""} aria-current={t.id === tab ? "page" : undefined}>
            <t.icon size={22} aria-hidden />
            <span>{t.short}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
