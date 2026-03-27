export function SignalsSummary({ signals }: { signals: any[] }) {
  const counts = {
    total: signals.length,
    buy: signals.filter((s) => s.signal_type === "buy").length,
    sell: signals.filter((s) => s.signal_type === "sell").length,
    risk: signals.filter((s) => s.signal_type === "risk").length,
    hold: signals.filter((s) => s.signal_type === "hold").length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card label="Total" value={counts.total} />
      <Card label="BUY" value={counts.buy} color="text-green-600" />
      <Card label="SELL" value={counts.sell} color="text-orange-600" />
      <Card label="RISK" value={counts.risk} color="text-red-600" />
      <Card label="HOLD" value={counts.hold} color="text-gray-500" />
    </div>
  );
}

function Card({ label, value, color = "" }: any) {
  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
