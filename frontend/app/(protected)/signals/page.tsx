"use client";

import { useEffect, useState } from "react";
import { SignalsSummary } from "@/components/signals/SignalsSummary";
import { SignalsTable } from "@/components/signals/SignalsTable";

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchSignals();
  }, []);

  const getToken = () => {
    return localStorage.getItem("access_token");
  };

  const fetchSignals = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL is missing");
        return;
      }

      const token = getToken();

      if (!token) {
        console.error("Access token missing");
        return;
      }

      const res = await fetch(`${apiUrl}/signals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Signals API failed:", res.status, text);
        return;
      }

      const data = await res.json();
      setSignals(data);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  const generateSignals = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL is missing");
        return;
      }

      const token = getToken();

      if (!token) {
        console.error("Access token missing");
        return;
      }

      setIsGenerating(true);

      const res = await fetch(`${apiUrl}/signals/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Generate signals failed:", res.status, text);
        return;
      }

      await fetchSignals();
    } catch (err) {
      console.error("Generate signals error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Signals</h1>

        <button
          onClick={generateSignals}
          disabled={isGenerating}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate Signals"}
        </button>
      </div>

      <SignalsSummary signals={signals} />
      <SignalsTable signals={signals} />
    </div>
  );
}
