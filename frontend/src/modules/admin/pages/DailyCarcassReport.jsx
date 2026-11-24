import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../services/adminApi";
import DailyStockReport from "@shared/components/DailyStockReport";
import DailyStockEntryForm, { istDate, EMPTY_ENTRY, entryToPayload, lineToEntry } from "@shared/components/DailyStockEntryForm";

const inputCls = "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const sellerLabel = (s) => (s.email ? `${s.name} (${s.email})` : s.name);

const DailyCarcassReport = () => {
  const [from, setFrom] = useState(istDate(6));
  const [to, setTo] = useState(istDate());
  const [sellerId, setSellerId] = useState("");
  const [sellers, setSellers] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin entry form (enter / correct figures on behalf of a seller)
  const [showForm, setShowForm] = useState(false);
  const [entrySellerId, setEntrySellerId] = useState("");
  const [entryProducts, setEntryProducts] = useState([]);
  const [entryProductId, setEntryProductId] = useState("");
  const [entryDate, setEntryDate] = useState(istDate());
  const [form, setForm] = useState(EMPTY_ENTRY);
  const [saving, setSaving] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from, to };
      if (sellerId) params.sellerId = sellerId;
      const res = await adminApi.getDailyStock(params);
      setReport(res.data.result || null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load daily carcass report");
    } finally {
      setLoading(false);
    }
  }, [from, to, sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi
      .getDailyStockSellers()
      .then((res) => setSellers(res.data.results || []))
      .catch(() => {});
  }, []);

  // Load the chosen seller's products for the entry form.
  useEffect(() => {
    setEntryProducts([]);
    setEntryProductId("");
    if (!entrySellerId) return;
    adminApi
      .getDailyStockProducts(entrySellerId)
      .then((res) => {
        const list = res.data.results || [];
        setEntryProducts(list);
        if (list.length) setEntryProductId(list[0]._id);
      })
      .catch(() => toast.error("Failed to load that seller's products"));
  }, [entrySellerId]);

  // Pre-fill with what is already saved for this seller + product + date.
  // Uses a dedicated one-day report so it works whatever range is on screen.
  useEffect(() => {
    if (!entrySellerId || !entryProductId) {
      setForm(EMPTY_ENTRY);
      setLoadingEntry(false);
      return;
    }
    let cancelled = false;
    setLoadingEntry(true);
    adminApi
      .getDailyStock({ from: entryDate, to: entryDate, sellerId: entrySellerId })
      .then((res) => {
        if (cancelled) return;
        const line = (res.data.result?.lines || []).find((l) => l.product === entryProductId && l.date === entryDate);
        setForm(lineToEntry(line, entryProducts.find((p) => p._id === entryProductId)));
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load the saved figures for that day");
      })
      .finally(() => {
        if (!cancelled) setLoadingEntry(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrySellerId, entryProductId, entryDate]);

  const save = async (e) => {
    e.preventDefault();
    if (!entrySellerId) return toast.error("Choose a seller first");
    if (!entryProductId) return toast.error("Choose a product first");
    setSaving(true);
    try {
      const payload = entryToPayload(form);
      await adminApi.saveDailyStock({ sellerId: entrySellerId, productId: entryProductId, date: entryDate, ...payload });
      setEntryProducts((list) => list.map((p) => (p._id === entryProductId ? { ...p, avgKgPerAnimal: payload.avgKgPerAnimal } : p)));
      toast.success("Daily stock saved");
      if (entryDate < from) setFrom(entryDate);
      else if (entryDate > to) setTo(entryDate);
      else await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const setToday = () => {
    setFrom(istDate());
    setTo(istDate());
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Daily Carcass Report</h1>
          <p className="text-sm text-slate-600 font-medium mt-0.5">
            Carcasses received, sold and remaining each day, for the whole platform or one seller.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold"
          data-testid="dcr-toggle-form"
        >
          {showForm ? "Close entry form" : "Add / correct entry"}
        </button>
      </div>

      {showForm && (
        <DailyStockEntryForm
          title="Enter or correct figures on behalf of a seller"
          products={entryProducts}
          productId={entryProductId}
          onProductChange={setEntryProductId}
          date={entryDate}
          onDateChange={setEntryDate}
          form={form}
          onFormChange={setForm}
          onSubmit={save}
          saving={saving}
          busy={loadingEntry}
          disabled={!entrySellerId}
        >
          <label className="text-xs font-bold text-slate-600 block">
            Seller / store
            <select
              className={`${inputCls} w-full`}
              value={entrySellerId}
              onChange={(e) => setEntrySellerId(e.target.value)}
              data-testid="dcr-entry-seller"
            >
              <option value="">Choose a seller...</option>
              {sellers.map((s) => (
                <option key={s._id} value={s._id}>{sellerLabel(s)}</option>
              ))}
            </select>
          </label>
        </DailyStockEntryForm>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-slate-600 flex flex-col gap-1">
          From
          <input type="date" className={inputCls} value={from} max={to} onChange={(e) => setFrom(e.target.value)} data-testid="dcr-from" />
        </label>
        <label className="text-xs font-bold text-slate-600 flex flex-col gap-1">
          To
          <input type="date" className={inputCls} value={to} min={from} max={istDate()} onChange={(e) => setTo(e.target.value)} data-testid="dcr-to" />
        </label>
        <label className="text-xs font-bold text-slate-600 flex flex-col gap-1">
          Seller / store
          <select className={inputCls} value={sellerId} onChange={(e) => setSellerId(e.target.value)} data-testid="dcr-seller">
            <option value="">All sellers (platform total)</option>
            {sellers.map((s) => (
              <option key={s._id} value={s._id}>{sellerLabel(s)}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={setToday} className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
          Today
        </button>
      </div>

      {loading && !report ? (
        <p className="text-sm font-bold text-slate-600">Loading...</p>
      ) : (
        <DailyStockReport report={report} showSeller={!sellerId} />
      )}
    </div>
  );
};

export default DailyCarcassReport;
