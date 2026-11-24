import React, { useState } from "react";

const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0");

const COLS = [
  { key: "opening", label: "Opening stock" },
  { key: "received", label: "Received" },
  { key: "sold", label: "Sold" },
  { key: "wastage", label: "Wastage" },
  { key: "balance", label: "Closing stock" },
];

const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const th = "px-4 py-3";
const thR = "px-4 py-3 text-right";
const headCls = "bg-slate-50 text-[11px] uppercase tracking-widest text-slate-600";

/**
 * Read-only report shared by the admin and seller "Daily carcass" pages.
 * `report` is the payload of GET /(admin|seller)/daily-stock.
 * Closing stock of a day = opening + received − sold − wastage, and becomes the
 * next day's opening stock.
 */
const DailyStockReport = ({ report, showSeller = false }) => {
  const [unit, setUnit] = useState("pieces"); // 'pieces' | 'kg'
  const suffix = unit === "pieces" ? "Pieces" : "Kg";
  const val = (row, key) => row?.[`${key}${suffix}`] ?? 0;
  const negCls = (n) => (n < 0 ? "text-rose-600" : "");
  // In the animals view, kg sold online can be shown as an estimated animal count
  // (needs the product's average kg per animal).
  const est = (row) => (unit === "pieces" ? Number(row?.onlineSoldEstPieces) || 0 : 0);
  const estTag = (row) =>
    est(row) > 0 ? <span className="block text-[10px] font-semibold text-slate-500">+ ≈{fmt(est(row))} animals (from kg)</span> : null;

  const lines = report?.lines || [];
  const days = report?.days || [];
  const bySeller = report?.bySeller || [];
  const stock = report?.stock || [];
  const totals = report?.totals || {};

  const exportCsv = () => {
    const head = [
      "Date", "Seller", "Product",
      "Opening (pcs)", "Opening (kg)",
      "Received (pcs)", "Received (kg)",
      "Sold online (pcs)", "Sold online (kg)", "Sold online (kg) ≈ animals",
      "Sold offline (pcs)", "Sold offline (kg)",
      "Wastage (pcs)", "Wastage (kg)",
      "Closing (pcs)", "Closing (kg)", "Note",
    ];
    const rows = lines.map((l) => [
      l.date, l.sellerName, l.productName,
      l.openingPieces, l.openingKg,
      l.receivedPieces, l.receivedKg,
      l.onlineSoldPieces, l.onlineSoldKg, l.onlineSoldEstPieces || "",
      l.manualSoldPieces, l.manualSoldKg,
      l.wastagePieces, l.wastageKg,
      l.tracked ? l.balancePieces : "", l.tracked ? l.balanceKg : "", l.note,
    ]);
    const csv = [head, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-carcass-${report.from}_to_${report.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!report) return null;

  return (
    <div className="space-y-6" data-testid="daily-stock-report">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {[["pieces", "Animals (pcs)"], ["kg", "Weight (kg)"]].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setUnit(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${unit === k ? "bg-white shadow text-slate-900" : "text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={lines.length === 0}
          className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {COLS.map((c) => (
          <div key={c.key} className="rounded-2xl bg-white ring-1 ring-slate-100 shadow-sm p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{c.label}</p>
            <p className={`text-2xl font-black text-slate-900 ${c.key === "balance" ? negCls(val(totals, c.key)) : ""}`} data-testid={`total-${c.key}`}>
              {fmt(val(totals, c.key))}
              <span className="text-xs font-bold text-slate-500 ml-1">{unit === "pieces" ? "pcs" : "kg"}</span>
            </p>
            {c.key === "sold" && estTag(totals)}
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-600 font-medium -mt-3 space-y-1" data-testid="reconcile-note">
        <p>
          Closing stock = opening + received − sold − wastage, and it becomes the next day's opening stock. Stock is counted from
          the day an entry is first saved for a product.
        </p>
        {val(totals, "adjust") !== 0 && (
          <p data-testid="note-adjust">
            Includes {fmt(val(totals, "adjust"))} {unit === "pieces" ? "pcs" : "kg"} added by starting-stock entries or corrections.
          </p>
        )}
        {est(totals) > 0 && (
          <p data-testid="note-est">
            "≈ animals" is an estimate: kg sold through the app divided by the product's average weight per animal. It is not
            deducted from the animal count in stock.
          </p>
        )}
        {val(totals, "untrackedSold") !== 0 && (
          <p data-testid="note-untracked">
            {fmt(val(totals, "untrackedSold"))} {unit === "pieces" ? "pcs" : "kg"} of the sold figure came from products with no stock
            entry, so it is not deducted from stock.
          </p>
        )}
      </div>

      <section>
        <h3 className="text-sm font-black text-slate-900 mb-2">Stock on hand at end of {report.to}</h3>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 bg-white">
          <table className="w-full text-left text-sm" data-testid="stock-on-hand">
            <thead className={headCls}>
              <tr>
                {showSeller && <th className={th}>Seller</th>}
                <th className={th}>Product</th>
                <th className={thR}>In stock (carcass)</th>
                <th className={thR}>Product stock now</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stock.length === 0 ? (
                <tr>
                  <td colSpan={showSeller ? 4 : 3} className="px-4 py-6 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                    No stock recorded yet. Save a starting stock or a received entry to begin.
                  </td>
                </tr>
              ) : (
                stock.map((s) => (
                  <tr key={`${s.seller}-${s.product}`}>
                    {showSeller && <td className="px-4 py-3">{s.sellerName}</td>}
                    <td className="px-4 py-3 font-semibold">{s.productName}</td>
                    <td className={`px-4 py-3 text-right font-bold ${negCls(val(s, "balance"))}`}>
                      {s.carcassTracked ? fmt(val(s, "balance")) : <span className="text-slate-400 font-semibold">no entry</span>}
                    </td>
                    <td className="px-4 py-3 text-right">{s.productStock === null || s.productStock === undefined ? "—" : fmt(s.productStock)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-600 font-medium mt-2">
          "Product stock now" is the stock number of the product itself (Products page). It goes down with every app order and
          comes back if an order is cancelled. It is the live figure, not the figure at the end of the selected dates.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-black text-slate-900 mb-2">Day by day</h3>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className={headCls}>
              <tr>
                <th className={th}>Date</th>
                <th className={thR}>Opening</th>
                <th className={thR}>Received</th>
                <th className={thR}>Sold (app)</th>
                <th className={thR}>Sold (offline)</th>
                <th className={thR}>Wastage</th>
                <th className={thR}>Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {days.map((d) => (
                <tr key={d.date}>
                  <td className="px-4 py-3 font-semibold">{d.date}</td>
                  <td className="px-4 py-3 text-right">{fmt(val(d, "opening"))}</td>
                  <td className="px-4 py-3 text-right">{fmt(val(d, "received"))}</td>
                  <td className="px-4 py-3 text-right">{fmt(d[`onlineSold${suffix}`])}{estTag(d)}</td>
                  <td className="px-4 py-3 text-right">{fmt(d[`manualSold${suffix}`])}</td>
                  <td className="px-4 py-3 text-right">{fmt(val(d, "wastage"))}</td>
                  <td className={`px-4 py-3 text-right font-bold ${negCls(val(d, "balance"))}`}>{fmt(val(d, "balance"))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showSeller && bySeller.length > 0 && (
        <section>
          <h3 className="text-sm font-black text-slate-900 mb-2">By seller / store</h3>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className={headCls}>
                <tr>
                  <th className={th}>Seller</th>
                  <th className={thR}>Opening</th>
                  <th className={thR}>Received</th>
                  <th className={thR}>Sold</th>
                  <th className={thR}>Wastage</th>
                  <th className={thR}>Closing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bySeller.map((s) => (
                  <tr key={s.sellerId}>
                    <td className="px-4 py-3 font-semibold">{s.sellerName}</td>
                    <td className="px-4 py-3 text-right">{fmt(val(s, "opening"))}</td>
                    <td className="px-4 py-3 text-right">{fmt(val(s, "received"))}</td>
                    <td className="px-4 py-3 text-right">{fmt(val(s, "sold"))}{estTag(s)}</td>
                    <td className="px-4 py-3 text-right">{fmt(val(s, "wastage"))}</td>
                    <td className={`px-4 py-3 text-right font-bold ${negCls(val(s, "balance"))}`}>{fmt(val(s, "balance"))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-black text-slate-900 mb-2">Details by product</h3>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className={headCls}>
              <tr>
                <th className={th}>Date</th>
                {showSeller && <th className={th}>Seller</th>}
                <th className={th}>Product</th>
                <th className={thR}>Opening</th>
                <th className={thR}>Received</th>
                <th className={thR}>Sold (app)</th>
                <th className={thR}>Sold (offline)</th>
                <th className={thR}>Wastage</th>
                <th className={thR}>Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={showSeller ? 9 : 8} className="px-4 py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                    No stock activity in this period.
                  </td>
                </tr>
              ) : (
                lines.map((l) => (
                  <tr key={`${l.seller}-${l.product}-${l.date}`}>
                    <td className="px-4 py-3">{l.date}</td>
                    {showSeller && <td className="px-4 py-3">{l.sellerName}</td>}
                    <td className="px-4 py-3 font-semibold">{l.productName}</td>
                    <td className="px-4 py-3 text-right">{l.tracked ? fmt(val(l, "opening")) : "—"}</td>
                    <td className="px-4 py-3 text-right">{fmt(val(l, "received"))}</td>
                    <td className="px-4 py-3 text-right">{fmt(l[`onlineSold${suffix}`])}{estTag(l)}</td>
                    <td className="px-4 py-3 text-right">{fmt(l[`manualSold${suffix}`])}</td>
                    <td className="px-4 py-3 text-right">{fmt(val(l, "wastage"))}</td>
                    <td className={`px-4 py-3 text-right font-bold ${negCls(val(l, "balance"))}`}>{l.tracked ? fmt(val(l, "balance")) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DailyStockReport;
