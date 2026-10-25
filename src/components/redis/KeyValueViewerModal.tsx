"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  KeyRound,
  Clock,
  Copy,
  Check,
  Edit2,
  Trash2,
  RefreshCw,
  Code,
  Layers,
  ListOrdered,
  Sparkles,
} from "lucide-react";
import { RedisValueResponse, RedisValueType } from "@/types/redis";
import { cn } from "@/lib/utils";

interface KeyValueViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyName: string | null;
  onEdit: (key: string, value: string, ttl: number) => void;
  onDelete: (key: string) => void;
}

export function KeyValueViewerModal({
  isOpen,
  onClose,
  keyName,
  onEdit,
  onDelete,
}: KeyValueViewerModalProps) {
  const [data, setData] = useState<RedisValueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && keyName) {
      setIsLoading(true);
      setError(null);
      setData(null);

      fetch(`/api/redis/keys?key=${encodeURIComponent(keyName)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setData(json);
          } else {
            setError(json.message || "Failed to retrieve key value.");
          }
        })
        .catch(() => {
          setError("Failed to fetch key value from server.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, keyName]);

  if (!isOpen || !keyName) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRawValueString = (): string => {
    if (!data) return "";
    if (typeof data.value === "string") return data.value;
    return JSON.stringify(data.value, null, 2);
  };

  const renderValueContent = () => {
    if (isLoading) {
      return (
        <div className="py-16 text-center text-xs text-slate-400 space-y-2">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto text-rose-400" />
          <p>Fetching value from Redis socket...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-12 text-center text-xs text-rose-400 space-y-1">
          <p className="font-semibold">{error}</p>
          <p className="text-slate-500 text-[11px]">Key mungkin telah kedaluwarsa atau dihapus.</p>
        </div>
      );
    }

    if (!data) return null;

    // String / JSON
    if (data.type === "string") {
      if (data.isJson) {
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 text-[11px] text-sky-400 font-mono">
                <Sparkles className="h-3 w-3" /> Valid JSON Object
              </span>
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(data.value, null, 2))}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>Copy JSON</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-sky-300 font-mono overflow-x-auto max-h-80 leading-relaxed">
              {JSON.stringify(data.value, null, 2)}
            </pre>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] text-slate-400 font-mono">Plaintext String</span>
            <button
              type="button"
              onClick={() => handleCopy(String(data.value))}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>Copy Text</span>
            </button>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
            {String(data.value)}
          </div>
        </div>
      );
    }

    // Hash
    if (data.type === "hash" && typeof data.value === "object" && data.value !== null) {
      const hashObj = data.value as Record<string, string>;
      const keys = Object.keys(hashObj);

      return (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-mono">
            Hash Fields ({keys.length})
          </div>
          <div className="rounded-xl border border-slate-800 overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-3.5 py-2 text-left">Field</th>
                  <th className="px-3.5 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {keys.map((k) => (
                  <tr key={k} className="hover:bg-slate-900/60">
                    <td className="px-3.5 py-2 text-rose-300 font-semibold">{k}</td>
                    <td className="px-3.5 py-2 text-slate-300">{hashObj[k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // List
    if (data.type === "list" && Array.isArray(data.value)) {
      return (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-mono">
            List Elements ({data.value.length})
          </div>
          <div className="rounded-xl border border-slate-800 overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-3.5 py-2 w-16 text-left">Index</th>
                  <th className="px-3.5 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {data.value.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60">
                    <td className="px-3.5 py-2 text-amber-400">{idx}</td>
                    <td className="px-3.5 py-2 text-slate-300">{String(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Set
    if (data.type === "set" && Array.isArray(data.value)) {
      return (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-mono">
            Set Members ({data.value.length})
          </div>
          <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 max-h-80 overflow-y-auto">
            {data.value.map((m, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs"
              >
                {String(m)}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // Fallback JSON string
    return (
      <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto max-h-80">
        {JSON.stringify(data.value, null, 2)}
      </pre>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Redis Key Inspector"
      description={`Detail value dan konfigurasi TTL untuk key "${keyName}".`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Key Metadata Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="font-mono text-sm font-bold text-white select-all">
              {keyName}
            </span>
            <button
              onClick={() => handleCopy(keyName)}
              title="Copy key name"
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <>
                <Badge variant="redis" className="font-mono uppercase text-xs">
                  {data.type}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <Clock className="h-3 w-3 text-amber-400" />
                  <span>{data.ttl === -1 ? "Persistent (∞)" : `${data.ttl}s`}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Value Content */}
        {renderValueContent()}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {data && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(data.key, getRawValueString(), data.ttl);
                  }}
                  className="text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1 text-rose-400" />
                  <span>Edit Key</span>
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onDelete(data.key);
                  }}
                  className="text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span>Delete Key</span>
                </Button>
              </>
            )}
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
