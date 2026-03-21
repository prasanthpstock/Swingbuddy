"use client";

import { getSupabaseClient } from "@/lib/supabase";

export default function SettingsPage() {
  async function logout() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="text-lg font-semibold">Settings</h3>
        <p className="mt-2 subtle">
          Single-user v1 settings and account actions.
        </p>
      </div>

      <button
        onClick={logout}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2"
      >
        Sign out
      </button>
    </div>
  );
}
