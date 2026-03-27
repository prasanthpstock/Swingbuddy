"use client";

import { useEffect, useState } from "react";
import { SignalsSummary } from "@/components/signals/SignalsSummary";
import { SignalsTable } from "@/components/signals/SignalsTable";

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error("NEXT_PUBLIC_API_URL is missing");
        return;
      }

      const token = localStorage.getItem("access_token");

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
      console.log("Signals:", data);
      setSignals(data);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Signals</h1>

      <SignalsSummary signals={signals} />
      <SignalsTable signals={signals} />
    </div>
  );
}
