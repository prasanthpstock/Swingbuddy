"use client";

import { useEffect, useState } from "react";
import { getSignals, generateSignals } from "@/lib/api";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getSignalBadgeClass = (signalType: string | null | undefined) => {
  if (signalType === "buy") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (signalType === "sell") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      alert(
        `Signals generated.\nInserted: ${result.inserted ?? 0}\nSkipped: ${result.skipped ?? 0}`
      );
    } else {
      alert(result?.message || "Signal generation did not complete.");
    }
  } catch (err: any) {
    console.error("Failed to generate signals", err);
    alert(err?.message || "Failed to generate signals.");
  } finally {
    setLoading(false);
  }
};

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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Latest Signals</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {signals.length} {signals.length === 1 ? "signal" : "signals"}
          </span>
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
              {signals.map((signal) => (
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
                    {signal.price ?? "—"}
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

          {signals.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No signals found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
