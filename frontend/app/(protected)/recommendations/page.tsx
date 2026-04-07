"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  generateRecommendations,
  getRecommendationsList,
  type Recommendation,
} from "@/lib/api";
import { RecommendationsTable } from "@/components/recommendations/RecommendationsTable";

export default function RecommendationsPage() {
  const [data, setData] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Swingbuddy V2</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Recommendations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ranked breakout setups generated from your trading engine.
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Recommendations</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data.length}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Trade setups ranked by score.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Top Score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data[0]?.score ?? "-"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Best setup identified in the current scan.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Status</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">
                Live
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Connected to your V2 backend.
              </p>
            </div>
          </div>

          <RecommendationsTable recommendations={data} />
        </>
      )}
    </div>
  );
}