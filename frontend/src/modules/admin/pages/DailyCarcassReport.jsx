import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../services/adminApi";
import DailyStockReport from "@shared/components/DailyStockReport";

const istDate = (offsetDays = 0) =>
  new Date(Date.now() + 5.5 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);

const inputCls = "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const DailyCarcassReport = () => {
  const [from, setFrom] = useState(istDate(6));
  const [to, setTo] = useState(istDate());
  const [sellerId, setSellerId] = useState("");
  const [sellers, setSellers] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const setToday = () => {
    setFrom(istDate());
    setTo(istDate());
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Daily Carcass Report</h1>
        <p className="text-sm text-slate-600 font-medium mt-0.5">
          Carcasses received, sold and remaining each day, for the whole platform or one seller.
        </p>
      </div>

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
              <option key={s._id} value={s._id}>{s.name}</option>
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
