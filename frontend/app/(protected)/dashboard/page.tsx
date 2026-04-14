"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  generateRecommendations,
  getRecommendationsList,
  getWatchlistList,
  getTopPicks,
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
  const [topPicks, setTopPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [recommendationData, watchlistData, topPicksData] =
        await Promise.all([
          getRecommendationsList(),
          getWatchlistList(),
          getTopPicks(),
        ]);

      setRecommendations(recommendationData);
      setWatchlist(watchlistData);
      setTopPicks(topPicksData?.items || []);
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

      {/* TOP PICKS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Top Picks Today
        </h2>

        {topPicks.length === 0 ? (
          <p className="text-sm text-slate-500 mt-3">
            No high-confidence trades today.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {topPicks.map((pick) => (
              <div
                key={pick.id}
                className="border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/stocks/${pick.symbol}`}
                      className="font-semibold text-lg hover:underline"
                    >
                      {pick.symbol}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {pick.top_pick_reason}
                    </p>
                  </div>

                  <span className="bg-green-100 text-green-700 px-2 py-1 text-xs rounded">
                    {pick.signal_type}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>Entry: {formatPrice(pick.entry_price)}</div>
                  <div>Stop: {formatPrice(pick.stop_loss)}</div>
                  <div>Target: {formatPrice(pick.target_price)}</div>
                  <div>R:R: {pick.risk_reward}</div>
                  <div>Risk: {formatPercent(pick.risk_pct)}</div>
                  <div>Score: {pick.score}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}