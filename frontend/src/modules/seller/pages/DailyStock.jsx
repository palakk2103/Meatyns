import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { sellerApi } from "../services/sellerApi";
import DailyStockReport from "@shared/components/DailyStockReport";

const istDate = (offsetDays = 0) =>
  new Date(Date.now() + 5.5 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);

const EMPTY = {
  receivedPieces: "", receivedKg: "",
  manualSoldPieces: "", manualSoldKg: "",
  wastagePieces: "", wastageKg: "",
  note: "",
};

const FIELDS = [
  { group: "Received today", pieces: "receivedPieces", kg: "receivedKg" },
  { group: "Sold offline / at counter", pieces: "manualSoldPieces", kg: "manualSoldKg" },
  { group: "Wastage", pieces: "wastagePieces", kg: "wastageKg" },
];

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const DailyStock = () => {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [date, setDate] = useState(istDate());
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [from, setFrom] = useState(istDate(6));
  const [to, setTo] = useState(istDate());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sellerApi.getDailyStock({ from, to });
      setReport(res.data.result || null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load daily stock report");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    sellerApi
      .getDailyStockProducts()
      .then((res) => {
        const list = res.data.results || [];
        setProducts(list);
        if (list.length) setProductId((cur) => cur || list[0]._id);
      })
      .catch(() => toast.error("Failed to load products"));
  }, []);

  // Pre-fill the form with whatever is already saved for this product + date.
  useEffect(() => {
    if (!report || !productId) return;
    const line = (report.lines || []).find((l) => l.product === productId && l.date === date);
    setForm(
      line
        ? {
            receivedPieces: line.receivedPieces || "", receivedKg: line.receivedKg || "",
            manualSoldPieces: line.manualSoldPieces || "", manualSoldKg: line.manualSoldKg || "",
            wastagePieces: line.wastagePieces || "", wastageKg: line.wastageKg || "",
            note: line.note || "",
          }
        : EMPTY,
    );
  }, [report, productId, date]);

  const save = async (e) => {
    e.preventDefault();
    if (!productId) return toast.error("Choose a product first");
    const body = { productId, date, note: form.note };
    FIELDS.forEach(({ pieces, kg }) => {
      body[pieces] = form[pieces] === "" ? 0 : Number(form[pieces]);
      body[kg] = form[kg] === "" ? 0 : Number(form[kg]);
    });
    setSaving(true);
    try {
      await sellerApi.saveDailyStock(body);
      toast.success("Daily stock saved");
      // Make sure the saved day is inside the visible range, then refresh.
      if (date < from) setFrom(date);
      else if (date > to) setTo(date);
      else await loadReport();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Daily Carcass Log</h1>
        <p className="text-sm text-slate-600 font-medium mt-0.5">
          Record carcasses received, offline sales and wastage. Sales made through the app are added automatically.
        </p>
      </div>

      <form onSubmit={save} className="rounded-3xl bg-white ring-1 ring-slate-100 shadow-sm p-5 space-y-4" data-testid="daily-stock-form">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-600">
            Product
            <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)} data-testid="ds-product">
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Date
            <input type="date" className={inputCls} value={date} max={istDate()} onChange={(e) => setDate(e.target.value)} data-testid="ds-date" />
          </label>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {FIELDS.map(({ group, pieces, kg }) => (
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
          Note (optional)
          <input type="text" maxLength={500} className={inputCls} value={form.note} onChange={set("note")} />
        </label>

        <button
          type="submit"
          disabled={saving || !productId}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40"
          data-testid="ds-save"
        >
          {saving ? "Saving..." : "Save entry"}
        </button>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-slate-600">
          From
          <input type="date" className={inputCls} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs font-bold text-slate-600">
          To
          <input type="date" className={inputCls} value={to} min={from} max={istDate()} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {loading && !report ? (
        <p className="text-sm font-bold text-slate-600">Loading...</p>
      ) : (
        <DailyStockReport report={report} />
      )}
    </div>
  );
};

export default DailyStock;
