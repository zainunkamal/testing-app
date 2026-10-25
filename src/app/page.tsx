"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Database,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Table2,
  KeyRound,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PostgresConnectionStatus } from "@/types/postgres";
import { RedisConnectionStatus } from "@/types/redis";

export default function DashboardPage() {
  const [pgStatus, setPgStatus] = useState<PostgresConnectionStatus | null>(null);
  const [redisStatus, setRedisStatus] = useState<RedisConnectionStatus | null>(null);
  const [isPgTesting, setIsPgTesting] = useState(false);
  const [isRedisTesting, setIsRedisTesting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Test PostgreSQL connection
  const testPostgres = async () => {
    setIsPgTesting(true);
    try {
      const res = await fetch("/api/postgres/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data: PostgresConnectionStatus = await res.json();
      setPgStatus(data);
    } catch {
      setPgStatus({
        isConnected: false,
        status: "DISCONNECTED",
        message: "Failed to communicate with PostgreSQL test API.",
        meta: {
          host: "unknown",
          port: 5432,
          database: "unknown",
          user: "unknown",
          ssl: false,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsPgTesting(false);
    }
  };

  // Test Redis connection
  const testRedis = async () => {
    setIsRedisTesting(true);
    try {
      const res = await fetch("/api/redis/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data: RedisConnectionStatus = await res.json();
      setRedisStatus(data);
    } catch {
      setRedisStatus({
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
      setIsRedisTesting(false);
    }
  };

  // Test both in parallel
  const testAll = async () => {
    await Promise.all([testPostgres(), testRedis()]);
  };

  useEffect(() => {
    testAll().finally(() => setInitialLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Senior Integration & Diagnostic Tool</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              PostgreSQL & Redis Dashboard
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Monitoring real-time konektivitas database relasional PostgreSQL dan in-memory store Redis. Semua kredensial diproses murni di sisi server.
            </p>
          </div>

          <Button
            onClick={testAll}
            isLoading={isPgTesting || isRedisTesting}
            variant="secondary"
            className="self-start md:self-center shrink-0 border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span>Refresh All Connections</span>
          </Button>
        </div>

        {/* Ambient glow */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 right-32 h-64 w-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Main Connection Status Cards (Section 1 of Prompt) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PostgreSQL Card */}
        <Card
          glow={pgStatus?.isConnected ? "emerald" : "rose"}
          className={`border-2 transition-all ${
            pgStatus?.isConnected
              ? "border-emerald-500/40 bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950/20"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          <div className="space-y-6">
            {/* Top Bar inside Card */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`p-3 rounded-2xl border ${
                    pgStatus?.isConnected
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">PostgreSQL</h3>
                    <Badge variant="postgres">SQL</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Query: SELECT 1;
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <Badge
                  variant={
                    isPgTesting
                      ? "warning"
                      : pgStatus?.isConnected
                      ? "success"
                      : "danger"
                  }
                  pulse={pgStatus?.isConnected}
                  className="text-xs px-3 py-1 font-mono uppercase"
                >
                  {isPgTesting
                    ? "CHECKING..."
                    : pgStatus?.status || "DISCONNECTED"}
                </Badge>
                {pgStatus?.latencyMs !== undefined && (
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    Latency: <span className="text-slate-200 font-semibold">{pgStatus.latencyMs} ms</span>
                  </p>
                )}
              </div>
            </div>

            {/* Status Message */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-start gap-2.5">
                {pgStatus?.isConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {isPgTesting
                    ? "Menguji koneksi PostgreSQL..."
                    : pgStatus?.message || "Belum ada pengujian."}
                </p>
              </div>
            </div>

            {/* Metadata Information Grid (Host, Database, Port) */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                <span className="text-slate-400 font-sans block text-[11px] mb-0.5">
                  PostgreSQL Host
                </span>
                <span className="text-slate-200 font-semibold truncate block">
                  {pgStatus?.meta.host || "localhost"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                <span className="text-slate-400 font-sans block text-[11px] mb-0.5">
                  PostgreSQL Database
                </span>
                <span className="text-sky-400 font-semibold truncate block">
                  {pgStatus?.meta.database || "testdb"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                <span className="text-slate-400 font-sans block text-[11px] mb-0.5">
                  Port & User
                </span>
                <span className="text-slate-300 truncate block">
                  {pgStatus?.meta.port || 5432} ({pgStatus?.meta.user || "postgres"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                <span className="text-slate-400 font-sans block text-[11px] mb-0.5">
                  Security
                </span>
                <span className="text-emerald-400 truncate block font-sans">
                  Password Redacted
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <Button
                onClick={testPostgres}
                isLoading={isPgTesting}
                variant="primary"
                size="sm"
                className="bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-600/20"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                <span>Test PostgreSQL Connection</span>
              </Button>

              <div className="flex items-center gap-2">
                <Link
                  href="/postgres/tables"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 transition-colors"
                >
                  <Table2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Tables & CRUD</span>
                </Link>
                <Link
                  href="/postgres/connection"
                  className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="View detailed connection logs"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Redis Card */}
        <Card
          glow={redisStatus?.isConnected ? "emerald" : "rose"}
          className={`border-2 transition-all ${
            redisStatus?.isConnected
              ? "border-emerald-500/40 bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950/20"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          <div className="space-y-6">
            {/* Top Bar inside Card */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`p-3 rounded-2xl border ${
                    redisStatus?.isConnected
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Redis</h3>
                    <Badge variant="redis">Key-Value</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Command: PING
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <Badge
                  variant={
                    isRedisTesting
                      ? "warning"
                      : redisStatus?.isConnected
                      ? "success"
                      : "danger"
                  }
                  pulse={redisStatus?.isConnected}
                  className="text-xs px-3 py-1 font-mono uppercase"
                >
                  {isRedisTesting
                    ? "CHECKING..."
                    : redisStatus?.status || "DISCONNECTED"}
                </Badge>
                {redisStatus?.latencyMs !== undefined && (
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    Latency: <span className="text-slate-200 font-semibold">{redisStatus.latencyMs} ms</span>
                  </p>
                )}
              </div>
            </div>

            {/* Status Message */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-start gap-2.5">
                {redisStatus?.isConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {isRedisTesting
                    ? "Menguji koneksi Redis socket..."
                    : redisStatus?.message || "Belum ada pengujian."}
                </p>
              </div>
            </div>

            {/* Metadata Information Grid (Host, Database/Index, Port) */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                <span className="text-slate-400 font-sans block text-[11px] mb-0.5">
                  Redis Host
                </span>
                <span className="text-slate-200 font-semibold truncate block">
                  {redisStatus?.meta.host || "localhost"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                <span className="text-slate-400 font-sans block text-[11px] mb-0.5">
                  Redis Database / Index
                </span>
                <span className="text-rose-400 font-semibold truncate block">
                  db{redisStatus?.meta.dbIndex ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                <span className="text-slate-400 font-sans block text-[11px] mb-0.5">
                  Port & TLS
                </span>
                <span className="text-slate-300 truncate block">
                  {redisStatus?.meta.port || 6379} ({redisStatus?.meta.tls ? "TLS" : "Plain TCP"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
                <span className="text-slate-400 font-sans block text-[11px] mb-0.5">
                  Security
                </span>
                <span className="text-emerald-400 truncate block font-sans">
                  Password Redacted
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <Button
                onClick={testRedis}
                isLoading={isRedisTesting}
                variant="primary"
                size="sm"
                className="bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/20"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                <span>Test Redis Connection</span>
              </Button>

              <div className="flex items-center gap-2">
                <Link
                  href="/redis/keys"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5 text-rose-400" />
                  <span>Keys Explorer</span>
                </Link>
                <Link
                  href="/redis/connection"
                  className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="View detailed connection logs"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Security & Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-semibold text-slate-200">Server Isolation</h4>
            <p className="text-slate-400 mt-0.5 leading-relaxed">
              Koneksi socket hanya dilakukan melalui server Next.js. Tidak ada kredensial DB yang terekspos ke bundle browser.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex items-start gap-3">
          <Database className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-semibold text-slate-200">Anti-SQL Injection</h4>
            <p className="text-slate-400 mt-0.5 leading-relaxed">
              Validasi tabel menggunakan whitelist <code className="text-sky-300">information_schema</code> dan query berparameter ($1, $2).
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex items-start gap-3">
          <Zap className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-semibold text-slate-200">Non-blocking SCAN</h4>
            <p className="text-slate-400 mt-0.5 leading-relaxed">
              Operasi enumerasi key Redis menggunakan iterator <code className="text-rose-300">SCAN</code> non-blocking (menghindari KEYS *).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
