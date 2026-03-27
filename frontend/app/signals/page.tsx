"use client";

import { useEffect, useState } from "react";
import { SignalsSummary } from "@/components/signals/SignalsSummary";
import { SignalsTable } from "@/components/signals/SignalsTable";

export default function SignalsPage() {
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signals`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    const data = await res.json();
    setSignals(data);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Signals</h1>

      <SignalsSummary signals={signals} />

      <SignalsTable signals={signals} />
    </div>
  );
}
