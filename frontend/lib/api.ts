import { getSupabaseClient } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      "Content-Type": "application/json",
    };
  }

  const { data } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  return headers;
}

export async function getPortfolioSummary() {
  return fetch(`${API_BASE_URL}/portfolio/summary`, {
    headers: await authHeaders(),
    cache: "no-store",
  }).then((r) => r.json());
}

export async function getSignals() {
  return fetch(`${API_BASE_URL}/signals`, {
    headers: await authHeaders(),
    cache: "no-store",
  }).then((r) => r.json());
}

export async function getAlerts() {
  return fetch(`${API_BASE_URL}/alerts`, {
    headers: await authHeaders(),
    cache: "no-store",
  }).then((r) => r.json());
}

export async function getLogs() {
  return fetch(`${API_BASE_URL}/logs`, {
    headers: await authHeaders(),
    cache: "no-store",
  }).then((r) => r.json());
}

export async function startZerodhaAuth() {
  return fetch(`${API_BASE_URL}/auth/broker/zerodha/start`, {
    headers: await authHeaders(),
    cache: "no-store",
  }).then((r) => r.json());
}
