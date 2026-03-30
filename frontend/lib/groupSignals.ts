export type SignalAction = "BUY" | "SELL" | "RISK" | "HOLD";

export type Signal = {
  id?: string;
  symbol: string;
  strategy: string;
  action: SignalAction;
  signal_date: string;
};

export type GroupedSignal = {
  symbol: string;
  strongestAction: SignalAction;
  latestSignalDate: string;
  signals: Signal[];
  hasConflict: boolean;
  distinctActions: SignalAction[];
};

const actionPriority: Record<SignalAction, number> = {
  SELL: 4,
  RISK: 3,
  BUY: 2,
  HOLD: 1,
};

export function groupSignals(signals: Signal[]): GroupedSignal[] {
  const grouped = new Map<string, Signal[]>();

  for (const signal of signals) {
    const existing = grouped.get(signal.symbol) ?? [];
    existing.push(signal);
    grouped.set(signal.symbol, existing);
  }

  return Array.from(grouped.entries())
    .map(([symbol, symbolSignals]) => {
      const strongestAction = symbolSignals.reduce<SignalAction>((strongest, current) => {
        return actionPriority[current.action] > actionPriority[strongest]
          ? current.action
          : strongest;
      }, symbolSignals[0].action);

      const latestSignalDate = symbolSignals.reduce((latest, current) => {
        return new Date(current.signal_date) > new Date(latest)
          ? current.signal_date
          : latest;
      }, symbolSignals[0].signal_date);

      const sortedSignals = [...symbolSignals].sort(
        (a, b) =>
          new Date(b.signal_date).getTime() - new Date(a.signal_date).getTime()
      );

      const distinctActions = Array.from(
        new Set(sortedSignals.map((signal) => signal.action))
      ) as SignalAction[];

      const nonHoldActions = distinctActions.filter((action) => action !== "HOLD");

      const hasConflict = nonHoldActions.length > 1;

      return {
        symbol,
        strongestAction,
        latestSignalDate,
        signals: sortedSignals,
        hasConflict,
        distinctActions,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latestSignalDate).getTime() -
        new Date(a.latestSignalDate).getTime()
    );
}
