"use client";

import { useEffect, useMemo, useState } from "react";
import { LatestSignalCell } from "@/components/signals/LatestSignalCell";
import { SignalTimeline } from "@/components/signals/SignalTimeline";

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const getToken = () => {
    try {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("auth-token")
      );

      if (!key) return null;

      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      return (
        parsed?.access_token ??
        parsed?.currentSession?.access_token ??
        parsed?.session?.access_token ??
        null
      );
    } catch {
      return null;
    }
  };

  const toggleSymbolTimeline = (symbol: string) => {
    setExpandedSymbols((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  const fetchPortfolioData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = getToken();

      if (!apiUrl || !token) return;

      const [holdingsRes, signalsRes] = await Promise.all([
        fetch(`${apiUrl}/portfolio/holdings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/signals`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!holdingsRes.ok) {
        console.error("Failed to fetch holdings");
        return;
      }

      if (!signalsRes.ok) {
        console.error("Failed to fetch signals");
        return;
      }

      const holdingsData = await holdingsRes.json();
      const signalsData = await signalsRes.json();

      setHoldings(holdingsData);
      setSignals(signalsData);
    } catch (err) {
      console.error("Portfolio fetch error:", err);
    }
  };

  const syncPortfolio = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const token = getToken();

      if (!apiUrl || !token) return;

      setIsSyncing(true);

      const res = await fetch(`${apiUrl}/portfolio/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Portfolio sync failed:", res.status, text);
        return;
      }

      await fetchPortfolioData();
    } catch (err) {
      console.error("Portfolio sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

 
