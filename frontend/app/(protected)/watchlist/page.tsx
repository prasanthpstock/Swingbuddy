"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getWatchlistList, type WatchlistItem } from "@/lib/api";

type SortOption = "distance" | "volume" | "momentum";

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

function getDistanceClasses(distance?: number) {
  const absDistance = Math.abs(distance ?? 999);

  if (absDistance < 1) {
    return "text-green-600 font-medium";
  }

  if (absDistance < 2) {
    return "text-amber-600 font-medium";
  }

  return "text-slate-700";
}

export default function WatchlistPage() {
  const [data, setData] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [minVolume, setMinVolume] = useState("0");
  const [onlyPositiveMomentum, setOnlyPositiveMomentum] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("distance");

  async function load() {
    try {
      setError("");
      const items = await getWatchlistList();
      setData(items);
    } catch (err) {
      console.error("Failed to load watchlist", err);
      setError("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setMinVolume("0");
    setOnlyPositiveMomentum(false);
    setSortBy("distance");
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toUpperCase();

    const result = data.filter((item) => {
      const matchSearch = !s || (item.symbol || "").toUpperCase().includes(s);
      const matchVolume = (item.volume_ratio ?? 0) >= Number(minVolume || 0);
      const matchMomentum =
        !onlyPositiveMomentum || (item.momentum_20d ?? 0) > 0;

      return matchSearch && matchVolume && matchMomentum;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "volume":
          return (b.volume_ratio ?? 0) - (a.volume_ratio ?? 0);
        case "momentum":
          return (b.momentum_20d ?? 0) - (a.momentum_20d ?? 0);
        case "distance":
        default:
          return (
            Math.abs(a.distance_to_breakout_pct ?? 999) -
            Math.abs(b.distance_to_breakout_pct ?? 999)
          );
      }
    });

    return result;
  }, [data, search, minVolume, onlyPositiveMomentum, sortBy]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Swingbuddy V2</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Watchlist Radar
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Near-breakout names with momentum and volume context.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Filters & Sorting
          </h2>
          <button
            onClick={resetFilters}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Reset
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Search Symbol
            </label>
            <input
              placeholder="e.g. INFY"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Min Volume Ratio
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={minVolume}
              onChange={(e) => setMinVolume(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyPositiveMomentum}
                onChange={(e) => setOnlyPositiveMomentum(e.target.checked)}
              />
              Momentum &gt; 0 only
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="distance">Closest breakout</option>
              <option value="volume">Volume strength</option>
              <option value="momentum">Momentum</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing{" "}
          <span className="font-medium text-slate-900">{filtered.length}</span>{" "}
          of <span className="font-medium text-slate-900">{data.length}</span>{" "}
          watchlist candidates
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading watchlist...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No watchlist candidates match your filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3 font-medium text-slate-600">Symbol</th>
                <th className="p-3 font-medium text-slate-600">Close</th>
                <th className="p-3 font-medium text-slate-600">Breakout</th>
                <th className="p-3 font-medium text-slate-600">Distance</th>
                <th className="p-3 font-medium text-slate-600">Volume</th>
                <th className="p-3 font-medium text-slate-600">Momentum</th>
                <th className="p-3 font-medium text-slate-600">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr
                  key={`${item.symbol}-${idx}`}
                  className="border-t border-slate-200"
                >
                  <td className="p-3 font-medium">
                    <Link
                      href={`/stocks/${encodeURIComponent(item.symbol)}`}
                      className="text-slate-900 hover:underline"
                    >
                      {item.symbol}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-700">
                    {formatPrice(item.close)}
                  </td>
                  <td className="p-3 text-slate-700">
                    {formatPrice(item.breakout_20_high_prev)}
                  </td>
                  <td
                    className={`p-3 ${getDistanceClasses(
                      item.distance_to_breakout_pct
                    )}`}
                  >
                    {formatNumber(item.distance_to_breakout_pct)}%
                  </td>
                  <td className="p-3 text-slate-700">
                    {formatNumber(item.volume_ratio)}
                  </td>
                  <td className="p-3 text-slate-700">
                    {formatNumber(item.momentum_20d)}
                  </td>
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