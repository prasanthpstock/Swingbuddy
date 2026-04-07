"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getIndicatorsList,
  getRecommendationsList,
  getWatchlistList,
  type IndicatorSnapshot,
  type Recommendation,
  type WatchlistItem,
} from "@/lib/api";

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

function signalClasses(signalType?: string) {
  const key = (signalType || "watch").toLowerCase();
  const styles: Record<string, string> = {
    buy: "bg-green-100 text-green-700",
    breakout: "bg-blue-100 text-blue-700",
    watch: "bg-amber-100 text-amber-700",
    avoid: "bg-red-100 text-red-700",
  };
  return styles[key] || "bg-slate-100 text-slate-700";
}

export default function StockDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(params.symbol).toUpperCase();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [indicators, setIndicators] = useState<IndicatorSnapshot[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const [recData, indicatorData, watchlistData] = await Promise.all([
        getRecommendationsList(),
        getIndicatorsList(),
        getWatchlistList(),
      ]);

      setRecommendations(recData);
      setIndicators(indicatorData);
      setWatchlist(watchlistData);
    } catch (err) {
      console.error("Failed to load stock detail", err);
      setError("Failed to load stock detail");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [symbol]);

  const recommendation = useMemo(() => {
    return recommendations.find((item) => item.symbol?.toUpperCase() === symbol);
  }, [recommendations, symbol]);

  const indicator = useMemo(() => {
    return indicators.find((item) => item.symbol?.toUpperCase() === symbol);
  }, [indicators, symbol]);

  const watchlistItem = useMemo(() => {
    return watchlist.find((item) => item.symbol?.toUpperCase() === symbol);
  }, [watchlist, symbol]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/recommendations"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Back to recommendations
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{symbol}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Indicator snapshot, recommendation, and watchlist context.
          </p>
        </div>

        {recommendation ? (
          <span
            className={`rounded px-3 py-1 text-sm font-medium ${signalClasses(
              recommendation.signal_type
            )}`}
          >
            {(recommendation.signal_type || "WATCH").toUpperCase()}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading stock detail...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Recommendation Score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {recommendation?.score ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Entry</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {formatPrice(recommendation?.entry_price)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Target</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {formatPrice(recommendation?.target_price)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Stop Loss</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {formatPrice(recommendation?.stop_loss)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Recommendation</h2>

              {!recommendation ? (
                <p className="mt-4 text-sm text-slate-500">
                  No recommendation available for this symbol today.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Signal</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {recommendation.signal_type || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Rank</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {recommendation.rank_no ?? "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Quantity</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {recommendation.position_qty ?? "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Trade Date</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {recommendation.trade_date ?? "-"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500">Rationale</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {recommendation.rationale || "No rationale available."}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Watchlist Context</h2>

              {!watchlistItem ? (
                <p className="mt-4 text-sm text-slate-500">
                  This symbol is not currently in the watchlist radar.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">Close</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {formatPrice(watchlistItem.close)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Breakout Level</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {formatPrice(watchlistItem.breakout_20_high_prev)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Distance to Breakout</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {formatNumber(watchlistItem.distance_to_breakout_pct)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Volume Ratio</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {formatNumber(watchlistItem.volume_ratio)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-slate-500">Reason</div>
                    <p className="mt-2 text-sm text-slate-700">
                      {watchlistItem.watchlist_reason || "-"}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Indicator Snapshot</h2>

            {!indicator ? (
              <p className="mt-4 text-sm text-slate-500">
                No indicator snapshot available for this symbol today.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">SMA 20</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatPrice(indicator.sma_20)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">SMA 50</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatPrice(indicator.sma_50)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">EMA 20</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatPrice(indicator.ema_20)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">RSI 14</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatNumber(indicator.rsi_14)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">ATR 14</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatNumber(indicator.atr_14)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Volume Avg 20</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatNumber(indicator.volume_avg_20, 0)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Breakout 20 High</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatPrice(indicator.breakout_20_high_prev)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Momentum 20D</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatNumber(indicator.momentum_20d)}
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}