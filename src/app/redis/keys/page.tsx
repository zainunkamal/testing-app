"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  KeyRound,
  Zap,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Clock,
  Layers,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  FileQuestion,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { SetKeyModal } from "@/components/redis/SetKeyModal";
import { KeyValueViewerModal } from "@/components/redis/KeyValueViewerModal";
import { RedisKeyItem, RedisValueType } from "@/types/redis";
import { cn } from "@/lib/utils";

export default function RedisKeysPage() {
  const [keys, setKeys] = useState<RedisKeyItem[]>([]);
  const [cursor, setCursor] = useState("0");
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pattern, setPattern] = useState("*");
  const [searchInput, setSearchInput] = useState("*");
  const [cursorHistory, setCursorHistory] = useState<string[]>(["0"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [redisConnected, setRedisConnected] = useState<boolean | null>(null);

  // Modal states
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [setModalMode, setSetModalMode] = useState<"create" | "edit">("create");
  const [activeKeyData, setActiveKeyData] = useState<{
    key: string;
    value: string;
    ttl: number | null;
  } | null>(null);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingKey, setViewingKey] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchKeys = useCallback(async (searchPattern: string, targetCursor = "0") => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        pattern: searchPattern.trim() || "*",
        cursor: targetCursor,
        count: "50",
      });

      const res = await fetch(`/api/redis/keys?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.keys)) {
        setKeys(json.keys);
        setCursor(json.cursor);
        setHasMore(json.hasMore);
        setRedisConnected(true);
      } else {
        setRedisConnected(false);
        setKeys([]);
      }
    } catch {
      setRedisConnected(false);
      setKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial scan
  useEffect(() => {
    fetchKeys("*", "0");
  }, [fetchKeys]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPattern = searchInput.trim() || "*";
    setPattern(cleanPattern);
    setCursorHistory(["0"]);
    setHistoryIndex(0);
    fetchKeys(cleanPattern, "0");
  };

  // Next page in SCAN
  const handleNextScan = () => {
    if (cursor !== "0") {
      const nextIndex = historyIndex + 1;
      const newHistory = [...cursorHistory.slice(0, nextIndex), cursor];
      setCursorHistory(newHistory);
      setHistoryIndex(nextIndex);
      fetchKeys(pattern, cursor);
    }
  };

  // Quick pattern pill clicked
  const handleQuickPattern = (p: string) => {
    setSearchInput(p);
    setPattern(p);
    setCursorHistory(["0"]);
    setHistoryIndex(0);
    fetchKeys(p, "0");
  };

  // Copy key to clipboard
  const handleCopyKey = (keyName: string) => {
    navigator.clipboard.writeText(keyName);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Create Modal
  const handleOpenCreateKey = () => {
    setSetModalMode("create");
    setActiveKeyData(null);
    setIsSetModalOpen(true);
  };

  // Open View Modal
  const handleOpenViewKey = (keyName: string) => {
    setViewingKey(keyName);
    setIsViewerOpen(true);
  };

  // Open Edit Modal (fetches value first if opened from table)
  const handleOpenEditKey = async (keyName: string, existingValue?: string, existingTtl?: number | null) => {
    if (existingValue !== undefined) {
      setSetModalMode("edit");
      setActiveKeyData({ key: keyName, value: existingValue, ttl: existingTtl ?? null });
      setIsSetModalOpen(true);
      return;
    }

    // Fetch key value from server
    try {
      const res = await fetch(`/api/redis/keys?key=${encodeURIComponent(keyName)}`);
      const json = await res.json();
      if (json.success) {
        const valStr = typeof json.value === "string" ? json.value : JSON.stringify(json.value, null, 2);
        setSetModalMode("edit");
        setActiveKeyData({ key: keyName, value: valStr, ttl: json.ttl });
        setIsSetModalOpen(true);
      } else {
        showToast(json.message || "Failed to load key data.", "error");
      }
    } catch {
      showToast("Failed to fetch key details.", "error");
    }
  };

  // Open Delete Confirmation Dialog
  const handleOpenDeleteKey = (keyName: string) => {
    setDeletingKey(keyName);
    setIsDeleteDialogOpen(true);
  };

  // Confirm Delete Execution
  const handleConfirmDelete = async () => {
    if (!deletingKey) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/redis/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: deletingKey }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete key.");
      }

      showToast(`Key "${deletingKey}" successfully deleted from Redis.`);
      setIsDeleteDialogOpen(false);
      fetchKeys(pattern, cursorHistory[historyIndex] || "0");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete key.";
      showToast(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Format TTL into human-friendly string
  const formatTtl = (ttl: number) => {
    if (ttl === -1) {
      return (
        <span className="text-slate-400 font-mono text-xs flex items-center gap-1">
          <span>∞</span>
          <span className="text-[10px] text-slate-500 font-sans">Persistent</span>
        </span>
      );
    }
    if (ttl === -2) {
      return (
        <span className="text-rose-400 font-mono text-xs">
          Expired
        </span>
      );
    }
    if (ttl > 3600) {
      const hours = Math.floor(ttl / 3600);
      const mins = Math.floor((ttl % 3600) / 60);
      return (
        <span className="text-amber-400 font-mono text-xs">
          {hours}h {mins}m ({ttl}s)
        </span>
      );
    }
    if (ttl > 60) {
      const mins = Math.floor(ttl / 60);
      const secs = ttl % 60;
      return (
        <span className="text-amber-300 font-mono text-xs">
          {mins}m {secs}s
        </span>
      );
    }
    return (
      <span className="text-rose-400 font-mono text-xs font-semibold">
        {ttl}s
      </span>
    );
  };

  // Format Type badge with color
  const renderTypeBadge = (type: RedisValueType) => {
    const typeStyles: Record<string, string> = {
      string: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      hash: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      list: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      set: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      zset: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      none: "bg-slate-800 text-slate-400 border-slate-700",
    };

    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border uppercase tracking-wide",
          typeStyles[type] || typeStyles.none
        )}
      >
        {type}
      </span>
    );
  };

  const quickPatterns = ["*", "test:*", "user:*", "session:*", "cache:*"];

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-bottom-5",
            toast.type === "success"
              ? "bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10"
              : "bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-500/10"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Redis Key Explorer & Operations
            </h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="font-mono">SCAN (non-blocking)</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Eksplorasi key non-blocking, manipulasi SET/GET/DELETE, serta dukungan tipe String, JSON, Hash, List, dan Set.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => fetchKeys(pattern, "0")}
            variant="secondary"
            size="sm"
            isLoading={isLoading}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleOpenCreateKey}
            variant="primary"
            size="sm"
            className="bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/20"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>Set Key</span>
          </Button>
        </div>
      </div>

      {/* Disconnected Warning Banner if Redis offline */}
      {redisConnected === false && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-rose-200 text-sm">Redis Tidak Terhubung</h4>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                Tidak dapat mengeksekusi command SCAN pada socket Redis. Pastikan server Redis berjalan pada host dan periksa variabel <code className="font-mono bg-rose-950/60 px-1 py-0.5 rounded">REDIS_URL</code> di file <code className="font-mono bg-rose-950/60 px-1 py-0.5 rounded">.env</code>.
              </p>
            </div>
          </div>
          <Link href="/redis/connection">
            <Button size="sm" variant="danger" className="shrink-0 text-xs">
              Test Connection
            </Button>
          </Link>
        </div>
      )}

      {/* Search & Pattern Filter Bar */}
      <Card className="p-4 bg-slate-900/60">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Scan pattern (e.g. test:*, user:*, cache:*)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/20 shrink-0"
            >
              <Search className="h-4 w-4 mr-1.5" />
              <span>Scan Keys</span>
            </Button>
          </div>

          {/* Quick Pattern Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-xs">
            <span className="text-slate-500 font-sans mr-1">Quick Patterns:</span>
            {quickPatterns.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleQuickPattern(p)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-mono text-xs transition-colors cursor-pointer border",
                  pattern === p
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* Main Keys Table Card */}
      <Card className="p-0 overflow-hidden border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
        {/* Table Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Discovered Keys</h3>
                <Badge variant="redis">
                  {keys.length} keys in current scan
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Pattern: <span className="text-rose-400">{pattern}</span> | Cursor: <span className="text-slate-300">{cursor}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Keys Table */}
        <div className="overflow-x-auto min-h-75">
          {isLoading ? (
            <div className="py-24 text-center text-xs text-slate-400 space-y-3">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-rose-400" />
              <p>Executing non-blocking SCAN {cursor} MATCH &quot;{pattern}&quot; COUNT 50...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 space-y-2">
              <FileQuestion className="h-8 w-8 mx-auto text-slate-600 mb-1" />
              <p className="text-sm font-semibold text-slate-300">
                Tidak ada key yang cocok dengan pattern &quot;{pattern}&quot;.
              </p>
              <p className="text-slate-500 max-w-sm mx-auto text-[11px]">
                Gunakan tombol &quot;Set Key&quot; di atas untuk membuat key-value baru di database Redis.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                  <th className="px-5 py-3.5 font-semibold">Key Name</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">Time To Live (TTL)</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {keys.map((item) => (
                  <tr
                    key={item.key}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Key Name with Copy Button */}
                    <td className="px-5 py-3 text-slate-200 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <button
                          onClick={() => handleOpenViewKey(item.key)}
                          className="font-semibold select-all truncate max-w-md text-left hover:text-rose-300 hover:underline transition-colors cursor-pointer"
                          title="Click to view value"
                        >
                          {item.key}
                        </button>
                        <button
                          onClick={() => handleCopyKey(item.key)}
                          title="Copy key name"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-200 transition-opacity cursor-pointer"
                        >
                          {copiedKey === item.key ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-5 py-3 align-middle">
                      {renderTypeBadge(item.type)}
                    </td>

                    {/* TTL */}
                    <td className="px-5 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        {formatTtl(item.ttl)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3 text-right align-middle whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenViewKey(item.key)}
                          title="View Value"
                          className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditKey(item.key)}
                          title="Edit Key & TTL"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteKey(item.key)}
                          title="Delete Key"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Scan Iteration & Cursor Navigation Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Current Scan Cursor: <code className="font-mono text-slate-200 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{cursor}</code>
            {cursor === "0" ? " (Iterasi SCAN selesai)" : " (Ada key berikutnya)"}
          </div>

          <div className="flex items-center gap-3">
            {hasMore ? (
              <Button
                onClick={handleNextScan}
                disabled={isLoading || cursor === "0"}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200"
              >
                <span>Next SCAN Batch</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <span className="text-slate-500 text-xs italic">
                End of SCAN results
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Set Key Modal (Create or Edit) */}
      <SetKeyModal
        isOpen={isSetModalOpen}
        onClose={() => setIsSetModalOpen(false)}
        mode={setModalMode}
        initialKey={activeKeyData?.key || ""}
        initialValue={activeKeyData?.value || ""}
        initialTtl={activeKeyData?.ttl}
        onSuccess={() => {
          showToast(
            setModalMode === "create"
              ? `Key "${activeKeyData?.key || ""}" berhasil dibuat di Redis.`
              : `Key "${activeKeyData?.key || ""}" berhasil diperbarui.`
          );
          fetchKeys(pattern, cursorHistory[historyIndex] || "0");
        }}
      />

      {/* Key Value Viewer Modal */}
      <KeyValueViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        keyName={viewingKey}
        onEdit={(k, val, ttl) => handleOpenEditKey(k, val, ttl)}
        onDelete={(k) => handleOpenDeleteKey(k)}
      />

      {/* Confirmation Dialog for Destructive Delete */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Key Redis"
        message={`Apakah Anda yakin ingin menghapus key "${deletingKey}" dari Redis? Key beserta nilainya akan segera dihapus secara permanen.`}
        confirmLabel="Hapus Key"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
