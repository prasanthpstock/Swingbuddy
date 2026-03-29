import { SignalBadge } from "@/components/signals/SignalBadge";

export function LatestSignalCell({
  signal,
}: {
  signal?: {
    signal_type?: string;
    strategy?: string;
  } | null;
}) {
  if (!signal) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div>
        <SignalBadge type={signal.signal_type || "hold"} />
      </div>
      <span className="text-xs text-slate-500">{signal.strategy || "-"}</span>
    </div>
  );
}
