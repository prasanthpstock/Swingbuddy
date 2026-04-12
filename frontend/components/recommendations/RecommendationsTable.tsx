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
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  riskPct?: number;
  rewardPct?: number;
  riskReward?: number;
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
    <span className={`rounded px-2 py-1 text-xs font-medium ${styles[key] || "bg-slate-100 text-slate-700"}`}>
      {(signalType || "WATCH").toUpperCase()}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence?: "HIGH" | "MEDIUM" | "LOW" }) {
  const key = confidence || "LOW";

  const styles: Record<string, string> = {
    HIGH: "bg-emerald-100 text-emerald-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${styles[key]}`}>
      {key}
    </span>
  );
}

function formatPrice(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "-";
  return `₹${Number(value).toFixed(2)}`;
}

function formatNumber(value?: number, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

function formatPercent(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(2)}%`;
}

function toNumber(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return undefined;
  return Number(value);
}

function getConfidenceLevel(score?: number): "HIGH" | "MEDIUM" | "LOW" {
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

function getRowHighlight(score?: number) {
  const s = score ?? 0;
  if (s >= 75) return "bg-emerald-50";
  if (s >= 60) return "bg-amber-50";
  return "";
}

export function RecommendationsTable({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow">
      <table className="w-full min-w-[1200px] text-sm">
        <thead className="border-b bg-white">
          <tr className="text-left">
            <th className="p-3">Rank</th>
            <th className="p-3">Symbol</th>
            <th className="p-3">Signal</th>
            <th className="p-3">Confidence</th>
            <th className="p-3">Score</th>
            <th className="p-3">Entry</th>
            <th className="p-3">Stop</th>
            <th className="p-3">Target</th>
            <th className="p-3">Risk %</th>
            <th className="p-3">Reward %</th>
            <th className="p-3">R:R</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Rationale</th>
          </tr>
        </thead>

        <tbody>
          {recommendations.length === 0 ? (
            <tr>
              <td colSpan={13} className="p-6 text-center text-slate-500">
                No recommendations available for the selected filters.
              </td>
            </tr>
          ) : (
            recommendations.map((r, idx) => {
              const confidence = r.confidence || getConfidenceLevel(r.score);
              const riskPct = r.riskPct ?? getRiskPct(r);
              const rewardPct = r.rewardPct ?? getRewardPct(r);
              const riskReward = r.riskReward ?? getRiskReward(r);

              return (
                <tr
                  key={r.id ?? `${r.symbol}-${idx}`}
                  className={`border-b last:border-b-0 hover:bg-slate-50 ${getRowHighlight(r.score)}`}
                >
                  <td className="p-3">{r.rank_no ?? idx + 1}</td>

                  <td className="p-3 font-medium">
                    <Link href={`/stocks/${encodeURIComponent(r.symbol)}`} className="text-slate-900 hover:underline">
                      {r.symbol}
                    </Link>
                  </td>

                  <td className="p-3">
                    <RecommendationBadge signalType={r.signal_type} />
                  </td>

                  <td className="p-3">
                    <ConfidenceBadge confidence={confidence} />
                  </td>

                  <td className="p-3 font-medium">{formatNumber(r.score)}</td>
                  <td className="p-3">{formatPrice(r.entry_price)}</td>
                  <td className="p-3">{formatPrice(r.stop_loss)}</td>
                  <td className="p-3">{formatPrice(r.target_price)}</td>
                  <td className="p-3">{formatPercent(riskPct)}</td>
                  <td className="p-3">{formatPercent(rewardPct)}</td>
                  <td className="p-3 font-medium">{formatNumber(riskReward)}</td>
                  <td className="p-3">{formatNumber(r.position_qty, 0)}</td>

                  <td className="max-w-sm p-3 text-slate-600">
                    <div className="line-clamp-2">{r.rationale || "-"}</div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}