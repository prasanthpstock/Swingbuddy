import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function getPortfolioSummary() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/portfolio/summary`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch portfolio summary");
  }

  return res.json();
}

export async function syncPortfolio() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/portfolio/sync`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to sync portfolio: ${text}`);
  }

  return res.json();
}
