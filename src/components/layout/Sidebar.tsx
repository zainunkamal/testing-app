"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Database,
  Radio,
  Table2,
  Info,
  Server,
  KeyRound,
  Menu,
  X,
  Layers,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  badge?: string;
  badgeColor?: "postgres" | "redis";
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "PostgreSQL",
    badge: "SQL",
    badgeColor: "postgres",
    items: [
      { title: "Connection", href: "/postgres/connection", icon: Radio },
      { title: "Tables", href: "/postgres/tables", icon: Table2 },
      { title: "Information", href: "/postgres/info", icon: Info },
    ],
  },
  {
    title: "Redis",
    badge: "KV",
    badgeColor: "redis",
    items: [
      { title: "Connection", href: "/redis/connection", icon: Radio },
      { title: "Keys", href: "/redis/keys", icon: KeyRound },
      { title: "Information", href: "/redis/info", icon: Info },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsOpenMobile(!isOpenMobile)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        aria-label="Toggle navigation"
      >
        {isOpenMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl flex flex-col transition-transform duration-200 ease-in-out",
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* App Branding */}
        <div className="p-5 border-b border-slate-800/80">
          <Link
            href="/"
            onClick={() => setIsOpenMobile(false)}
            className="flex items-center gap-3 group"
          >
            <div className="h-10 w-10 rounded-xl bg-linear-to-tr from-sky-500 via-indigo-500 to-rose-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="h-full w-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <Layers className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-tight">DataBridge</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">v1.0</span>
              </div>
              <p className="text-xs text-slate-400">Postgres & Redis Lab</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main: Dashboard */}
          <div>
            <Link
              href="/"
              onClick={() => setIsOpenMobile(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                pathname === "/"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Grouped Sections */}
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>{section.title}</span>
                {section.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.2 rounded border",
                      section.badgeColor === "postgres"
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}
                  >
                    {section.badge}
                  </span>
                )}
              </div>

              <div className="pt-1 space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpenMobile(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-slate-800/90 text-white border border-slate-700/60 shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive
                            ? section.badgeColor === "postgres"
                              ? "text-sky-400"
                              : "text-rose-400"
                            : "text-slate-400"
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <Server className="h-4 w-4 text-emerald-400 animate-pulse" />
            <div>
              <p className="text-slate-300 font-medium">Integration Tool</p>
              <p className="text-[11px] text-slate-400">Server-side isolation</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
