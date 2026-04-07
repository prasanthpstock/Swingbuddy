import Link from "next/link";

type Recommendation = {
  id?: string;
  symbol: string;
  score?: number;
  signal_type?: string;
  entry_price?: number;
  stop_loss?: number;
  target_price?: number;
  position_qty?: number;
  rank_no?: number;
  rationale?: string;
  trade_date?: string;
  strategy_code?: string;
};

function RecommendationBadge({ signalType }: { signalType?: string }) {
  const key = (signalType || "watch").toLowerCase();

  const styles: Record<string, string> = {
    buy: "bg-green-100 text-green-700",
    breakout: "bg-blue-100 text-blue-700",
    watch: "bg-amber-100 text-amber-700",
    avoid: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium ${
        styles[key] || "bg-slate-100 text-slate-700"
      }`}
    >
      {(signalType || "WATCH").toUpperCase()}
    </span>
  );
}

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

export function RecommendationsTable({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow">
      <table className="w-full text-sm">
        <thead className="border-b bg-white">
          <tr className="text-left">
            <th className="p-3">Rank</th>
            <th className="p-3">Symbol</th>
            <th className="p-3">Signal</th>
            <th className="p-3">Score</th>
            <th className="p-3">Entry</th>
            <th className="p-3">Stop Loss</th>
            <th className="p-3">Target</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Rationale</th>
          </tr>
        </thead>

        <tbody>
          {recommendations.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-6 text-center text-slate-500">
                No recommendations available for the selected filters.
              </td>
            </tr>
          ) : (
            recommendations.map((r, idx) => (
              <tr
                key={r.id ?? `${r.symbol}-${idx}`}
                className="border-b last:border-b-0 hover:bg-slate-50"
              >
                <td className="p-3">{r.rank_no ?? idx + 1}</td>
                <td className="p-3 font-medium">
                  <Link
                    href={`/stocks/${encodeURIComponent(r.symbol)}`}
                    className="hover:underline"
                  >
                    {r.symbol}
                  </Link>
                </td>
                <td className="p-3">
                  <RecommendationBadge signalType={r.signal_type} />
                </td>
                <td className="p-3">{formatNumber(r.score)}</td>
                <td className="p-3">{formatPrice(r.entry_price)}</td>
                <td className="p-3">{formatPrice(r.stop_loss)}</td>
                <td className="p-3">{formatPrice(r.target_price)}</td>
                <td className="p-3">{formatNumber(r.position_qty, 0)}</td>
                <td className="max-w-xs truncate p-3 text-slate-600">
                  {r.rationale || "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}