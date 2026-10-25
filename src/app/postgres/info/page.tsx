"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Server,
  Activity,
  HardDrive,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Cpu,
  Layers,
  Users,
  Globe,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PostgresInfo } from "@/types/postgres";

export default function PostgresInfoPage() {
  const [info, setInfo] = useState<PostgresInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/postgres/info");
      const result = await res.json();
      if (result.success && result.data) {
        setInfo(result.data);
      } else {
        setInfo(
          result.data || {
            version: "Unavailable",
            databaseName: "unknown",
            currentUser: "unknown",
            status: "DISCONNECTED",
            host: "unknown",
            port: 5432,
          }
        );
      }
    } catch {
      setInfo({
        version: "Unavailable",
        databaseName: "unknown",
        currentUser: "unknown",
        status: "DISCONNECTED",
        host: "unknown",
        port: 5432,
      });
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchInfo();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchInfo]);

  const isConnected = info?.status === "CONNECTED";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              PostgreSQL Telemetry & Specifications
            </h2>
            <Badge variant="postgres">SYSTEM INFO</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Informasi server, spesifikasi versi, statistik koneksi aktif, dan alokasi database storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-2 ${autoRefresh
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
              }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                }`}
            />
            <span>Auto Refresh (10s)</span>
          </button>

          <Button
            onClick={fetchInfo}
            isLoading={isLoading}
            variant="primary"
            className="bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-600/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span>Refresh Info</span>
          </Button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <Card
        glow={isConnected ? "emerald" : "rose"}
        className={`border-2 transition-all ${isConnected
            ? "border-emerald-500/30 bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950/20"
            : "border-rose-500/30 bg-linear-to-br from-slate-900 via-slate-900 to-rose-950/20"
          }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border ${isConnected
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
            >
              <Database className="h-8 w-8" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-xl font-bold text-white tracking-tight">
                  PostgreSQL Status:
                </span>
                <Badge
                  variant={isConnected ? "success" : "danger"}
                  pulse={isConnected}
                  className="text-xs px-3 py-1 uppercase"
                >
                  {isLoading ? "REFRESHING..." : info?.status || "CHECKING"}
                </Badge>
              </div>

              <p className="text-sm text-slate-300">
                {isConnected
                  ? `Terhubung ke instance ${info?.databaseName} pada host ${info?.host}:${info?.port}`
                  : "Tidak dapat mengambil data server PostgreSQL. Pastikan database aktif."}
              </p>

              {lastUpdated && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Terakhir diperbarui: {lastUpdated}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 text-xs text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Credentials Redacted & Read-only Introspection</span>
          </div>
        </div>
      </Card>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Connections */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Clients
            </span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {info?.activeConnections !== undefined ? info.activeConnections : "—"}
            </span>
            {info?.maxConnections && (
              <span className="text-xs text-slate-400 font-mono">
                / {info.maxConnections} max
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">pg_stat_activity count</p>
        </Card>

        {/* Database Size */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Database Size
            </span>
            <HardDrive className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {info?.databaseSize || "—"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Allocated disk space</p>
        </Card>

        {/* Database Encoding */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Encoding
            </span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {info?.encoding || "—"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Timezone: {info?.timezone || "UTC"}
          </p>
        </Card>

        {/* Server Uptime */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Server Uptime
            </span>
            <Activity className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-base font-bold font-mono text-indigo-300 truncate" title={info?.uptime || ""}>
            {info?.uptime ? info.uptime.split(".")[0] : "—"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Since pg_postmaster start</p>
        </Card>
      </div>

      {/* Detailed Specifications Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PostgreSQL Version & Environment Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Cpu className="h-5 w-5 text-sky-400" />
              <CardTitle>PostgreSQL Engine Details</CardTitle>
            </div>
            <Badge variant="neutral">Read-only</Badge>
          </CardHeader>

          <div className="space-y-4">
            <div>
              <span className="text-xs text-slate-400 block mb-1 font-medium">
                Full Engine Version String:
              </span>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 leading-relaxed wrap-break-words">
                {info?.version || "Unknown"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Database Name</span>
                <span className="font-mono font-semibold text-sky-400">
                  {info?.databaseName || "—"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Current User</span>
                <span className="font-mono font-semibold text-slate-200">
                  {info?.currentUser || "—"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Server Host</span>
                <span className="font-mono text-slate-200">{info?.host || "—"}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Listening Port</span>
                <span className="font-mono text-slate-200">{info?.port || 5432}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Server Time & Operational Telemetry */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-indigo-400" />
              <CardTitle>Runtime & Clock Synchronization</CardTitle>
            </div>
            <Badge variant="postgres">Telemetry</Badge>
          </CardHeader>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Server Timestamp:</span>
              <span className="text-slate-200">{info?.serverTime || "—"}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Active Timezone:</span>
              <span className="text-sky-300 font-semibold">{info?.timezone || "UTC"}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Max Connections Limit:</span>
              <span className="text-slate-200">{info?.maxConnections || "Default"}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Introspection Mode:</span>
              <span className="text-emerald-400">information_schema & pg_catalog</span>
            </div>

            {!isConnected && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 mt-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  PostgreSQL sedang tidak dapat dijangkau. Periksa apakah container/service PostgreSQL sedang berjalan dan koneksi jaringan berfungsi.
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
