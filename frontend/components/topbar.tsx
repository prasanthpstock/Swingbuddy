"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function Topbar() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data } = await supabase.auth.getSession();
        setEmail(data.session?.user?.email || "");
      } catch (err) {
        console.error("Failed to load session user", err);
      }
    }

    loadUser();
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-sm text-slate-500">Welcome back</p>
        <h2 className="text-xl font-semibold">Trading dashboard</h2>
      </div>
      <div className="text-sm text-slate-600">{email}</div>
    </header>
  );
}
