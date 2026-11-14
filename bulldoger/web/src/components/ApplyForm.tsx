import { useState } from "react";
import {
  CATEGORY_LABELS,
  DEBT_TYPE_LABELS,
  ELIGIBLE_DEBT_TYPES,
  type ApplicationInput,
  type DebtType,
  type StoryCategory,
} from "@bulldoger/shared";
import { AlertCircle, Building2, EyeOff, Plus, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { api, type ApplyResponse } from "../api.ts";
import { Mascot } from "../brand.tsx";

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
  const setDebt = (i: number, k: keyof DebtRow, v: string) => setDebts((ds) => ds.map((d, j) => (j === i ? { ...d, [k]: v } : d)));

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
      <div className="page">
        <section className="panel state">
          <Mascot pose="thumbs" height={150} />
          <span className="eyebrow">Application received</span>
          <h1 className="page-title">You're in the queue</h1>
          <p>
            Case <code>{result.id}</code> is <strong>{result.status.replace("_", " ")}</strong>.
          </p>
          <p className="muted measure">
            Next, a caseworker reads your story and we confirm each balance directly with your creditor. You'll hear from us
            before anything goes live, and you can withdraw at any time.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page apply">
      <aside className="apply-intro">
        <Mascot pose="wave" height={140} />
        <span className="eyebrow">Get help</span>
        <h1 className="page-title">Tell your story</h1>
        <p className="muted">Verified donors pay real bills, directly to the people you owe. Here's how we protect you:</p>
        <ul className="assurances">
          <li>
            <ShieldCheck size={18} aria-hidden />
            <span>
              <b>Verified before anyone sees it</b>
              <small>Identity, bills and a caseworker review.</small>
            </span>
          </li>
          <li>
            <Building2 size={18} aria-hidden />
            <span>
              <b>Paid straight to your creditor</b>
              <small>No cash changes hands.</small>
            </span>
          </li>
          <li>
            <EyeOff size={18} aria-hidden />
            <span>
              <b>Private by default</b>
              <small>Only your first name, city and chosen bills are shown.</small>
            </span>
          </li>
          <li>
            <UserCheck size={18} aria-hidden />
            <span>
              <b>You're in control</b>
              <small>Withdraw at any time.</small>
            </span>
          </li>
        </ul>
      </aside>

      <form className="panel form" onSubmit={submit}>
        <fieldset className="form-section">
          <legend>About you</legend>
          <div className="grid-2">
            <label className="field">
              <span>First name</span>
              <input required autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />
            </label>
            <label className="field">
              <span>Age</span>
              <input type="number" min={16} max={120} value={form.age} onChange={set("age")} />
            </label>
            <label className="field">
              <span>City</span>
              <input required autoComplete="address-level2" value={form.city} onChange={set("city")} />
            </label>
            <label className="field">
              <span>State</span>
              <input required maxLength={2} autoComplete="address-level1" value={form.state} onChange={set("state")} placeholder="OH" />
            </label>
          </div>
          <label className="field">
            <span>What best describes you?</span>
            <select value={form.category} onChange={set("category")}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="form-section">
          <legend>Your story</legend>
          <label className="field">
            <span>Headline</span>
            <input required maxLength={90} value={form.headline} onChange={set("headline")} placeholder="One line donors see first" />
          </label>
          <label className="field">
            <span>What happened, and where you are now</span>
            <textarea required rows={5} value={form.story} onChange={set("story")} placeholder="At least 80 characters" />
          </label>
          <label className="field">
            <span>What would paying this off unlock?</span>
            <input required value={form.unlocks} onChange={set("unlocks")} placeholder="Keep my apartment, re-enroll in school…" />
          </label>
        </fieldset>

        <fieldset className="form-section">
          <legend>Your bills</legend>
          {debts.map((d, i) => (
            <div key={i} className="debt-row">
              <label className="field">
                <span>Type</span>
                <select value={d.type} onChange={(e) => setDebt(i, "type", e.target.value)}>
                  {ELIGIBLE_DEBT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {DEBT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Owed to</span>
                <input required placeholder="Creditor name" value={d.creditorName} onChange={(e) => setDebt(i, "creditorName", e.target.value)} />
              </label>
              <label className="field">
                <span>Account last 4</span>
                <input required placeholder="1234" inputMode="numeric" pattern="\d{4}" maxLength={4} value={d.last4} onChange={(e) => setDebt(i, "last4", e.target.value)} />
              </label>
              <label className="field">
                <span>Amount</span>
                <input required placeholder="$0.00" type="number" min={50} step="0.01" value={d.amount} onChange={(e) => setDebt(i, "amount", e.target.value)} />
              </label>
              {debts.length > 1 && (
                <button type="button" className="icon-btn" onClick={() => setDebts((ds) => ds.filter((_, j) => j !== i))} aria-label="Remove bill">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-secondary" onClick={() => setDebts((ds) => [...ds, emptyDebt()])}>
            <Plus size={16} aria-hidden /> Add another bill
          </button>
          <p className="fine">
            You'll upload statements and verify your identity next. Gambling debts, payday-loan rollovers, margin loans and court
            restitution aren't eligible.
          </p>
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={form.consent} onChange={set("consent")} />
          <span>I agree to share this story and these bills with verified donors, and to a background screen.</span>
        </label>

        {result && !result.ok && (
          <div className="errors" role="alert">
            <AlertCircle size={18} aria-hidden />
            <ul>
              {result.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        <button className="btn btn-black btn-block" disabled={busy}>
          {busy ? "Submitting…" : "Submit for verification"}
        </button>
      </form>
    </div>
  );
}
