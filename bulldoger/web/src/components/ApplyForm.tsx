import { useState } from "react";
import {
  CATEGORY_LABELS,
  DEBT_TYPE_LABELS,
  ELIGIBLE_DEBT_TYPES,
  type ApplicationInput,
  type DebtType,
  type StoryCategory,
} from "@bulldoger/shared";
import { api, type ApplyResponse } from "../api.ts";

type DebtRow = { type: DebtType; creditorName: string; last4: string; amount: string };
const emptyDebt = (): DebtRow => ({ type: "medical", creditorName: "", last4: "", amount: "" });

export function ApplyForm() {
  const [form, setForm] = useState({
    firstName: "",
    age: "",
    city: "",
    state: "",
    category: "single_parent" as StoryCategory,
    headline: "",
    story: "",
    unlocks: "",
    consent: false,
  });
  const [debts, setDebts] = useState<DebtRow[]>([emptyDebt()]);
  const [result, setResult] = useState<ApplyResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const setDebt = (i: number, k: keyof DebtRow, v: string) =>
    setDebts((ds) => ds.map((d, j) => (j === i ? { ...d, [k]: v } : d)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input: ApplicationInput = {
      firstName: form.firstName,
      age: form.age ? Number(form.age) : undefined,
      city: form.city,
      state: form.state,
      category: form.category,
      headline: form.headline,
      story: form.story,
      unlocks: form.unlocks,
      consentToShare: form.consent,
      debts: debts.map((d) => ({
        type: d.type,
        creditorName: d.creditorName,
        accountMask: `•••• ${d.last4}`,
        amountCents: Math.round(Number(d.amount) * 100),
      })),
    };
    setResult(await api.apply(input));
    setBusy(false);
  }

  if (result?.ok) {
    return (
      <section className="panel center">
        <h2>Application received 🐶</h2>
        <p>
          Your case <code>{result.id}</code> is <strong>{result.status.replace("_", " ")}</strong>.
        </p>
        <p className="muted">
          Next: a caseworker reads your story and we confirm each balance directly with your creditor. You'll be notified
          before anything goes live, and you can withdraw at any time.
        </p>
      </section>
    );
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>Tell your story</h2>
      <p className="muted">
        Every story is verified before anyone sees it. Payments go directly to your creditors. We only show your first
        name, city and the bills you choose to share.
      </p>

      <div className="row">
        <label className="field">
          First name
          <input required value={form.firstName} onChange={set("firstName")} />
        </label>
        <label className="field narrow">
          Age
          <input type="number" min={16} max={120} value={form.age} onChange={set("age")} />
        </label>
      </div>
      <div className="row">
        <label className="field">
          City
          <input required value={form.city} onChange={set("city")} />
        </label>
        <label className="field narrow">
          State
          <input required maxLength={2} value={form.state} onChange={set("state")} placeholder="OH" />
        </label>
      </div>
      <label className="field">
        What best describes you?
        <select value={form.category} onChange={set("category")}>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Headline
        <input required maxLength={90} value={form.headline} onChange={set("headline")} placeholder="One line donors see first" />
      </label>
      <label className="field">
        Your story
        <textarea required rows={5} value={form.story} onChange={set("story")} placeholder="What happened, and where you are now (80+ characters)" />
      </label>
      <label className="field">
        What would paying this off unlock?
        <input required value={form.unlocks} onChange={set("unlocks")} placeholder="Keep my apartment, re-enroll in school…" />
      </label>

      <h3>Your bills</h3>
      {debts.map((d, i) => (
        <fieldset key={i} className="debt-row">
          <select value={d.type} onChange={(e) => setDebt(i, "type", e.target.value)} aria-label="Bill type">
            {ELIGIBLE_DEBT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DEBT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <input required placeholder="Who is it owed to?" value={d.creditorName} onChange={(e) => setDebt(i, "creditorName", e.target.value)} />
          <input required placeholder="Last 4 of acct" inputMode="numeric" pattern="\d{4}" maxLength={4} value={d.last4} onChange={(e) => setDebt(i, "last4", e.target.value)} />
          <input required placeholder="$ Amount" type="number" min={50} step="0.01" value={d.amount} onChange={(e) => setDebt(i, "amount", e.target.value)} />
          {debts.length > 1 && (
            <button type="button" className="btn ghost" onClick={() => setDebts((ds) => ds.filter((_, j) => j !== i))} aria-label="Remove bill">
              ✕
            </button>
          )}
        </fieldset>
      ))}
      <button type="button" className="btn ghost" onClick={() => setDebts((ds) => [...ds, emptyDebt()])}>
        + Add another bill
      </button>
      <p className="fine">
        You'll upload statements and verify your identity in the next step. Gambling debts, payday-loan rollovers, margin
        loans and court restitution aren't eligible.
      </p>

      <label className="check">
        <input type="checkbox" checked={form.consent} onChange={set("consent")} /> I agree to share this story and these bills
        with verified donors, and to a background screen.
      </label>

      {result && !result.ok && (
        <ul className="errors" role="alert">
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <button className="btn primary" disabled={busy}>
        {busy ? "Submitting…" : "Submit for verification"}
      </button>
    </form>
  );
}
