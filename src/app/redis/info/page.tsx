"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Server,
  Activity,
  HardDrive,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Zap,
  Users,
  Search,
  KeyRound,
  Terminal,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RedisInfo } from "@/types/redis";

export default function RedisInfoPage() {
  const [info, setInfo] = useState<RedisInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [statSearch, setStatSearch] = useState<string>("");

  const fetchInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/redis/info");
      const result = await res.json();
      if (result.success && result.data) {
        setInfo(result.data);
      } else {
        setInfo(
          result.data || {
            redisVersion: "Unavailable",
            connectedClients: 0,
            usedMemoryHuman: "Unavailable",
            uptimeInDays: 0,
            totalKeys: 0,
            status: "DISCONNECTED",
            host: "unknown",
            port: 6379,
            dbIndex: 0,
          }
        );
      }
    } catch {
      setInfo({
        redisVersion: "Unavailable",
        connectedClients: 0,
        usedMemoryHuman: "Unavailable",
        uptimeInDays: 0,
        totalKeys: 0,
        status: "DISCONNECTED",
        host: "unknown",
        port: 6379,
        dbIndex: 0,
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

  // Filter raw stats by search term
  const filteredRawStats = useMemo(() => {
    if (!info?.rawStats) return [];
    const entries = Object.entries(info.rawStats);
    if (!statSearch.trim()) return entries;
    const lower = statSearch.toLowerCase();
    return entries.filter(
      ([k, v]) => k.toLowerCase().includes(lower) || String(v).toLowerCase().includes(lower)
    );
  }, [info?.rawStats, statSearch]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Redis Telemetry & Server Diagnostics
            </h2>
            <Badge variant="redis">REDIS INFO</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Statistik memory heap, connection clients, instantaneous throughput, dan keyspace breakdown.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-2 ${
              autoRefresh
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
              }`}
            />
            <span>Auto Refresh (10s)</span>
          </button>

          <Button
            onClick={fetchInfo}
            isLoading={isLoading}
            variant="primary"
            className="bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span>Refresh Diagnostics</span>
          </Button>
        </div>
      </div>

      {/* Hero Status Card */}
      <Card
        glow={isConnected ? "emerald" : "rose"}
        className={`border-2 transition-all ${
          isConnected
            ? "border-emerald-500/30 bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950/20"
            : "border-rose-500/30 bg-linear-to-br from-slate-900 via-slate-900 to-rose-950/20"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border ${
                isConnected
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <Server className="h-8 w-8" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-xl font-bold text-white tracking-tight">
                  Redis Instance:
                </span>
                <Badge
                  variant={isConnected ? "success" : "danger"}
                  pulse={isConnected}
                  className="text-xs px-3 py-1 uppercase"
                >
                  {isLoading ? "PROBING..." : info?.status || "CHECKING"}
                </Badge>
                {info?.redisVersion && (
                  <Badge variant="redis">v{info.redisVersion}</Badge>
                )}
              </div>

              <p className="text-sm text-slate-300">
                {isConnected
                  ? `Terhubung ke Redis ${info?.redisMode || "standalone"} pada ${info?.host}:${info?.port} (db: ${info?.dbIndex})`
                  : "Tidak dapat menghubungi server Redis. Pastikan instance Redis aktif."}
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
            <span>Non-blocking Telemetry & Password Redacted</span>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connected Clients */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Connected Clients
            </span>
            <Users className="h-4 w-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {info?.connectedClients ?? "—"}
            </span>
            {info?.blockedClients !== undefined && (
              <span className="text-xs text-slate-400 font-mono">
                ({info.blockedClients} blocked)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active client sockets</p>
        </Card>

        {/* Memory Allocation */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Memory Usage
            </span>
            <HardDrive className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {info?.usedMemoryHuman || "—"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Peak: {info?.usedMemoryPeakHuman || "—"}
          </p>
        </Card>

        {/* Total DB Keys */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Keys (db{info?.dbIndex ?? 0})
            </span>
            <KeyRound className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {info?.totalKeys !== undefined ? info.totalKeys.toLocaleString() : "—"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">DBSIZE in active database</p>
        </Card>

        {/* Operations Throughput */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Instantaneous Ops
            </span>
            <Zap className="h-4 w-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-300">
              {info?.instantaneousOpsPerSec ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">ops/sec</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total cmds: {info?.totalCommandsProcessed?.toLocaleString() || "—"}
          </p>
        </Card>
      </div>

      {/* Keyspace Breakdown & Server Environment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keyspace Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-5 w-5 text-rose-400" />
              <CardTitle>Keyspace Distribution</CardTitle>
            </div>
            <Badge variant="redis">Database Index</Badge>
          </CardHeader>

          <div className="space-y-3">
            {info?.keyspace && Object.keys(info.keyspace).length > 0 ? (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                {Object.entries(info.keyspace).map(([db, stats]) => (
                  <div
                    key={db}
                    className="p-3 bg-slate-950/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                        {db}
                      </span>
                      {db === `db${info.dbIndex}` && (
                        <Badge variant="success">CURRENT</Badge>
                      )}
                    </div>
                    <span className="font-mono text-slate-300">{stats}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-400">
                {isConnected ? "Tidak ada keys pada keyspace saat ini." : "Keyspace unavailable."}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Server Uptime</span>
                <span className="font-mono font-semibold text-slate-200">
                  {info?.uptimeInDays} days ({info?.uptimeInSeconds?.toLocaleString()}s)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Connections Received</span>
                <span className="font-mono font-semibold text-slate-200">
                  {info?.totalConnectionsReceived?.toLocaleString() || "—"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Operating Environment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-indigo-400" />
              <CardTitle>Host & Engine Specifications</CardTitle>
            </div>
            <Badge variant="neutral">Specs</Badge>
          </CardHeader>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Redis Architecture:</span>
              <span className="text-rose-300 font-semibold">{info?.redisMode || "Standalone"}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">OS / Kernel:</span>
              <span className="text-slate-200">{info?.os || "—"}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Host Address:</span>
              <span className="text-slate-200">{info?.host || "—"}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Port & DB Index:</span>
              <span className="text-slate-200">{info?.port} (db: {info?.dbIndex})</span>
            </div>

            {!isConnected && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 mt-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Redis sedang tidak dapat dihubungi. Periksa service Redis pada host {info?.host}:{info?.port}.
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Raw Statistics Explorer */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-emerald-400" />
            <CardTitle>Raw Redis Telemetry Explorer</CardTitle>
          </div>
          <span className="text-xs text-slate-400">
            {filteredRawStats.length} metrics
          </span>
        </CardHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={statSearch}
              onChange={(e) => setStatSearch(e.target.value)}
              placeholder="Search telemetry keys (e.g., mem, client, cpu, sync)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/80 bg-slate-950 font-mono text-xs">
            {filteredRawStats.length > 0 ? (
              filteredRawStats.map(([key, val]) => (
                <div
                  key={key}
                  className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-900/50 transition-colors"
                >
                  <span className="text-slate-400">{key}</span>
                  <span className="text-slate-200 font-medium">{val}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                Tidak ada metrik yang cocok dengan kata kunci &quot;{statSearch}&quot;.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
