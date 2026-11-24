import React from "react";

export const istDate = (offsetDays = 0) =>
  new Date(Date.now() + 5.5 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);

export const EMPTY_ENTRY = {
  startStockPieces: "", startStockKg: "",
  receivedPieces: "", receivedKg: "",
  manualSoldPieces: "", manualSoldKg: "",
  wastagePieces: "", wastageKg: "",
  note: "",
  avgKgPerAnimal: "",
};

const FIELDS = [
  { group: "Received today", pieces: "receivedPieces", kg: "receivedKg" },
  { group: "Sold offline / at counter", pieces: "manualSoldPieces", kg: "manualSoldKg" },
  { group: "Wastage", pieces: "wastagePieces", kg: "wastageKg" },
];
const START_FIELD = { group: "Starting stock (optional)", pieces: "startStockPieces", kg: "startStockKg" };

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Turns the string-based form state into the numeric payload the API expects. */
export const entryToPayload = (form) => {
  const body = { note: form.note };
  // Blank clears the product's average weight (sent as null).
  body.avgKgPerAnimal = form.avgKgPerAnimal === "" ? null : Number(form.avgKgPerAnimal);
  FIELDS.forEach(({ pieces, kg }) => {
    body[pieces] = form[pieces] === "" ? 0 : Number(form[pieces]);
    body[kg] = form[kg] === "" ? 0 : Number(form[kg]);
  });
  // Starting stock: blank means "continue from the previous day" (sent as null).
  [START_FIELD.pieces, START_FIELD.kg].forEach((k) => {
    body[k] = form[k] === "" ? null : Number(form[k]);
  });
  return body;
};

/** Turns a report line into form state (so editing shows what is already saved). */
export const lineToEntry = (line, product) => ({
  ...lineToEntryBase(line),
  avgKgPerAnimal: product?.avgKgPerAnimal ?? "",
});

const lineToEntryBase = (line) =>
  line
    ? {
        startStockPieces: line.startStockPieces ?? "", startStockKg: line.startStockKg ?? "",
        receivedPieces: line.receivedPieces || "", receivedKg: line.receivedKg || "",
        manualSoldPieces: line.manualSoldPieces || "", manualSoldKg: line.manualSoldKg || "",
        wastagePieces: line.wastagePieces || "", wastageKg: line.wastageKg || "",
        note: line.note || "",
      }
    : EMPTY_ENTRY;

/**
 * Shared "enter / correct a day's carcass figures" form (seller + admin).
 * `children` is rendered above the product/date row (the admin uses it for the seller picker).
 */
const DailyStockEntryForm = ({
  products, productId, onProductChange,
  date, onDateChange,
  form, onFormChange,
  onSubmit, saving, disabled = false, busy = false, title, children,
}) => {
  const set = (k) => (e) => onFormChange({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-white ring-1 ring-slate-100 shadow-sm p-5 space-y-4" data-testid="daily-stock-form">
      {title && <h2 className="text-sm font-black text-slate-900">{title}</h2>}
      {children}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-600">
          Product
          <select className={inputCls} value={productId} onChange={(e) => onProductChange(e.target.value)} data-testid="ds-product">
            {products.length === 0 && <option value="">No products</option>}
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Date
          <input type="date" className={inputCls} value={date} max={istDate()} onChange={(e) => onDateChange(e.target.value)} data-testid="ds-date" />
        </label>
      </div>

      <p className="text-xs text-slate-600 font-medium" data-testid="ds-carry-hint">
        Stock carries forward: each day starts with the previous day's closing stock. Only fill the starting stock on the
        first day, or to correct the count after a physical check. Leave it empty to continue from the previous day.
      </p>

      {/* `busy` locks the numbers while the saved values for this product/date are loading,
          so late-arriving data can never overwrite what the user just typed. */}
      <fieldset disabled={busy} className="space-y-4 min-w-0 border-0 p-0 m-0" aria-busy={busy} data-testid="ds-fields">
      <div className="grid md:grid-cols-4 gap-4">
        {[START_FIELD, ...FIELDS].map(({ group, pieces, kg }) => (
          <fieldset key={group} className="rounded-2xl bg-slate-50 p-3 space-y-2">
            <legend className="px-1 text-[11px] font-black uppercase tracking-widest text-slate-600">{group}</legend>
            <label className="text-xs font-bold text-slate-600 block">
              Animals (pcs)
              <input type="number" min="0" step="1" className={inputCls} value={form[pieces]} onChange={set(pieces)} data-testid={`ds-${pieces}`} />
            </label>
            <label className="text-xs font-bold text-slate-600 block">
              Weight (kg)
              <input type="number" min="0" step="0.01" className={inputCls} value={form[kg]} onChange={set(kg)} data-testid={`ds-${kg}`} />
            </label>
          </fieldset>
        ))}
      </div>

      <label className="text-xs font-bold text-slate-600 block">
        Average weight of this product per animal (kg, optional)
        <input type="number" min="0" step="0.01" className={inputCls} value={form.avgKgPerAnimal} onChange={set("avgKgPerAnimal")} data-testid="ds-avgKgPerAnimal" />
        <span className="block font-medium text-slate-500 mt-1">
          Used only to estimate how many animals the kg sold through the app correspond to. Example: 0.4 for chicken legs.
        </span>
      </label>

      <label className="text-xs font-bold text-slate-600 block">
        Note (optional)
        <input type="text" maxLength={500} className={inputCls} value={form.note} onChange={set("note")} />
      </label>
      </fieldset>

      <button
        type="submit"
        disabled={saving || busy || disabled || !productId}
        className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40"
        data-testid="ds-save"
      >
        {saving ? "Saving..." : "Save entry"}
      </button>
    </form>
  );
};

export default DailyStockEntryForm;
