import { getSupabaseClient } from "@/lib/supabase";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  requireAuth?: boolean;
};

export type Recommendation = {
  id?: string;
  symbol: string;
  trade_date?: string;
  signal_type?: string;
  score?: number;
  rank_no?: number;
  entry_price?: number;
  stop_loss?: number;
  target_price?: number;
  position_qty?: number;
  rationale?: string;
  factor_breakdown?: Record<string, unknown>;
  strategy_code?: string;
};

export type WatchlistItem = {
  symbol: string;
  trade_date?: string;
  close?: number;
  breakout_20_high_prev?: number;
  distance_to_breakout_pct?: number;
  sma_50?: number;
  momentum_20d?: number;
  volume_avg_20?: number;
  latest_volume?: number;
  volume_ratio?: number;
  watchlist_reason?: string;
};

export type IndicatorSnapshot = {
  symbol: string;
  trade_date?: string;
  sma_20?: number;
  sma_50?: number;
  ema_20?: number;
  rsi_14?: number;
  atr_14?: number;
  volume_avg_20?: number;
  breakout_20_high_prev?: number;
  momentum_20d?: number;
};

export type StockBar = {
  trade_date: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

type ListResponse<T> = T[] | { items?: T[]; count?: number; generated_at?: string };

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

async function getBaseHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const { method = "GET", body, requireAuth = true } = options;

  const headers = requireAuth ? await getAuthHeaders() : await getBaseHeaders();

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed: ${text}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

function normalizeList<T>(data: ListResponse<T>): T[] {
  return Array.isArray(data) ? data : data.items ?? [];
}

async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  requireAuth = true
) {
  return apiRequest<T>(path, { method: "GET", requireAuth }, params);
}

async function apiPost<T>(
  path: string,
  body?: unknown,
  requireAuth = true
) {
  return apiRequest<T>(path, { method: "POST", body, requireAuth });
}

/* ------------------------------ Existing V1 ------------------------------ */

export async function getPortfolioSummary() {
  return apiGet("/portfolio/summary");
}

export async function getPortfolioHoldings() {
  return apiGet("/portfolio/holdings");
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

export async function generateSignals() {
  return apiPost("/signals/generate");
}

export async function getLogs() {
  return apiGet("/logs");
}

export async function startZerodhaAuth() {
  return apiGet("/auth/broker/zerodha/start");
}

/* ------------------------------ V2 Endpoints ----------------------------- */

export async function getRecommendations(params?: {
  symbol?: string;
  limit?: number;
}) {
  return apiGet<ListResponse<Recommendation>>(
    "/api/v2/recommendations",
    params
  );
}

export async function getRecommendationsList(params?: {
  symbol?: string;
  limit?: number;
}): Promise<Recommendation[]> {
  const data = await getRecommendations(params);
  return normalizeList(data);
}

export async function generateRecommendations(body?: Record<string, unknown>) {
  return apiPost("/api/v2/recommendations/generate", body ?? {});
}

export async function getWatchlist(params?: {
  symbol?: string;
  limit?: number;
}) {
  return apiGet<ListResponse<WatchlistItem>>(
    "/api/v2/watchlist",
    params
  );
}

export async function getWatchlistList(params?: {
  symbol?: string;
  limit?: number;
}): Promise<WatchlistItem[]> {
  const data = await getWatchlist(params);
  return normalizeList(data);
}

export async function getIndicators(params?: {
  symbol?: string;
  limit?: number;
}) {
  return apiGet<ListResponse<IndicatorSnapshot>>(
    "/api/v2/indicators",
    params
  );
}

export async function getIndicatorsList(params?: {
  symbol?: string;
  limit?: number;
}): Promise<IndicatorSnapshot[]> {
  const data = await getIndicators(params);
  return normalizeList(data);
}

export async function syncMarketData(body?: Record<string, unknown>) {
  return apiPost("/api/v2/market-data/sync", body ?? {});
}

export async function getStockBars(symbol: string, limit = 60) {
  return apiGet<StockBar[]>(
    `/api/v2/stocks/${encodeURIComponent(symbol)}/bars`,
    { limit }
  );
}

export async function getTopPicks() {
  const res = await fetch(`${API_BASE_URL}/api/v2/top-picks`);
  return res.json();
}