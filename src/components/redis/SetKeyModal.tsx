"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { KeyRound, Clock, Code, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initialKey?: string;
  initialValue?: string;
  initialTtl?: number | null;
  onSuccess: () => void;
}

export function SetKeyModal({
  isOpen,
  onClose,
  mode,
  initialKey = "",
  initialValue = "",
  initialTtl = null,
  onSuccess,
}: SetKeyModalProps) {
  const [key, setKey] = useState(initialKey);
  const [value, setValue] = useState(initialValue);
  const [ttl, setTtl] = useState<string>(initialTtl !== null && initialTtl !== undefined ? String(initialTtl) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKey(initialKey);
      setValue(initialValue);
      setTtl(initialTtl !== null && initialTtl !== undefined && initialTtl > 0 ? String(initialTtl) : "");
      setErrorMessage(null);
    }
  }, [isOpen, initialKey, initialValue, initialTtl]);

  if (!isOpen) return null;

  // Try to pretty-format JSON in value field
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed, null, 2));
      setErrorMessage(null);
    } catch {
      setErrorMessage("Value bukan format JSON yang valid untuk di-format.");
    }
  };

  const handlePresetTtl = (seconds: number | null) => {
    setTtl(seconds === null ? "" : String(seconds));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setErrorMessage("Key name tidak boleh kosong.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const parsedTtl = ttl.trim() !== "" ? parseInt(ttl, 10) : null;
    const method = mode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch("/api/redis/keys", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          value,
          ttl: parsedTtl,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to set Redis key.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Set Redis Key" : `Edit Key "${key}"`}
      description={
        mode === "create"
          ? "Simpan key-value baru ke Redis dengan command SET. TTL bersifat opsional."
          : "Perbarui nilai atau waktu kedaluwarsa (TTL) untuk key ini."
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Gagal Menyimpan Key:</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Key Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono">
              <KeyRound className="h-3.5 w-3.5 text-rose-400" />
              <span>Key Name:</span>
            </span>
            <span className="text-[10px] text-slate-500">Contoh: test:name, user:101</span>
          </label>
          <input
            type="text"
            required
            disabled={mode === "edit"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. test:name"
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-60 disabled:bg-slate-900"
          />
        </div>

        {/* Value Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-slate-300 flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5 text-slate-400" />
              <span>Value (String or JSON):</span>
            </label>
            <button
              type="button"
              onClick={handleFormatJson}
              className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              <span>Beautify JSON</span>
            </button>
          </div>
          <textarea
            rows={5}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='e.g. Zainun or {"name": "Zainun", "role": "Senior Architect"}'
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed"
          />
        </div>

        {/* TTL (Seconds) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Time To Live (TTL in Seconds):</span>
            </span>
            <span className="text-[10px] text-slate-500">Kosongkan jika persistent (∞)</span>
          </label>
          <input
            type="number"
            min={1}
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            placeholder="e.g. 3600 (1 hour)"
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-500 mr-1 text-[10px]">Presets:</span>
            <button
              type="button"
              onClick={() => handlePresetTtl(null)}
              className={cn(
                "px-2 py-0.5 rounded border transition-colors cursor-pointer",
                ttl === ""
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              No Expiration (∞)
            </button>
            <button
              type="button"
              onClick={() => handlePresetTtl(60)}
              className={cn(
                "px-2 py-0.5 rounded border transition-colors cursor-pointer",
                ttl === "60"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              60s (1m)
            </button>
            <button
              type="button"
              onClick={() => handlePresetTtl(300)}
              className={cn(
                "px-2 py-0.5 rounded border transition-colors cursor-pointer",
                ttl === "300"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              300s (5m)
            </button>
            <button
              type="button"
              onClick={() => handlePresetTtl(3600)}
              className={cn(
                "px-2 py-0.5 rounded border transition-colors cursor-pointer",
                ttl === "3600"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              3600s (1h)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/20"
          >
            {mode === "create" ? "SET Key" : "Update Key"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
