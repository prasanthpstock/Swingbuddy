"use client";

import { useEffect, useState } from "react";
import {
  getPortfolioSummary,
  getPortfolioHoldings,
  syncPortfolio,
} from "@/lib/api";

export default function PortfolioPage() {
  const [summary, setSummary] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPortfolio = async () => {
    try {
      const [summaryData, holdingsData] = await Promise.all([
        getPortfolioSummary(),
        getPortfolioHoldings(),
      ]);

      setSummary(summaryData);
      setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
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

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Overview</h3>
          <p className="mt-2 subtle">Latest snapshot of your holdings.</p>
        </div>

        <button
          onClick={handleSync}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Syncing..." : "Sync Holdings"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="subtle">Portfolio Value</p>
          <div className="metric mt-2">
            ₹{summary?.total_portfolio_value ?? 0}
          </div>
        </div>

        <div className="card">
          <p className="subtle">Total P&amp;L</p>
          <div className="metric mt-2">
            ₹{summary?.total_pnl ?? 0}
          </div>
        </div>

        <div className="card">
          <p className="subtle">Open Positions</p>
          <div className="metric mt-2">
            {summary?.open_positions ?? 0}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Holdings</h3>

        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Symbol</th>
                <th className="pb-3">Exchange</th>
                <th className="pb-3">Quantity</th>
                <th className="pb-3">Avg Price</th>
                <th className="pb-3">LTP</th>
                <th className="pb-3">Market Value</th>
                <th className="pb-3">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((item, index) => (
                <tr
                  key={`${item.snapshot_id}-${item.symbol}-${item.exchange}-${index}`}
                  className="border-t border-slate-200"
                >
                  <td className="py-3">{item.symbol}</td>
                  <td className="py-3">{item.exchange}</td>
                  <td className="py-3">{item.quantity}</td>
                  <td className="py-3">₹{item.avg_price ?? 0}</td>
                  <td className="py-3">₹{item.ltp ?? 0}</td>
                  <td className="py-3">₹{item.market_value ?? 0}</td>
                  <td className="py-3">₹{item.pnl ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {holdings.length === 0 ? (
            <p className="subtle mt-4">No holdings found.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
