"use client";

import { useEffect, useMemo, useState } from "react";
import { SignalsSummary } from "@/components/signals/SignalsSummary";
import { SignalsTable } from "@/components/signals/SignalsTable";

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [strategyFilter, setStrategyFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL is missing");
        return;
      }

      const token = getToken();

      if (!token) {
        console.error("Access token missing");
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
        return;
      }

      const data = await res.json();
      setSignals(data);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  const generateSignals = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL is missing");
        return;
      }

      const token = getToken();

      if (!token) {
        console.error("Access token missing");
        return;
      }

      setIsGenerating(true);

      const res = await fetch(`${apiUrl}/signals/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Generate signals failed:", res.status, text);
        return;
      }

      await fetchSignals();
    } catch (err) {
      console.error("Generate signals error:", err);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Signals</h1>

        <button
          onClick={generateSignals}
          disabled={isGenerating}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate Signals"}
        </button>
      </div>

      <SignalsSummary signals={filteredSignals} />

      <div className="grid gap-3 md:grid-cols-3">
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
      </div>

      <SignalsTable signals={filteredSignals} />
    </div>
  );
}
