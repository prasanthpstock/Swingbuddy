"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  generateRecommendations,
  getRecommendationsList,
  getWatchlistList,
  type Recommendation,
  type WatchlistItem,
} from "@/lib/api";

function formatPrice(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "-";
  }
  return `₹${Number(value).toFixed(2)}`;
}

function formatPercent(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(2)}%`;
}

function getSignalBadgeClasses(signalType?: string) {
  const key = (signalType || "watch").toLowerCase();

  const styles: Record<string, string> = {
    buy: "bg-green-100 text-green-700",
    breakout: "bg-blue-100 text-blue-700",
    watch: "bg-amber-100 text-amber-700",
    avoid: "bg-red-100 text-red-700",
  };

  return styles[key] || "bg-slate-100 text-slate-700";
}

export default function DashboardPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [recommendationData, watchlistData] = await Promise.all([
        getRecommendationsList(),
        getWatchlistList(),
      ]);

      setRecommendations(recommendationData);
      setWatchlist(watchlistData);
    } catch (err) {
      console.error("Failed to load dashboard", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      setError("");
      await generateRecommendations();
      await loadDashboard(true);
    } catch (err) {
      console.error("Failed to generate recommendations", err);
      setError("Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const topRecommendations = useMemo(() => {
    return [...recommendations]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);
  }, [recommendations]);

  const topWatchlist = useMemo(() => {
    return [...watchlist]
      .sort(
        (a, b) =>
          Math.abs(a.distance_to_breakout_pct ?? 999) -
          Math.abs(b.distance_to_breakout_pct ?? 999)
      )
      .slice(0, 5);
  }, [watchlist]);

  const bestPick = topRecommendations[0];
  const closestWatchlistCandidate = topWatchlist[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Swingbuddy V2</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Daily trade ideas, breakout radar, and actionable setups.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing || generating}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating || refreshing}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate Recommendations"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading dashboard...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Recommendations</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {recommendations.length}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Ranked trade setups available today.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Watchlist Candidates</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {watchlist.length}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Near-breakout stocks worth monitoring.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">System Status</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">
                Live
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Frontend is connected to the V2 backend.
              </p>
            </div>
          </div>

          {recommendations.length === 0 && closestWatchlistCandidate ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Market Insight: No confirmed breakouts today.{" "}
              <span className="font-semibold">
                {closestWatchlistCandidate.symbol}
              </span>{" "}
              is currently the closest to a potential breakout.
            </div>
          ) : null}

          {closestWatchlistCandidate ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Closest to Breakout</p>
              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xl font-semibold text-slate-900">
                    {closestWatchlistCandidate.symbol}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatPercent(
                      closestWatchlistCandidate.distance_to_breakout_pct
                    )}{" "}
                    away from breakout level
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm md:text-right">
                  <div>
                    <div className="text-slate-500">Close</div>
                    <div className="font-medium text-slate-900">
                      {formatPrice(closestWatchlistCandidate.close)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Breakout</div>
                    <div className="font-medium text-slate-900">
                      {formatPrice(
                        closestWatchlistCandidate.breakout_20_high_prev
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-600">
                {closestWatchlistCandidate.watchlist_reason ||
                  "Near breakout with acceptable trend and momentum."}
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Top Pick
                </h2>
                <Link
                  href="/recommendations"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  View all
                </Link>
              </div>

              {!bestPick ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No recommendation available today.
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xl font-semibold text-slate-900">
                        {bestPick.symbol}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${getSignalBadgeClasses(
                            bestPick.signal_type
                          )}`}
                        >
                          {(bestPick.signal_type || "WATCH").toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Score
                      </div>
                      <div className="text-2xl font-semibold text-slate-900">
                        {bestPick.score ?? "-"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Entry</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatPrice(bestPick.entry_price)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Stop Loss</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatPrice(bestPick.stop_loss)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Target</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatPrice(bestPick.target_price)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Rationale
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {bestPick.rationale || "No rationale available."}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Top Recommendations
                </h2>
                <Link
                  href="/recommendations"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  See all
                </Link>
              </div>

              {topRecommendations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No recommendations available today.
                </div>
              ) : (
                <div className="space-y-3">
                  {topRecommendations.map((item, idx) => (
                    <div
                      key={item.id ?? `${item.symbol}-${idx}`}
                      className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-start lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-slate-900">
                            {item.symbol}
                          </div>
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${getSignalBadgeClasses(
                              item.signal_type
                            )}`}
                          >
                            {(item.signal_type || "WATCH").toUpperCase()}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {item.rationale || "No rationale available."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm lg:min-w-[280px]">
                        <div>
                          <div className="text-slate-500">Score</div>
                          <div className="font-medium text-slate-900">
                            {item.score ?? "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Qty</div>
                          <div className="font-medium text-slate-900">
                            {item.position_qty ?? "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Entry</div>
                          <div className="font-medium text-slate-900">
                            {formatPrice(item.entry_price)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Target</div>
                          <div className="font-medium text-slate-900">
                            {formatPrice(item.target_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Watchlist Radar
              </h2>
              <Link
                href="/watchlist"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                See all
              </Link>
            </div>

            {topWatchlist.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No watchlist candidates available right now.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3 font-medium text-slate-600">Symbol</th>
                      <th className="p-3 font-medium text-slate-600">Close</th>
                      <th className="p-3 font-medium text-slate-600">Breakout</th>
                      <th className="p-3 font-medium text-slate-600">Distance</th>
                      <th className="p-3 font-medium text-slate-600">
                        Volume Ratio
                      </th>
                      <th className="p-3 font-medium text-slate-600">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topWatchlist.map((item, idx) => (
                      <tr
                        key={`${item.symbol}-${idx}`}
                        className="border-t border-slate-200"
                      >
                        <td className="p-3 font-medium text-slate-900">
                          {item.symbol}
                        </td>
                        <td className="p-3 text-slate-700">
                          {formatPrice(item.close)}
                        </td>
                        <td className="p-3 text-slate-700">
                          {formatPrice(item.breakout_20_high_prev)}
                        </td>
                        <td className="p-3 text-slate-700">
                          {formatPercent(item.distance_to_breakout_pct)}
                        </td>
                        <td className="p-3 text-slate-700">
                          {item.volume_ratio ?? "-"}
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
          </section>
        </>
      )}
    </div>
  );
}