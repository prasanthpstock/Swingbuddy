"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export function Topbar() { const [email, setEmail] = useState(""); useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || "")); }, []); return (<header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4"><div><p className="text-sm text-slate-500">Welcome back</p><h2 className="text-xl font-semibold">Trading dashboard</h2></div><div className="text-sm text-slate-600">{email}</div></header>); }
