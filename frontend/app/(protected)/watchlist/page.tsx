"use client";

import { useEffect, useState } from "react";
import { getWatchlistList, type WatchlistItem } from "@/lib/api";

function formatPrice(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "-";
  }
  return `₹${Number(value).toFixed(2)}`;
}

function formatNumber(value?: number, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(digits);
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const data = await getWatchlistList();
      setItems(data);
    } catch (err) {
      console.error("Failed to load watchlist", err);
      setError("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Watchlist</h1>
        <p className="mt-1 text-sm text-slate-500">
          Near-breakout names with momentum and volume context.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-500">Loading watchlist...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No watchlist candidates found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full text-sm">
            <thead className="border-b bg-white">
              <tr className="text-left">
                <th className="p-3">Symbol</th>
                <th className="p-3">Close</th>
                <th className="p-3">Breakout</th>
                <th className="p-3">Distance %</th>
                <th className="p-3">Momentum</th>
                <th className="p-3">Volume Ratio</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={`${item.symbol}-${idx}`}
                  className="border-b last:border-b-0 hover:bg-slate-50"
                >
                  <td className="p-3 font-medium">{item.symbol}</td>
                  <td className="p-3">{formatPrice(item.close)}</td>
                  <td className="p-3">{formatPrice(item.breakout_20_high_prev)}</td>
                  <td className="p-3">{formatNumber(item.distance_to_breakout_pct)}%</td>
                  <td className="p-3">{formatNumber(item.momentum_20d)}</td>
                  <td className="p-3">{formatNumber(item.volume_ratio)}</td>
                  <td className="max-w-sm p-3 text-slate-600">
                    {item.watchlist_reason || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}