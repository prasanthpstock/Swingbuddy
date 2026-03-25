"use client";

import { useEffect, useState } from "react";
import {
  getPortfolioSummary,
  getPortfolioHoldings,
  syncPortfolio,
} from "@/lib/api";

const formatINR = (value: number | string | null | undefined) => {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getPnlClass = (value: number | string | null | undefined) => {
  const num = Number(value ?? 0);
  if (num > 0) return "text-emerald-600";
  if (num < 0) return "text-red-600";
  return "text-slate-600";
};

const getPnlBadgeClass = (value: number | string | null | undefined) => {
  const num = Number(value ?? 0);
  if (num > 0) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (num < 0) {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
};

export default function PortfolioPage() {
  const [summary, setSummary] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const loadPortfolio = async () => {
    try {
      const [summaryData, holdingsData] = await Promise.all([
        getPortfolioSummary(),
        getPortfolioHoldings(),
      ]);

      setSummary(summaryData);
      setHoldings(Array.isArray(holdingsData) ? holdingsData : []);

      if (Array.isArray(holdingsData) && holdingsData.length > 0) {
        setLastSynced(holdingsData[0]?.snapshot_at ?? null);
      } else {
        setLastSynced(null);
      }
    } catch (err) {
      console.error("Failed to load portfolio", err);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      await syncPortfolio();
      await loadPortfolio();
    } catch (err: any) {
      console.error("Sync failed", err);
      alert(err?.message || "Sync failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const loadPortfolio = async () => {
  try {
    const [summaryData, holdingsData] = await Promise.all([
      getPortfolioSummary(),
      getPortfolioHoldings(),
    ]);

    setSummary(summaryData);
    setHoldings(Array.isArray(holdingsData) ? holdingsData : []);

    // ❌ OLD (or missing)
  } catch (err) {
    console.error("Failed to load portfolio", err);
  }
};

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              Portfolio Overview
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Latest snapshot of your holdings.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Last synced:{" "}
              <span className="font-medium text-slate-700">
                {formatDateTime(lastSynced)}
              </span>
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition ${
              loading
                ? "cursor-not-allowed bg-slate-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Syncing..." : "Sync Holdings"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Portfolio Value</p>
          <div className="mt-3 text-2xl font-semibold text-slate-900">
            {formatINR(summary?.total_portfolio_value)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total P&amp;L</p>
          <div className={`mt-3 text-2xl font-semibold ${getPnlClass(summary?.total_pnl)}`}>
            {formatINR(summary?.total_pnl)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Open Positions</p>
          <div className="mt-3 text-2xl font-semibold text-slate-900">
            {summary?.open_positions ?? 0}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Holdings</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {holdings.length} {holdings.length === 1 ? "holding" : "holdings"}
          </span>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 pr-6 font-medium">Symbol</th>
                <th className="pb-3 pr-6 font-medium">Exchange</th>
                <th className="pb-3 pr-6 font-medium">Quantity</th>
                <th className="pb-3 pr-6 font-medium">Avg Price</th>
                <th className="pb-3 pr-6 font-medium">LTP</th>
                <th className="pb-3 pr-6 font-medium">Market Value</th>
                <th className="pb-3 pr-6 font-medium">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((item, index) => (
                <tr
                  key={`${item.snapshot_id}-${item.symbol}-${item.exchange}-${index}`}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="py-4 pr-6 font-semibold text-slate-900">
                    {item.symbol}
                  </td>
                  <td className="py-4 pr-6 text-slate-600">{item.exchange}</td>
                  <td className="py-4 pr-6 text-slate-700">
                    {item.quantity ?? 0}
                  </td>
                  <td className="py-4 pr-6 text-slate-700">
                    {formatINR(item.avg_price)}
                  </td>
                  <td className="py-4 pr-6 text-slate-700">
                    {formatINR(item.ltp)}
                  </td>
                  <td className="py-4 pr-6 font-medium text-slate-900">
                    {formatINR(item.market_value)}
                  </td>
                  <td className="py-4 pr-6">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPnlBadgeClass(
                        item.pnl
                      )}`}
                    >
                      {formatINR(item.pnl)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {holdings.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No holdings found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
