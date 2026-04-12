"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  generateRecommendations,
  getRecommendationsList,
  type Recommendation,
} from "@/lib/api";
import { RecommendationsTable } from "@/components/recommendations/RecommendationsTable";

type SortOption =
  | "score_desc"
  | "rank_asc"
  | "symbol_asc"
  | "risk_reward_desc"
  | "lowest_risk_pct";

type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
type ConfidenceFilter = "ALL" | ConfidenceLevel;

function toNumber(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return undefined;
  }
  return Number(value);
}

function getConfidenceLevel(score?: number): ConfidenceLevel {
  const safeScore = toNumber(score) ?? 0;
  if (safeScore >= 75) return "HIGH";
  if (safeScore >= 60) return "MEDIUM";
  return "LOW";
}

function getRiskPct(item: Recommendation) {
  const entry = toNumber(item.entry_price);
  const stop = toNumber(item.stop_loss);

  if (!entry || !stop || entry <= 0) return undefined;
  return ((entry - stop) / entry) * 100;
}

function getRewardPct(item: Recommendation) {
  const entry = toNumber(item.entry_price);
  const target = toNumber(item.target_price);

  if (!entry || !target || entry <= 0) return undefined;
  return ((target - entry) / entry) * 100;
}

function getRiskReward(item: Recommendation) {
  const entry = toNumber(item.entry_price);
  const stop = toNumber(item.stop_loss);
  const target = toNumber(item.target_price);

  if (!entry || !stop || !target) return undefined;

  const risk = entry - stop;
  const reward = target - entry;

  if (risk <= 0 || reward <= 0) return undefined;
  return reward / risk;
}

function formatRatio(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

type RecommendationWithDerived = Recommendation & {
  confidence: ConfidenceLevel;
  riskPct?: number;
  rewardPct?: number;
  riskReward?: number;
};

function enrichRecommendation(item: Recommendation): RecommendationWithDerived {
  return {
    ...item,
    confidence: getConfidenceLevel(item.score),
    riskPct: getRiskPct(item),
    rewardPct: getRewardPct(item),
    riskReward: getRiskReward(item),
  };
}

function groupByConfidence(items: RecommendationWithDerived[]) {
  return {
    HIGH: items.filter((item) => item.confidence === "HIGH"),
    MEDIUM: items.filter((item) => item.confidence === "MEDIUM"),
    LOW: items.filter((item) => item.confidence === "LOW"),
  };
}

export default function RecommendationsPage() {
  const [data, setData] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [signalFilter, setSignalFilter] = useState("ALL");
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilter>("ALL");
  const [minScore, setMinScore] = useState("0");
  const [sortBy, setSortBy] = useState<SortOption>("score_desc");
  const [groupedView, setGroupedView] = useState(true);

  async function load() {
    try {
      setError("");
      const items = await getRecommendationsList();
      setData(items);
    } catch (err) {
      console.error("Failed to load recommendations", err);
      setError("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      setError("");
      await generateRecommendations();
      await load();
    } catch (err) {
      console.error("Failed to generate recommendations", err);
      setError("Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setSignalFilter("ALL");
    setConfidenceFilter("ALL");
    setMinScore("0");
    setSortBy("score_desc");
    setGroupedView(true);
  }

  useEffect(() => {
    load();
  }, []);

  const enrichedData = useMemo(() => {
    return data.map(enrichRecommendation);
  }, [data]);

  const summary = useMemo(() => {
    const breakoutCount = enrichedData.filter(
      (item) => (item.signal_type || "").toUpperCase() === "BREAKOUT"
    ).length;

    const buyCount = enrichedData.filter(
      (item) => (item.signal_type || "").toUpperCase() === "BUY"
    ).length;

    const highConfidenceCount = enrichedData.filter(
      (item) => item.confidence === "HIGH"
    ).length;

    const validRiskReward = enrichedData
      .map((item) => item.riskReward)
      .filter((value): value is number => value !== undefined);

    const avgRiskReward =
      validRiskReward.length > 0
        ? validRiskReward.reduce((sum, value) => sum + value, 0) /
          validRiskReward.length
        : undefined;

    return {
      total: enrichedData.length,
      breakoutCount,
      buyCount,
      highConfidenceCount,
      avgRiskReward,
    };
  }, [enrichedData]);

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toUpperCase();
    const parsedMinScore = Number(minScore || 0);

    const filtered = enrichedData.filter((item) => {
      const matchesSearch =
        normalizedSearch === "" ||
        (item.symbol || "").toUpperCase().includes(normalizedSearch);

      const matchesSignal =
        signalFilter === "ALL" ||
        (item.signal_type || "").toUpperCase() === signalFilter;

      const matchesConfidence =
        confidenceFilter === "ALL" || item.confidence === confidenceFilter;

      const matchesScore = (item.score ?? 0) >= parsedMinScore;

      return (
        matchesSearch &&
        matchesSignal &&
        matchesConfidence &&
        matchesScore
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "rank_asc":
          return (a.rank_no ?? 999) - (b.rank_no ?? 999);
        case "symbol_asc":
          return (a.symbol || "").localeCompare(b.symbol || "");
        case "risk_reward_desc":
          return (b.riskReward ?? -1) - (a.riskReward ?? -1);
        case "lowest_risk_pct":
          return (a.riskPct ?? 999) - (b.riskPct ?? 999);
        case "score_desc":
        default:
          return (b.score ?? 0) - (a.score ?? 0);
      }
    });
  }, [enrichedData, search, signalFilter, confidenceFilter, minScore, sortBy]);

  const groupedData = useMemo(() => {
    return groupByConfidence(filteredData);
  }, [filteredData]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Swingbuddy V2</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Recommendations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ranked daily setups with confidence, rationale, and risk clarity.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Generating..." : "Regenerate"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading recommendations...
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-900">
            No strong setups today
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            The engine did not find any high-confidence breakout opportunities
            in the current universe.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            That usually means the market is in a wait-and-watch phase rather
            than a clean breakout phase.
          </p>

          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/watchlist"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View Watchlist
            </Link>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "Generating..." : "Re-run Scan"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {summary.total}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Recommendations in current scan.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">High Confidence</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {summary.highConfidenceCount}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Best-ranked setups to review first.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Breakouts</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {summary.breakoutCount}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Confirmed breakout-style setups.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Buy Setups</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {summary.buyCount}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Early actionable candidates.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Avg R:R</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {formatRatio(summary.avgRiskReward)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Average reward-to-risk of valid setups.
              </p>
            </div>
          </div>

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

            <div className="grid gap-4 md:grid-cols-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Search Symbol
                </label>
                <input
                  type="text"
                  placeholder="e.g. INFY"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Signal Type
                </label>
                <select
                  value={signalFilter}
                  onChange={(e) => setSignalFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="ALL">All</option>
                  <option value="BREAKOUT">Breakout</option>
                  <option value="BUY">Buy</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Confidence
                </label>
                <select
                  value={confidenceFilter}
                  onChange={(e) =>
                    setConfidenceFilter(e.target.value as ConfidenceFilter)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="ALL">All</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Minimum Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                />
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
                  <option value="score_desc">Score: High to Low</option>
                  <option value="risk_reward_desc">Risk/Reward: Best First</option>
                  <option value="lowest_risk_pct">Lowest Risk %</option>
                  <option value="rank_asc">Rank</option>
                  <option value="symbol_asc">Symbol A-Z</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  View
                </label>
                <select
                  value={groupedView ? "GROUPED" : "FLAT"}
                  onChange={(e) => setGroupedView(e.target.value === "GROUPED")}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="GROUPED">Grouped</option>
                  <option value="FLAT">Flat</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-900">
                {filteredData.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-900">
                {data.length}
              </span>{" "}
              recommendations
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                No results match your filters
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Try lowering the minimum score or clearing your filters.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>
          ) : groupedView ? (
            <div className="space-y-6">
              {(["HIGH", "MEDIUM", "LOW"] as ConfidenceLevel[]).map((level) => {
                const items = groupedData[level];
                if (items.length === 0) return null;

                return (
                  <section
                    key={level}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          {level === "HIGH"
                            ? "High Confidence"
                            : level === "MEDIUM"
                            ? "Medium Confidence"
                            : "Low Confidence"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {items.length} recommendation
                          {items.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <RecommendationsTable recommendations={items} />
                  </section>
                );
              })}
            </div>
          ) : (
            <RecommendationsTable recommendations={filteredData} />
          )}
        </>
      )}
    </div>
  );
}
