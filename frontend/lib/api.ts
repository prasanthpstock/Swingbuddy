import { getSupabaseClient } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

async function getAuthHeaders() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No active session found");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function apiGet(path: string) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${text}`);
  }

  return res.json();
}

async function apiPost(path: string, body?: unknown) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${text}`);
  }

  return res.json();
}

export async function getPortfolioSummary() {
  return apiGet("/portfolio/summary");
}

export async function syncPortfolio() {
  return apiPost("/portfolio/sync");
}

export async function getAlerts() {
  return apiGet("/alerts");
}

export async function getSignals() {
  return apiGet("/signals");
}

export async function getLogs() {
  return apiGet("/logs");
}

export async function getPortfolioHoldings() {
  return apiGet("/portfolio/holdings");
}

export async function startZerodhaAuth() {
  return apiGet("/auth/broker/zerodha/start");
}
