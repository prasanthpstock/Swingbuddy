"use client";

import { useEffect, useState } from "react";
import { getPortfolioSummary, syncPortfolio } from "@/lib/api";

export default function PortfolioPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = async () => {
    const data = await getPortfolioSummary();
    setSummary(data);
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      await syncPortfolio();   // calls backend /portfolio/sync
      await loadSummary();     // refresh UI
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="card flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Overview</h3>
          <p className="mt-2 subtle">
            Detailed holdings table comes next.
          </p>
        </div>

        {/* ✅ Sync Button */}
        <button
          onClick={handleSync}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Syncing..." : "Sync Holdings"}
        </button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="subtle">Portfolio Value</p>
          <div className="metric mt-2">
            ₹{summary?.total_portfolio_value ?? 0}
          </div>
        </div>

        <div className="card">
          <p className="subtle">Total P&L</p>
          <div className="metric mt-2">
            ₹{summary?.total_pnl ?? 0}
          </div>
        </div>

        <div className="card">
          <p className="subtle">Open Positions</p>
          <div className="metric mt-2">
            {summary?.open_positions ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}
