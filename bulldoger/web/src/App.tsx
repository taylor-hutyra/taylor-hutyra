import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { ApplyForm } from "./components/ApplyForm.tsx";
import { HowItWorks } from "./components/HowItWorks.tsx";
import { Pledges } from "./components/Pledges.tsx";
import { SwipeDeck } from "./components/SwipeDeck.tsx";
import { Doge } from "./components/Doge.tsx";

const TABS = [
  { id: "swipe", label: "Swipe", icon: "👆" },
  { id: "bulldoged", label: "My bulldoges", icon: "🐶" },
  { id: "apply", label: "Get help", icon: "📝" },
  { id: "how", label: "How it works", icon: "🛡️" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function readTab(): Tab {
  const h = location.hash.replace("#", "");
  return (TABS.find((t) => t.id === h)?.id ?? "swipe") as Tab;
}

export function App() {
  const [tab, setTab] = useState<Tab>(readTab);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="topbar-logo" />
        <div>
          <h1>
            <Doge>Bulldoger</Doge>
          </h1>
          <p className="tagline">
            Swipe right. <Doge>Bulldoge</Doge> a bill.
          </p>
        </div>
        <span className="pill" title="Fictional sample data and mocked payments: no real money moves">
          Demo
        </span>
      </header>

      <main className="content">
        {tab === "swipe" && <SwipeDeck onBulldoged={() => setRefreshKey((k) => k + 1)} />}
        {tab === "bulldoged" && <Pledges key={refreshKey} />}
        {tab === "apply" && <ApplyForm />}
        {tab === "how" && <HowItWorks />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <a key={t.id} href={`#${t.id}`} className={t.id === tab ? "active" : ""} aria-current={t.id === tab ? "page" : undefined}>
            <span className="tab-icon" aria-hidden>
              {t.icon}
            </span>
            <span className="tab-label">
              <Doge>{t.label}</Doge>
            </span>
          </a>
        ))}
      </nav>
    </div>
  );
}
