type Props = {
  signals: any[];
};

function formatSignalDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function SignalTimeline({ signals }: Props) {
  if (!signals || signals.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No signal history available.
      </div>
    );
  }

  const getSignalBadgeClass = (signalType?: string) => {
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
  };

  return (
    <div className="space-y-2">
      {signals.map((signal, idx) => (
        <div
          key={signal.id ?? `${signal.symbol}-${signal.strategy}-${idx}`}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800">
              {signal.strategy || "Unknown strategy"}
            </div>
            <div className="text-xs text-slate-500">
              {formatSignalDate(signal.created_at || signal.signal_date)}
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getSignalBadgeClass(signal.signal_type)}`}
          >
            {String(signal.signal_type || "HOLD").toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
