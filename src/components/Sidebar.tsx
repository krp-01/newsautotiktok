"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Rss,
  FileText,
  Video,
  Share2,
  Cog,
  ListTodo,
  LogOut,
  Newspaper,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/sources", label: "Sources", icon: Rss },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/tiktok", label: "TikTok Accounts", icon: Share2 },
  { href: "/admin/jobs", label: "Jobs", icon: ListTodo },
  { href: "/admin/settings", label: "Settings", icon: Cog },
];

export function Sidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600">
          <Newspaper className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-100">NewsAutoTikTok</h1>
          <p className="text-xs text-zinc-500">Press Automation</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
