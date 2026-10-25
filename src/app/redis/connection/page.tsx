"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Terminal,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RedisConnectionStatus } from "@/types/redis";

export default function RedisConnectionPage() {
  const [status, setStatus] = useState<RedisConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testedOnce, setTestedOnce] = useState(false);

  const runConnectionTest = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/redis/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data: RedisConnectionStatus = await res.json();
      setStatus(data);
    } catch {
      setStatus({
        isConnected: false,
        status: "DISCONNECTED",
        message: "Failed to communicate with Redis test API.",
        meta: {
          host: "unknown",
          port: 6379,
          dbIndex: 0,
          tls: false,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
      setTestedOnce(true);
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Redis Connection Test
            </h2>
            <Badge variant="redis">PING</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Uji responsivitas koneksi in-memory Redis menggunakan command TCP non-blocking PING.
          </p>
        </div>

        <Button
          onClick={runConnectionTest}
          isLoading={isLoading}
          variant="primary"
          className="bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/20"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          <span>Test Redis Connection</span>
        </Button>
      </div>

      {/* Main Status Hero Card */}
      <Card
        glow={status?.isConnected ? "emerald" : testedOnce ? "rose" : "none"}
        className={`border-2 transition-all ${status?.isConnected
          ? "border-emerald-500/40 bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950/20"
          : testedOnce
            ? "border-rose-500/40 bg-linear-to-br from-slate-900 via-slate-900 to-rose-950/20"
            : "border-slate-800"
          }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border ${status?.isConnected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : testedOnce
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
            >
              {status?.isConnected ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : testedOnce ? (
                <XCircle className="h-8 w-8" />
              ) : (
                <Zap className="h-8 w-8 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-xl font-bold text-white tracking-tight">
                  Status:
                </span>
                <Badge
                  variant={status?.isConnected ? "success" : testedOnce ? "danger" : "warning"}
                  pulse={status?.isConnected}
                  className="text-xs px-3 py-1 uppercase"
                >
                  {isLoading ? "TESTING..." : status?.status || "PENDING"}
                </Badge>
              </div>

              <p className="text-sm font-medium text-slate-300">
                {isLoading ? "Sending PING command to Redis socket..." : status?.message}
              </p>

              {status?.timestamp && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last tested: {new Date(status.timestamp).toLocaleTimeString()}</span>
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics Badge */}
          {status?.latencyMs !== undefined && (
            <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 gap-1">
              <span className="text-xs font-mono uppercase text-slate-400">Roundtrip Latency</span>
              <span
                className={`text-2xl font-bold font-mono ${status.latencyMs < 20
                  ? "text-emerald-400"
                  : status.latencyMs < 100
                    ? "text-amber-400"
                    : "text-rose-400"
                  }`}
              >
                {status.latencyMs} ms
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Connection Metadata & Execution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Safe Config Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Server className="h-5 w-5 text-rose-400" />
              <CardTitle>Safe Connection Metadata</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Password Redacted</span>
            </div>
          </CardHeader>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Host:</span>
              <span className="text-slate-200 font-semibold">{status?.meta.host || "—"}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Port:</span>
              <span className="text-slate-200">{status?.meta.port || "—"}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">Database / Index:</span>
              <span className="text-rose-400 font-semibold">db{status?.meta.dbIndex ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 font-sans">TLS Encrypted:</span>
              <span className={status?.meta.tls ? "text-emerald-400" : "text-slate-400"}>
                {status?.meta.tls ? "Enabled (rediss://)" : "Disabled (Plaintext TCP)"}
              </span>
            </div>
          </div>
        </Card>

        {/* Command & Execution Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Terminal className="h-5 w-5 text-indigo-400" />
              <CardTitle>Command Log</CardTitle>
            </div>
            <Badge variant="neutral">Server-side</Badge>
          </CardHeader>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-1.5 font-sans">Command Sent:</p>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-rose-400 border border-slate-800 flex items-center justify-between">
                <span>PING</span>
                <span className="text-[10px] text-slate-400">Response expected: PONG</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Node Client Driver:</span>
                <span className="font-mono text-slate-200">ioredis</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Socket Strategy:</span>
                <span className="font-mono text-slate-200">lazyConnect + limited retry</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Direct Browser Access:</span>
                <span className="text-emerald-400 font-medium">Blocked (Server Only)</span>
              </div>
            </div>

            {/* Error Guidance if Disconnected */}
            {!status?.isConnected && testedOnce && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-200">Langkah Penanganan:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-300/90 text-[11px]">
                    <li>Pastikan service Redis server berjalan di host <code className="bg-amber-950/60 px-1 py-0.2 rounded font-mono">{status?.meta.host}:{status?.meta.port}</code>.</li>
                    <li>Jika menggunakan Docker, pastikan container redis aktif.</li>
                    <li>Periksa variabel <code className="bg-amber-950/60 px-1 py-0.2 rounded font-mono">REDIS_URL</code> pada file <code className="bg-amber-950/60 px-1 py-0.2 rounded font-mono">.env</code>.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
