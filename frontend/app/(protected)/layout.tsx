"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = getSupabaseClient();

        if (!supabase) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          router.push("/login");
          return;
        }

        setReady(true);
      } catch (err) {
        console.error("Session check failed", err);
        router.push("/login");
      }
    }

    checkSession();
  }, [router]);

  if (!ready) {
    return <main className="p-8">Loading...</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}