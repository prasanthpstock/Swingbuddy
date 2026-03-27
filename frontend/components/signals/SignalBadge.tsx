export function SignalBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    buy: "bg-green-100 text-green-700",
    sell: "bg-orange-100 text-orange-700",
    risk: "bg-red-100 text-red-700",
    hold: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
      {type.toUpperCase()}
    </span>
  );
}
