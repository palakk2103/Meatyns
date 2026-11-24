import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { sellerApi } from "../services/sellerApi";
import DailyStockReport from "@shared/components/DailyStockReport";
import DailyStockEntryForm, { istDate, EMPTY_ENTRY, entryToPayload, lineToEntry } from "@shared/components/DailyStockEntryForm";

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const DailyStock = () => {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [date, setDate] = useState(istDate());
  const [form, setForm] = useState(EMPTY_ENTRY);
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
    setForm(lineToEntry((report.lines || []).find((l) => l.product === productId && l.date === date), products.find((p) => p._id === productId)));
  }, [report, productId, date, products]);

  const save = async (e) => {
    e.preventDefault();
    if (!productId) return toast.error("Choose a product first");
    setSaving(true);
    try {
      const payload = entryToPayload(form);
      await sellerApi.saveDailyStock({ productId, date, ...payload });
      setProducts((list) => list.map((p) => (p._id === productId ? { ...p, avgKgPerAnimal: payload.avgKgPerAnimal } : p)));
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

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Daily Carcass Log</h1>
        <p className="text-sm text-slate-600 font-medium mt-0.5">
          Record carcasses received, offline sales and wastage. Sales made through the app are added automatically.
        </p>
      </div>

      <DailyStockEntryForm
        products={products}
        productId={productId}
        onProductChange={setProductId}
        date={date}
        onDateChange={setDate}
        form={form}
        onFormChange={setForm}
        onSubmit={save}
        saving={saving}
        busy={loading}
      />

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
