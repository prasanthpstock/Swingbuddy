"use client";

import { useEffect, useMemo, useState } from "react";
import { LatestSignalCell } from "@/components/signals/LatestSignalCell";

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const getToken = () => {
    try {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("auth-token")
      );

      if (!key) return null;

      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      return (
        parsed?.access_token ??
        parsed?.currentSession?.access_token ??
        parsed?.session?.access_token ??
        null
      );
    } catch {
      return null;
    }
  };

  const fetchPortfolioData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = getToken();

      if (!apiUrl || !token) return;

      const [holdingsRes, signalsRes] = await Promise.all([
        fetch(`${apiUrl}/portfolio/holdings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${apiUrl}/signals`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!holdingsRes.ok) {
        console.error("Failed to fetch holdings");
        return;
      }

      if (!signalsRes.ok) {
        console.error("Failed to fetch signals");
        return;
      }

      const holdingsData = await holdingsRes.json();
      const signalsData = await signalsRes.json();

      setHoldings(holdingsData);
      setSignals(signalsData);
    } catch (err) {
      console.error("Portfolio fetch error:", err);
    }
  };

  const syncPortfolio = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = getToken();

      if (!apiUrl || !token) return;

      setIsSyncing(true);

      const res = await fetch(`${apiUrl}/portfolio/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Portfolio sync failed:", res.status, text);
        return;
      }

      await fetchPortfolioData();
    } catch (err) {
      console.error("Portfolio sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const latestSignalBySymbol = useMemo(() => {
    const map = new Map<string, any>();

    for (const signal of signals) {
      const symbol = signal.symbol;
      if (!symbol) continue;

      if (!map.has(symbol)) {
        map.set(symbol, signal);
      }
    }

    return map;
  }, [signals]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>

        <button
          onClick={syncPortfolio}
          disabled={isSyncing}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSyncing ? "Syncing..." : "Sync Portfolio"}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full text-sm">
          <thead className="border-b bg-white">
            <tr className="text-left">
              <th className="p-3">Symbol</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Avg Price</th>
              <th className="p-3">LTP</th>
              <th className="p-3">P&amp;L</th>
              <th className="p-3">Latest Signal</th>
            </tr>
          </thead>

          <tbody>
            {holdings.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No holdings found.
                </td>
              </tr>
            ) : (
              holdings.map((holding, idx) => {
                const latestSignal = latestSignalBySymbol.get(holding.symbol);

                return (
                  <tr
                    key={idx}
                    className="border-b last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="p-3 font-medium">{holding.symbol}</td>
                    <td className="p-3">{holding.quantity}</td>
                    <td className="p-3">₹{Number(holding.avg_price).toFixed(2)}</td>
                    <td className="p-3">₹{Number(holding.ltp).toFixed(2)}</td>
                    <td
                      className={`p-3 font-medium ${
                        Number(holding.pnl) >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ₹{Number(holding.pnl).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <LatestSignalCell signal={latestSignal} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
