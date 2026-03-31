"use client";

import { useEffect, useMemo, useState } from "react";
import { SignalsSummary } from "@/components/signals/SignalsSummary";
import { WatchlistAlertsPanel } from "@/components/signals/WatchlistAlertsPanel";
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

type WatchlistItem = {
  id: string;
  symbol: string;
  created_at: string;
};

type WatchlistAlert = {
  id: string;
  symbol: string;
  signal_type: string;
  strategy: string;
  signal_date: string;
  created_at: string;
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(true);
  const [isAlertsLoading, setIsAlertsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showWatchedOnly, setShowWatchedOnly] = useState(false);

  const [strategyFilter, setStrategyFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    initializePage();
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

  const getApiUrlAndToken = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const token = getToken();

    if (!apiUrl) {
      setError("API configuration is missing.");
      return null;
    }

    if (!token) {
      setError("Access token missing. Please sign in again.");
      return null;
    }

    return { apiUrl, token };
  };

  const initializePage = async () => {
    setIsLoading(true);
    setIsWatchlistLoading(true);
    setIsAlertsLoading(true);
    setError(null);

    try {
      await Promise.all([fetchSignals(), fetchWatchlist(), fetchWatchlistAlerts()]);
    } finally {
      setIsLoading(false);
      setIsWatchlistLoading(false);
      setIsAlertsLoading(false);
    }
  };

  const fetchSignals = async () => {
    try {
      const auth = getApiUrlAndToken();
      if (!auth) return;

      const { apiUrl, token } = auth;

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
      console.error("Fetch signals failed:", err);
      setError("Failed to load signals.");
    }
  };

  const fetchWatchlist = async () => {
    try {
      const auth = getApiUrlAndToken();
      if (!auth) return;

      const { apiUrl, token } = auth;

      const res = await fetch(`${apiUrl}/watchlist`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Watchlist API failed:", res.status, text);
        setError("Failed to load watchlist.");
        return;
      }

      const data: WatchlistItem[] = await res.json();
      setWatchlist(data.map((item) => String(item.symbol || "").toUpperCase()));
    } catch (err) {
      console.error("Fetch watchlist failed:", err);
      setError("Failed to load watchlist.");
    }
  };

  const fetchWatchlistAlerts = async () => {
    try {
      const auth = getApiUrlAndToken();
      if (!auth) return;

      const { apiUrl, token } = auth;

      const res = await fetch(`${apiUrl}/alerts/watchlist`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Watchlist alerts API failed:", res.status, text);
        setError("Failed to load watched alerts.");
        return;
      }

      const data: WatchlistAlert[] = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error("Fetch watchlist alerts failed:", err);
      setError("Failed to load watched alerts.");
    }
  };

  const toggleWatch = async (symbol: string) => {
    const normalizedSymbol = String(symbol || "").toUpperCase();
    if (!normalizedSymbol) return;

    const auth = getApiUrlAndToken();
    if (!auth) return;

    const { apiUrl, token } = auth;
    const isWatched = watchlist.includes(normalizedSymbol);

    try {
      setError(null);

      const res = await fetch(`${apiUrl}/watchlist/${normalizedSymbol}`, {
        method: isWatched ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Toggle watchlist failed:", res.status, text);
        setError("Failed to update watchlist.");
        return;
      }

      setWatchlist((prev) =>
        isWatched
          ? prev.filter((item) => item !== normalizedSymbol)
          : [...prev, normalizedSymbol]
      );

      if (isWatched && showWatchedOnly) {
        setShowWatchedOnly(false);
      }
    } catch (err) {
      console.error("Toggle watchlist error:", err);
      setError("Failed to update watchlist.");
    }
  };

  const generateSignals = async () => {
    try {
      const auth = getApiUrlAndToken();
      if (!auth) return;

      const { apiUrl, token } = auth;

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

      await Promise.all([fetchSignals(), fetchWatchlistAlerts()]);
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

      const matchesWatchlist =
        !showWatchedOnly || watchlist.includes(String(signal.symbol || "").toUpperCase());

      return (
        matchesStrategy &&
        matchesAction &&
        matchesSearch &&
        matchesWatchlist
      );
    });
  }, [signals, strategyFilter, actionFilter, searchQuery, showWatchedOnly, watchlist]);

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

      <WatchlistAlertsPanel alerts={alerts} isLoading={isAlertsLoading} />

      <SignalsSummary signals={sortedSignals} />

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span className="font-medium text-slate-800">
          Showing {summaryCounts.total}
        </span>{" "}
        signal{summaryCounts.total === 1 ? "" : "s"} · BUY: {summaryCounts.buy} ·
        SELL: {summaryCounts.sell} · RISK: {summaryCounts.risk} · HOLD:{" "}
        {summaryCounts.hold}
      </div>

      <div className="grid gap-3 md:grid-cols-5">
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

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showWatchedOnly}
            onChange={(e) => setShowWatchedOnly(e.target.checked)}
            disabled={isWatchlistLoading}
          />
          Watched only
        </label>
      </div>

      {watchlist.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Watching {watchlist.length} symbol{watchlist.length === 1 ? "" : "s"}:{" "}
          {watchlist.join(", ")}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Loading signals...
        </div>
      ) : hasNoSignals ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No signals found. Try generating signals or adjusting your filters.
        </div>
      ) : (
        <GroupedSignalsList
          signals={groupedSignalsInput}
          watchlist={watchlist}
          onToggleWatch={toggleWatch}
        />
      )}
    </div>
  );
}
