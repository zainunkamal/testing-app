"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Database, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";


export function Header() {
  const pathname = usePathname();
  const [pgStatus, setPgStatus] = useState<"CONNECTED" | "DISCONNECTED" | "CHECKING">("CHECKING");
  const [redisStatus, setRedisStatus] = useState<"CONNECTED" | "DISCONNECTED" | "CHECKING">("CHECKING");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    setIsRefreshing(true);
    try {
      const [pgRes, redisRes] = await Promise.allSettled([
        fetch("/api/postgres/test").then((r) => r.json()),
        fetch("/api/redis/test").then((r) => r.json()),
      ]);

      if (pgRes.status === "fulfilled" && pgRes.value?.isConnected) {
        setPgStatus("CONNECTED");
      } else {
        setPgStatus("DISCONNECTED");
      }

      if (redisRes.status === "fulfilled" && redisRes.value?.isConnected) {
        setRedisStatus("CONNECTED");
      } else {
        setRedisStatus("DISCONNECTED");
      }
    } catch {
      setPgStatus("DISCONNECTED");
      setRedisStatus("DISCONNECTED");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Poll every 45s for quick ambient header indicator
    const interval = setInterval(checkStatus, 45000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/postgres/connection")) return "PostgreSQL Connection";
    if (pathname.startsWith("/postgres/tables")) return "PostgreSQL Tables & CRUD";
    if (pathname.startsWith("/postgres/info")) return "PostgreSQL Server Info";
    if (pathname.startsWith("/redis/connection")) return "Redis Connection";
    if (pathname.startsWith("/redis/keys")) return "Redis Key Explorer";
    if (pathname.startsWith("/redis/info")) return "Redis Server Info";
    return "Data Probe";
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 ml-10 lg:ml-0">
        <h1 className="text-base font-semibold text-slate-100">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* PostgreSQL ambient badge */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl px-2.5 py-1">
          <Database className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-xs font-mono text-slate-300">PG:</span>
          <Badge
            variant={pgStatus === "CONNECTED" ? "success" : pgStatus === "DISCONNECTED" ? "danger" : "warning"}
            pulse={pgStatus === "CONNECTED"}
          >
            {pgStatus}
          </Badge>
        </div>

        {/* Redis ambient badge */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl px-2.5 py-1">
          <Zap className="h-3.5 w-3.5 text-rose-400" />
          <span className="text-xs font-mono text-slate-300">Redis:</span>
          <Badge
            variant={redisStatus === "CONNECTED" ? "success" : redisStatus === "DISCONNECTED" ? "danger" : "warning"}
            pulse={redisStatus === "CONNECTED"}
          >
            {redisStatus}
          </Badge>
        </div>

        <button
          onClick={checkStatus}
          disabled={isRefreshing}
          title="Quick refresh connections"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-indigo-400")} />
        </button>
      </div>
    </header>
  );
}
