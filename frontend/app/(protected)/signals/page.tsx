"use client";

import { useEffect, useMemo, useState } from "react";
import { getSignals, generateSignals } from "@/lib/api";

type Signal = {
  id: string;
  symbol: string;
  strategy: string;
  signal_type: string | null;
  price: number | null;
  notes: string | null;
  created_at: string | null;
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

const formatINR = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
};

const getSignalBadgeClass = (signalType: string | null | undefined) => {
  if (signalType === "sell") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (signalType === "risk") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }
  if (signalType === "hold") {
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadSignals = async () => {
    try {
      const data = await getSignals();
      setSignals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load signals", err);
    }
  };

  useEffect(() => {
    loadSignals();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateSignals();
      await loadSignals();

      if (result?.status === "success") {
        if ((result.inserted ?? 0) > 0) {
          alert(`✅ ${result.inserted} new signals generated`);
        } else {
          alert(`ℹ️ Signals already generated for today\nSkipped: ${result.skipped ?? 0}`);
        }
        return;
      }

      const detailedErrors = Array.isArray(result?.errors)
        ? result.errors.map((e: any) => `${e.symbol}: ${e.error}`).join("\n\n")
        : null;

      alert(detailedErrors || result?.message || "Signal generation failed.");
    } catch (err: any) {
      console.error("Failed to generate signals", err);
      alert(err?.message || "Failed to generate signals.");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const sell = signals.filter((s) => s.signal_type === "sell").length;
    const risk = signals.filter((s) => s.signal_type === "risk").length;
    const hold = signals.filter((s) => s.signal_type === "hold").length;

    return {
      total: signals.length,
      sell,
      risk,
      hold,
    };
  }, [signals]);

  const filteredSignals = useMemo(() => {
    if (filter === "all") return signals;
    return signals.filter((signal) => signal.signal_type === filter);
  }, [signals, filter]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Signals</h3>
            <p className="mt-2 text-sm text-slate-500">
              Strategy outputs generated from your latest portfolio snapshot.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition ${
              loading
                ? "cursor-not-allowed bg-slate-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Generating..." : "Generate Signals"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Signals</p>
          <div className="mt-3 text-2xl font-semibold text-slate-900">
            {summary.total}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Sell Signals</p>
          <div className="mt-3 text-2xl font-semibold text-emerald-600">
            {summary.sell}
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Risk Signals</p>
          <div className="mt-3 text-2xl font-semibold text-red-600">
            {summary.risk}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Hold Signals</p>
          <div className="mt-3 text-2xl font-semibold text-slate-700">
            {summary.hold}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Latest Signals</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {filteredSignals.length} {filteredSignals.length === 1 ? "signal" : "signals"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", "sell", "risk", "hold"].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  filter === type
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {type === "all"
                  ? "All"
                  : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 pr-6 font-medium">Symbol</th>
                <th className="pb-3 pr-6 font-medium">Strategy</th>
                <th className="pb-3 pr-6 font-medium">Type</th>
                <th className="pb-3 pr-6 font-medium">Price</th>
                <th className="pb-3 pr-6 font-medium">Notes</th>
                <th className="pb-3 pr-6 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredSignals.map((signal) => (
                <tr
                  key={signal.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="py-4 pr-6 font-semibold text-slate-900">
                    {signal.symbol}
                  </td>
                  <td className="py-4 pr-6 text-slate-700">
                    {signal.strategy}
                  </td>
                  <td className="py-4 pr-6">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSignalBadgeClass(
                        signal.signal_type
                      )}`}
                    >
                      {signal.signal_type || "watch"}
                    </span>
                  </td>
                  <td className="py-4 pr-6 text-slate-700">
                    {formatINR(signal.price)}
                  </td>
                  <td className="py-4 pr-6 text-slate-600">
                    {signal.notes || "—"}
                  </td>
                  <td className="py-4 pr-6 text-slate-600">
                    {formatDateTime(signal.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSignals.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No signals found for this filter.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
