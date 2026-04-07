"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  LayoutDashboard,
  ListChecks,
  Radar,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Recommendations", href: "/recommendations", icon: Radar },
  { label: "Watchlist", href: "/watchlist", icon: ListChecks },
  { label: "Signals", href: "/signals", icon: BarChart3 },
  { label: "Portfolio", href: "/portfolio", icon: Briefcase },
  { label: "Alerts", href: "/alerts", icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Swingbuddy
        </p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">
          Trading Intelligence
        </h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}