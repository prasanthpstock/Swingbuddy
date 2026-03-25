"use client";

import { useEffect, useState } from "react";
import { startZerodhaAuth } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function BrokersPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  async function loadConnections() {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setConnections([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        console.error("No active session", error);
        setConnections([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/broker-connections`, {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to load broker connections: ${text}`);
      }

      const result = await response.json();
      setConnections(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Failed to load broker connections", err);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
  }, []);

  async function connectZerodha() {
    try {
      setConnecting(true);
      const result = await startZerodhaAuth();

      if (result?.login_url) {
        window.location.href = result.login_url;
        return;
      }

      throw new Error("Missing Zerodha login URL");
    } catch (err: any) {
      console.error("Failed to start Zerodha auth", err);
      alert(err?.message || "Failed to start Zerodha connection");
    } finally {
      setConnecting(false);
    }
  }

  const zerodhaConnected = connections.some(
    (item) => item.broker_name === "zerodha" && item.status === "active"
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="text-lg font-semibold">Broker Connections</h3>
        <p className="mt-2 subtle">
          Connect Zerodha first. Upstox and ICICI come next.
        </p>
      </div>

      <div className="card flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Zerodha</h4>
          <p className="subtle">Broker auth and holdings sync</p>
          <div className="mt-2">
            {loading ? (
              <span className="badge-amber">Checking...</span>
            ) : zerodhaConnected ? (
              <span className="badge-green">Connected</span>
            ) : (
              <span className="badge-red">Not connected</span>
            )}
          </div>
        </div>

        <button
          onClick={connectZerodha}
          disabled={connecting}
          className={`rounded-xl px-4 py-2 text-white ${
            connecting
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          {connecting
            ? "Opening Zerodha..."
            : zerodhaConnected
            ? "Reconnect Zerodha"
            : "Connect Zerodha"}
        </button>
      </div>
    </div>
  );
}
