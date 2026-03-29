import type { SignalAction } from "./groupSignals";

export function getActionBadgeClass(action: SignalAction): string {
  switch (action) {
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

export function getGroupRowClass(action: SignalAction): string {
  switch (action) {
    case "SELL":
      return "border-l-4 border-red-400";
    case "RISK":
      return "border-l-4 border-orange-400";
    case "BUY":
      return "border-l-4 border-green-400";
    case "HOLD":
    default:
      return "border-l-4 border-slate-300";
  }
}
