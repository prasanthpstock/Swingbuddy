"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function PortfolioPage() {
  const [summary, setSummary] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  async function getToken() {
    const supabase = getSupabaseClient();
    if (!supabase) return "";

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function loadPortfolio() {
    const token = await getToken();
    if (!token) return;

    const [summaryRes, holdingsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/portfolio/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${API_BASE_URL}/portfolio/holdings`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    const summaryData = await summaryRes.json();
    const holdingsData = await holdingsRes.json();

    setSummary(summaryData);
    setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
  }

  async function syncHoldings() {
    try {
      setSyncing(true);
      const token = await getToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/portfolio/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      await loadPortfolio();
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadPortfolio();
  }, []);

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Overview</h3>
          <p className="mt-2 subtle">Live holdings synced from Zerodha.</p>
        </div>

        <button
          onClick={syncHoldings}
          className="rounded-xl bg-slate-900 px-4 py-2 text-white"
        >
          {syncing ? "Syncing..." : "Sync Holdings"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="subtle">Portfolio Value</p>
          <div className="metric mt-2">₹{summary?.total_portfolio_value ?? 0}</div>
        </div>
        <div className="card">
          <p className="subtle">Total P&amp;L</p>
          <div className="metric mt-2">₹{summary?.total_pnl ?? 0}</div>
        </div>
        <div className="card">
          <p className="subtle">Open Positions</p>
          <div className="metric mt-2">{summary?.open_positions ?? 0}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Holdings</h3>

        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Symbol</th>
                <th className="pb-3">Qty</th>
                <th className="pb-3">Avg Price</th>
                <th className="pb-3">LTP</th>
                <th className="pb-3">Market Value</th>
                <th className="pb-3">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="py-3">{item.symbol}</td>
                  <td className="py-3">{item.quantity}</td>
                  <td className="py-3">₹{item.avg_price}</td>
                  <td className="py-3">₹{item.ltp}</td>
                  <td className="py-3">₹{item.market_value}</td>
                  <td className="py-3">₹{item.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {holdings.length === 0 ? (
            <p className="subtle mt-4">No holdings synced yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
