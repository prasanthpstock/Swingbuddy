"use client";

import { useEffect, useMemo, useState } from "react";
import { SignalsSummary } from "@/components/signals/SignalsSummary";
import GroupedSignalsList from "@/components/GroupedSignalsList";
import type { Signal } from "@/lib/groupSignals";

type SortOption =
  | "newest"
  | "oldest"
  | "symbol_asc"
  | "symbol_desc"
  | "action_asc"
  | "action_desc"
  | "strategy_asc"
  | "strategy_desc";

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [strategyFilter, setStrategyFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    fetchSignals();
  }, []);

  const getToken = () => {
    try {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("auth-token")
      );

      if (!key) {
        console.error("Supabase auth key not found");
        return null;
      }

      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      return (
        parsed?.access_token ??
        parsed?.currentSession?.access_token ??
        parsed?.session?.access_token ??
        null
      );
    } catch (err) {
      console.error("Token parse error", err);
      return null;
    }
  };

  const fetchSignals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL is missing");
        setError("API configuration is missing.");
        return;
      }

      const token = getToken();

      if (!token) {
        console.error("Access token missing");
        setError("Access token missing. Please sign in again.");
        return;
      }

      const res = await fetch(`${apiUrl}/signals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Signals API failed:", res.status, text);
        setError("Failed to load signals.");
        return;
      }

      const data = await res.json();
      setSignals(data);
    } catch (err) {
      console.error("Fetch failed:", err);
      setError("Failed to load signals.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSignals = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL is missing");
        setError("API configuration is missing.");
        return;
      }

      const token = getToken();

      if (!token) {
        console.error("Access token missing");
        setError("Access token missing. Please sign in again.");
        return;
      }

      setIsGenerating(true);
      setError(null);

      const res = await fetch(`${apiUrl}/signals/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Generate signals failed:", res.status, text);
        setError("Failed to generate signals.");
        return;
      }

      await fetchSignals();
    } catch (err) {
      console.error("Generate signals error:", err);
      setError("Failed to generate signals.");
    } finally {
      setIsGenerating(false);
    }
  };

  const strategyOptions = useMemo(() => {
    const unique = Array.from(
      new Set(signals.map((signal) => signal.strategy).filter(Boolean))
    );
    return ["all", ...unique];
  }, [signals]);

  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      const matchesStrategy =
        strategyFilter === "all" || signal.strategy === strategyFilter;

      const matchesAction =
        actionFilter === "all" ||
        String(signal.signal_type || "").toLowerCase() ===
          actionFilter.toLowerCase();

      const matchesSearch =
        searchQuery.trim() === "" ||
        String(signal.symbol || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matchesStrategy && matchesAction && matchesSearch;
    });
  }, [signals, strategyFilter, actionFilter, searchQuery]);

  const sortedSignals = useMemo(() => {
    const items = [...filteredSignals];

    const getDateValue = (signal: any) => {
      const value = signal.created_at || signal.signal_date || "";
      const timestamp = new Date(value).getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    const compareText = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: "base" });

    items.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return getDateValue(a) - getDateValue(b);
        case "symbol_asc":
          return compareText(String(a.symbol || ""), String(b.symbol || ""));
        case "symbol_desc":
          return compareText(String(b.symbol || ""), String(a.symbol || ""));
        case "action_asc":
          return compareText(
            String(a.signal_type || ""),
            String(b.signal_type || "")
          );
        case "action_desc":
          return compareText(
            String(b.signal_type || ""),
            String(a.signal_type || "")
          );
        case "strategy_asc":
          return compareText(String(a.strategy || ""), String(b.strategy || ""));
        case "strategy_desc":
          return compareText(String(b.strategy || ""), String(a.strategy || ""));
        case "newest":
        default:
          return getDateValue(b) - getDateValue(a);
      }
    });

    return items;
  }, [filteredSignals, sortBy]);

  const summaryCounts = useMemo(() => {
    return {
      total: sortedSignals.length,
      buy: sortedSignals.filter((s) => s.signal_type === "buy").length,
      sell: sortedSignals.filter((s) => s.signal_type === "sell").length,
      risk: sortedSignals.filter((s) => s.signal_type === "risk").length,
      hold: sortedSignals.filter((s) => s.signal_type === "hold").length,
    };
  }, [sortedSignals]);

  const groupedSignalsInput = useMemo(() => {
    return sortedSignals.map((s) => ({
      ...s,
      action: String(s.signal_type || "").toUpperCase(),
    })) as Signal[];
  }, [sortedSignals]);

  const hasNoSignals = !isLoading && groupedSignalsInput.length === 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Signals</h1>

        <button
          onClick={generateSignals}
          disabled={isGenerating}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "Generating signals..." : "Generate Signals"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SignalsSummary signals={sortedSignals} />

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span className="font-medium text-slate-800">
          Showing {summaryCounts.total}
        </span>{" "}
        signal{summaryCounts.total === 1 ? "" : "s"} · BUY: {summaryCounts.buy} ·
        SELL: {summaryCounts.sell} · RISK: {summaryCounts.risk} · HOLD:{" "}
        {summaryCounts.hold}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
        >
          {strategyOptions.map((strategy) => (
            <option key={strategy} value={strategy}>
              {strategy === "all" ? "All Strategies" : strategy}
            </option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
        >
          <option value="all">All Actions</option>
          <option value="buy">BUY</option>
          <option value="sell">SELL</option>
          <option value="risk">RISK</option>
          <option value="hold">HOLD</option>
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search symbol..."
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
        >
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
          <option value="symbol_asc">Sort: Symbol A-Z</option>
          <option value="symbol_desc">Sort: Symbol Z-A</option>
          <option value="action_asc">Sort: Action A-Z</option>
          <option value="action_desc">Sort: Action Z-A</option>
          <option value="strategy_asc">Sort: Strategy A-Z</option>
          <option value="strategy_desc">Sort: Strategy Z-A</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Loading signals...
        </div>
      ) : hasNoSignals ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No signals found. Try generating signals or adjusting your filters.
        </div>
      ) : (
        <GroupedSignalsList signals={groupedSignalsInput} />
      )}
    </div>
  );
}
