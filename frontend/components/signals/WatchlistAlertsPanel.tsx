type WatchlistAlert = {
  id: string;
  symbol: string;
  signal_type: string;
  strategy: string;
  signal_date: string;
  created_at: string;
};

type Props = {
  alerts: WatchlistAlert[];
  isLoading?: boolean;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getBadgeClass(signalType?: string) {
  switch (String(signalType || "").toUpperCase()) {
    case "SELL":
      return "bg-red-100 text-red-700 border border-red-200";
    case "RISK":
      return "bg-orange-100 text-orange-700 border border-orange-200";
    case "BUY":
      return "bg-green-100 text-green-700 border border-green-200";
    case "HOLD":
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

export function WatchlistAlertsPanel({ alerts, isLoading = false }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">Watched Alerts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Recent SELL / RISK alerts for symbols in your watchlist.
        </p>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading watched alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-sm text-slate-500">
            No watched alerts yet. Add symbols to your watchlist and generate signals.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {alert.symbol}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeClass(alert.signal_type)}`}
                    >
                      {String(alert.signal_type || "").toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Strategy: {alert.strategy || "-"} · Signal Date:{" "}
                    {formatDate(alert.signal_date)}
                  </div>
                </div>

                <div className="ml-4 shrink-0 text-xs text-slate-500">
                  {formatDate(alert.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
