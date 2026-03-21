import { getSupabaseClient } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function authHeaders() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      "Content-Type": "application/json"
    };
  }

  const { data } = await supabase.auth.getSession();

  return {
    Authorization: `Bearer ${data.session?.access_token || ""}`,
    "Content-Type": "application/json"
  };
}

export async function getPortfolioSummary() {
  return fetch(`${API_BASE_URL}/portfolio/summary`, {
    headers: await authHeaders(),
    cache: "no-store"
  }).then((r) => r.json());
}

export async function getSignals() {
  return fetch(`${API_BASE_URL}/signals`, {
    headers: await authHeaders(),
    cache: "no-store"
  }).then((r) => r.json());
}

export async function getAlerts() {
  return fetch(`${API_BASE_URL}/alerts`, {
    headers: await authHeaders(),
    cache: "no-store"
  }).then((r) => r.json());
}

export async function getLogs() {
  return fetch(`${API_BASE_URL}/logs`, {
    headers: await authHeaders(),
    cache: "no-store"
  }).then((r) => r.json());
}

export async function startZerodhaAuth() {
  return fetch(`${API_BASE_URL}/auth/broker/zerodha/start`, {
    headers: await authHeaders(),
    cache: "no-store"
  }).then((r) => r.json());
}
