"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TableColumnMeta } from "@/types/postgres";
import { Key, AlertCircle, CheckCircle2 } from "lucide-react";

interface DynamicCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  tableName: string;
  columns: TableColumnMeta[];
  initialData?: Record<string, unknown> | null;
  onSuccess: () => void;
}

export function DynamicCrudModal({
  isOpen,
  onClose,
  mode,
  tableName,
  columns,
  initialData,
  onSuccess,
}: DynamicCrudModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form data when opened or initialData changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (mode === "edit" && initialData) {
        // Deep clone or sanitize initialData
        const initial: Record<string, unknown> = {};
        columns.forEach((col) => {
          const val = initialData[col.columnName];
          if (val instanceof Date) {
            initial[col.columnName] = val.toISOString().slice(0, 16);
          } else if (typeof val === "object" && val !== null) {
            initial[col.columnName] = JSON.stringify(val, null, 2);
          } else if (val !== null && val !== undefined) {
            initial[col.columnName] = val;
          } else {
            initial[col.columnName] = "";
          }
        });
        setFormData(initial);
      } else {
        // Create mode: blank defaults
        const blank: Record<string, unknown> = {};
        columns.forEach((col) => {
          const isAuto =
            col.isIdentity ||
            (col.columnDefault && col.columnDefault.includes("nextval"));
          if (!isAuto) {
            if (col.dataType.includes("bool")) {
              blank[col.columnName] = false;
            } else {
              blank[col.columnName] = "";
            }
          }
        });
        setFormData(blank);
      }
    }
  }, [isOpen, mode, initialData, columns]);

  if (!isOpen) return null;

  // Filter columns to display in form
  const formColumns = columns.filter((col) => {
    if (mode === "create") {
      // Don't show auto-increment / identity primary keys in Create mode
      const isAuto =
        col.isIdentity ||
        (col.columnDefault && col.columnDefault.includes("nextval"));
      return !isAuto;
    }
    return true;
  });

  const handleInputChange = (columnName: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [columnName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === "create") {
        const res = await fetch("/api/postgres/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: tableName,
            data: formData,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to create record.");
        }
      } else {
        // Edit mode: find primary key
        const pkCol = columns.find((c) => c.isPrimaryKey)?.columnName || "id";
        const pkValue = initialData ? initialData[pkCol] : formData[pkCol];

        if (pkValue === undefined) {
          throw new Error(`Primary key "${pkCol}" value is missing.`);
        }

        const res = await fetch("/api/postgres/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: tableName,
            primaryKey: { column: pkCol, value: pkValue },
            data: formData,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to update record.");
        }
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

  const renderInputField = (col: TableColumnMeta) => {
    const isPk = col.isPrimaryKey;
    const isReadOnly = mode === "edit" && isPk;
    const isRequired = !col.isNullable && !col.columnDefault && !isPk;
    const value = formData[col.columnName] ?? "";
    const type = col.dataType.toLowerCase();

    // Boolean field
    if (type.includes("bool")) {
      return (
        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id={`field-${col.columnName}`}
            checked={Boolean(value)}
            disabled={isReadOnly}
            onChange={(e) => handleInputChange(col.columnName, e.target.checked)}
            className="h-4 w-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-sky-500 cursor-pointer"
          />
          <label
            htmlFor={`field-${col.columnName}`}
            className="text-xs text-slate-300 font-mono cursor-pointer"
          >
            {Boolean(value) ? "true" : "false"}
          </label>
        </div>
      );
    }

    // JSON field
    if (type.includes("json")) {
      return (
        <textarea
          rows={3}
          value={String(value)}
          disabled={isReadOnly}
          onChange={(e) => handleInputChange(col.columnName, e.target.value)}
          placeholder='{"key": "value"}'
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      );
    }

    // Long text / Textarea
    if (type === "text") {
      return (
        <textarea
          rows={2}
          value={String(value)}
          disabled={isReadOnly}
          required={isRequired}
          onChange={(e) => handleInputChange(col.columnName, e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      );
    }

    // Number field
    if (
      type.includes("int") ||
      type.includes("numeric") ||
      type.includes("decimal") ||
      type.includes("real") ||
      type.includes("double")
    ) {
      return (
        <input
          type="number"
          step={type.includes("int") ? "1" : "any"}
          value={value === null || value === undefined ? "" : String(value)}
          disabled={isReadOnly}
          required={isRequired}
          onChange={(e) => handleInputChange(col.columnName, e.target.value)}
          placeholder={`Enter ${col.columnName}...`}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50 disabled:bg-slate-900"
        />
      );
    }

    // Timestamp / Date field
    if (type.includes("date") || type.includes("time")) {
      return (
        <input
          type="text"
          value={String(value)}
          disabled={isReadOnly}
          required={isRequired}
          placeholder="YYYY-MM-DD HH:mm:ss"
          onChange={(e) => handleInputChange(col.columnName, e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
        />
      );
    }

    // Standard Text Input
    return (
      <input
        type="text"
        value={String(value)}
        disabled={isReadOnly}
        required={isRequired}
        placeholder={`Enter ${col.columnName}...`}
        onChange={(e) => handleInputChange(col.columnName, e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50 disabled:bg-slate-900"
      />
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? `Add Data to "${tableName}"` : `Edit Record in "${tableName}"`}
      description={
        mode === "create"
          ? "Form otomatis dibangkitkan berdasarkan struktur kolom tabel. Primary key auto-increment diabaikan."
          : "Ubah data baris record. Primary key dikunci (read-only)."
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert inside Modal */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Gagal Memproses Data:</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Dynamic Fields List */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3.5 pr-1">
          {formColumns.map((col) => {
            const isPk = col.isPrimaryKey;
            const isRequired = !col.isNullable && !col.columnDefault && !isPk;

            return (
              <div key={col.columnName} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor={`field-${col.columnName}`}
                    className="font-medium text-slate-300 flex items-center gap-1.5 font-mono"
                  >
                    {isPk && (
                      <span title="Primary Key">
                        <Key className="h-3 w-3 text-sky-400" />
                      </span>
                    )}
                    <span>{col.columnName}</span>
                    {isRequired && <span className="text-rose-400 font-sans">*</span>}
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {col.dataType}
                    </span>
                    {col.isNullable && (
                      <span className="text-[10px] text-slate-500 font-sans">
                        (optional)
                      </span>
                    )}
                  </div>
                </div>

                {renderInputField(col)}
              </div>
            );
          })}
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
            className="bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-600/20"
          >
            {mode === "create" ? "Insert Record" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
