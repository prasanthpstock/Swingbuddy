import { SignalBadge } from "@/components/signals/SignalBadge";

export function SignalsTable({ signals }: { signals: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr className="text-left">
            <th className="p-3">Symbol</th>
            <th className="p-3">Action</th>
            <th className="p-3">Strategy</th>
            <th className="p-3">Price</th>
            <th className="p-3">Notes</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s: any, idx: number) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium">{s.symbol}</td>
              <td className="p-3">
                <SignalBadge type={s.signal_type} />
              </td>
              <td className="p-3">{s.strategy}</td>
              <td className="p-3">₹{Number(s.price).toFixed(2)}</td>
              <td className="p-3 text-gray-600">{s.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
