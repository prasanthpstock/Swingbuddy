"use client";

import { useMemo, useState } from "react";
import { groupSignals, type Signal } from "@/lib/groupSignals";
import { getActionBadgeClass, getGroupRowClass } from "@/lib/signalStyles";

type Props = {
  signals: Signal[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getTimelineKey(signal: Signal, idx: number) {
  return signal.id ?? `${signal.symbol}-${signal.strategy}-${signal.signal_date}-${idx}`;
}

export default function GroupedSignalsList({ signals }: Props) {
  const groupedSignals = useMemo(() => groupSignals(signals), [signals]);
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});

  function toggleSymbol(symbol: string) {
    setExpandedSymbols((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  }

  if (groupedSignals.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No signals found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedSignals.map((group) => {
        const isExpanded = expandedSymbols[group.symbol] ?? true;

        const currentStrategySignals = group.signals.slice(0, 3);
        const historySignals = group.signals.slice(0, 8);

        return (
          <div
            key={group.symbol}
            className={`rounded-lg border border-slate-200 bg-white shadow-sm ${getGroupRowClass(group.strongestAction)}`}
          >
            <button
              type="button"
              onClick={() => toggleSymbol(group.symbol)}
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-slate-900">
                    {group.symbol}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getActionBadgeClass(group.strongestAction)}`}
                  >
                    {group.strongestAction}
                  </span>
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {group.signals.length} signal{group.signals.length > 1 ? "s" : ""} ·{" "}
                  Latest: {formatDate(group.latestSignalDate)}
                </div>
              </div>

              <div className="shrink-0 text-sm text-slate-500">
                {isExpanded ? "Hide" : "Show"}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-4">
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current strategy signals
                    </div>

                    <div className="space-y-2">
                      {currentStrategySignals.map((signal, idx) => (
                        <div
                          key={getTimelineKey(signal, idx)}
                          className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {signal.strategy}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(signal.signal_date)}
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getActionBadgeClass(signal.action)}`}
                          >
                            {signal.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Timeline
                    </div>

                    <div className="space-y-2">
                      {historySignals.map((signal, idx) => (
                        <div
                          key={`${getTimelineKey(signal, idx)}-timeline`}
                          className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-800">
                              {signal.strategy}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(signal.signal_date)}
                            </div>
                          </div>

                          <span
                            className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getActionBadgeClass(signal.action)}`}
                          >
                            {signal.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
