"use client";

import { useEffect, useState } from "react";
import { getLogs } from "@/lib/api";

type LogItem = {
  id: string | number;
  job_name?: string;
  status?: string;
  summary?: string;
  error_text?: string;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await getLogs();
        setLogs(Array.isArray(data) ? (data as LogItem[]) : []);
      } catch (error) {
        console.error("Failed to load logs", error);
        setLogs([]);
      }
    }

    loadLogs();
  }, []);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold">Job Logs</h3>

      <div className="mt-4 space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{log.job_name || "-"}</p>
              <span
                className={
                  log.status === "success"
                    ? "badge-green"
                    : log.status === "failed"
                    ? "badge-red"
                    : "badge-amber"
                }
              >
                {log.status || "-"}
              </span>
            </div>

            <p className="mt-2 subtle">
              {log.summary || log.error_text || "No details yet"}
            </p>
          </div>
        ))}

        {logs.length === 0 ? <p className="subtle">No job logs yet.</p> : null}
      </div>
    </div>
  );
}