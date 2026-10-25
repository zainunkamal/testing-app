"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Table2,
  Database,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Key,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  X,
  FileQuestion,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { DynamicCrudModal } from "@/components/postgres/DynamicCrudModal";
import { TableMeta, TableColumnMeta, TableDataResult } from "@/types/postgres";
import { cn } from "@/lib/utils";

export default function PostgresTablesPage() {
  // State for Tables List
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isTablesLoading, setIsTablesLoading] = useState(true);
  const [tableSearchFilter, setTableSearchFilter] = useState("");
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // State for Selected Table Data
  const [dataResult, setDataResult] = useState<TableDataResult | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  // State for CRUD Modals & Dialogs
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [crudMode, setCrudMode] = useState<"create" | "edit">("create");
  const [activeRowData, setActiveRowData] = useState<Record<string, unknown> | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPk, setDeletingPk] = useState<{ column: string; value: unknown } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch list of public tables
  const fetchTables = useCallback(async (selectDefault = false) => {
    setIsTablesLoading(true);
    try {
      const res = await fetch("/api/postgres/tables");
      const json = await res.json();
      if (json.success && Array.isArray(json.tables)) {
        setTables(json.tables);
        setDbConnected(true);
        if (selectDefault && json.tables.length > 0 && !selectedTable) {
          setSelectedTable(json.tables[0].tableName);
        }
      } else {
        setDbConnected(false);
        setTables([]);
      }
    } catch {
      setDbConnected(false);
      setTables([]);
    } finally {
      setIsTablesLoading(false);
    }
  }, [selectedTable]);

  // Fetch data for the currently selected table
  const fetchTableData = useCallback(
    async (tableName: string, currentPage: number, size: number, search: string, sortCol?: string, order: "ASC" | "DESC" = "DESC") => {
      setIsDataLoading(true);
      try {
        const params = new URLSearchParams({
          table: tableName,
          page: String(currentPage),
          pageSize: String(size),
        });
        if (search.trim()) params.append("search", search.trim());
        if (sortCol) params.append("sortBy", sortCol);
        if (order) params.append("sortOrder", order);

        const res = await fetch(`/api/postgres/data?${params.toString()}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDataResult(json.data);
        } else {
          setDataResult(null);
        }
      } catch {
        setDataResult(null);
      } finally {
        setIsDataLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchTables(true);
  }, [fetchTables]);

  // Re-fetch data when table, page, pageSize, or sorting changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, page, pageSize, searchQuery, sortBy, sortOrder);
    } else {
      setDataResult(null);
    }
  }, [selectedTable, page, pageSize, sortBy, sortOrder, fetchTableData]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (selectedTable) {
      fetchTableData(selectedTable, 1, pageSize, searchQuery, sortBy, sortOrder);
    }
  };

  // Handle column header sort toggle
  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(columnName);
      setSortOrder("DESC");
    }
    setPage(1);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setCrudMode("create");
    setActiveRowData(null);
    setIsCrudModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (row: Record<string, unknown>) => {
    setCrudMode("edit");
    setActiveRowData(row);
    setIsCrudModalOpen(true);
  };

  // Open Delete Confirmation Dialog
  const handleOpenDelete = (row: Record<string, unknown>) => {
    if (!dataResult) return;
    const pkCol = dataResult.columns.find((c) => c.isPrimaryKey)?.columnName || "id";
    const pkVal = row[pkCol];

    if (pkVal === undefined) {
      showToast(`Primary key "${pkCol}" value is undefined.`, "error");
      return;
    }

    setDeletingPk({ column: pkCol, value: pkVal });
    setIsDeleteDialogOpen(true);
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!selectedTable || !deletingPk) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/postgres/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: selectedTable,
          primaryKey: deletingPk,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete record.");
      }

      showToast("Record successfully deleted from database.");
      setIsDeleteDialogOpen(false);
      // Re-fetch data
      fetchTableData(selectedTable, page, pageSize, searchQuery, sortBy, sortOrder);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete record.";
      showToast(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Format cell value for display
  const formatCellValue = (val: unknown, column: TableColumnMeta) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-600 font-mono italic text-[11px]">NULL</span>;
    }

    if (typeof val === "boolean") {
      return val ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          <Check className="h-3 w-3" /> true
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
          <X className="h-3 w-3" /> false
        </span>
      );
    }

    if (val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val))) {
      const date = new Date(val);
      return (
        <span className="font-mono text-[11px] text-slate-300">
          {date.toLocaleString()}
        </span>
      );
    }

    if (typeof val === "object") {
      return (
        <span className="font-mono text-[11px] text-sky-300 max-w-xs truncate block" title={JSON.stringify(val)}>
          {JSON.stringify(val)}
        </span>
      );
    }

    return (
      <span
        className={cn(
          "truncate block max-w-md",
          column.isPrimaryKey && "font-mono font-semibold text-sky-400",
          typeof val === "number" && "font-mono text-slate-200"
        )}
      >
        {String(val)}
      </span>
    );
  };

  const filteredTables = tables.filter((t) =>
    t.tableName.toLowerCase().includes(tableSearchFilter.toLowerCase())
  );

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
              PostgreSQL Table Explorer & CRUD
            </h2>
            <Badge variant="postgres">public schema</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Eksplorasi skema tabel, paginasi dinamis, pencarian record, dan operasi CRUD berparameter.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              fetchTables(false);
              if (selectedTable) {
                fetchTableData(selectedTable, page, pageSize, searchQuery, sortBy, sortOrder);
              }
            }}
            variant="secondary"
            size="sm"
            isLoading={isTablesLoading || isDataLoading}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Disconnected Warning Banner if DB offline */}
      {dbConnected === false && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-rose-200 text-sm">PostgreSQL Tidak Terhubung</h4>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                Tidak dapat mengambil daftar tabel dari <code className="font-mono bg-rose-950/60 px-1 py-0.5 rounded">information_schema</code>. Pastikan database PostgreSQL aktif di host dan periksa file <code className="font-mono bg-rose-950/60 px-1 py-0.5 rounded">.env</code>.
              </p>
            </div>
          </div>
          <Link href="/postgres/connection">
            <Button size="sm" variant="danger" className="shrink-0 text-xs">
              Test Connection
            </Button>
          </Link>
        </div>
      )}

      {/* Main Two-Column Layout: Tables Sidebar + Data Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tables Sidebar (3 cols on lg) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Tables ({tables.length})
                </span>
              </div>
              <button
                onClick={() => fetchTables(false)}
                title="Refresh table list"
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RefreshCw className={cn("h-3 w-3", isTablesLoading && "animate-spin text-sky-400")} />
              </button>
            </div>

            {/* Filter table names */}
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter table name..."
                value={tableSearchFilter}
                onChange={(e) => setTableSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Tables Item List */}
            <div className="mt-3 space-y-1 max-h-125 overflow-y-auto pr-1">
              {isTablesLoading && tables.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-sky-400" />
                  <span>Loading tables...</span>
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <FileQuestion className="h-5 w-5 mx-auto mb-1 text-slate-600" />
                  <span>No tables found</span>
                </div>
              ) : (
                filteredTables.map((t) => {
                  const isSelected = selectedTable === t.tableName;
                  return (
                    <button
                      key={t.tableName}
                      onClick={() => {
                        setSelectedTable(t.tableName);
                        setPage(1);
                        setSearchQuery("");
                        setSortBy(undefined);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between group cursor-pointer",
                        isSelected
                          ? "bg-sky-500/15 border border-sky-500/40 text-sky-200 shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Table2
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-colors",
                            isSelected ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                          )}
                        />
                        <span className="font-mono truncate">{t.tableName}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ml-1.5",
                          isSelected
                            ? "bg-sky-500/30 text-sky-200"
                            : "bg-slate-800 text-slate-400"
                        )}
                      >
                        ~{t.estimatedRows ?? 0}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Table Viewer & Grid (9 cols on lg) */}
        <div className="lg:col-span-9 space-y-4">
          {selectedTable ? (
            <Card className="p-0 overflow-hidden border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
              {/* Table Data Header & Actions */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    <Table2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white font-mono">
                        {dataResult?.tableName || selectedTable}
                      </h3>
                      {dataResult && (
                        <Badge variant="postgres">
                          {dataResult.totalRows} {dataResult.totalRows === 1 ? "row" : "rows"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {dataResult?.columns.length ?? 0} columns detected
                    </p>
                  </div>
                </div>

                {/* Search & Add Data */}
                <div className="flex items-center gap-2.5">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search in table..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-44 sm:w-56"
                    />
                  </form>

                  <Button
                    onClick={() => {
                      if (selectedTable) {
                        fetchTableData(selectedTable, page, pageSize, searchQuery, sortBy, sortOrder);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="p-2"
                    title="Refresh data"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isDataLoading && "animate-spin text-sky-400")} />
                  </Button>

                  <Button
                    onClick={handleOpenCreate}
                    variant="primary"
                    size="sm"
                    className="bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-600/20"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Add Data</span>
                  </Button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto min-h-75">
                {isDataLoading ? (
                  <div className="py-24 text-center text-xs text-slate-400 space-y-3">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-sky-400" />
                    <p>Executing parameterized SELECT query...</p>
                  </div>
                ) : !dataResult || dataResult.rows.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400 space-y-2">
                    <FileQuestion className="h-8 w-8 mx-auto text-slate-600 mb-1" />
                    <p className="text-sm font-semibold text-slate-300">
                      {searchQuery ? "Tidak ada record yang sesuai dengan pencarian." : "Tabel ini belum memiliki record data."}
                    </p>
                    <p className="text-slate-500 max-w-sm mx-auto text-[11px]">
                      {searchQuery
                        ? "Coba gunakan kata kunci pencarian yang lain atau kosongkan kolom search."
                        : "Gunakan tombol 'Add Data' untuk menambahkan record baru sesuai kolom yang tersedia."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                        {dataResult.columns.map((col) => {
                          const isSorted = sortBy === col.columnName;
                          return (
                            <th
                              key={col.columnName}
                              onClick={() => handleSort(col.columnName)}
                              className="px-4 py-3 font-semibold hover:text-slate-200 cursor-pointer select-none whitespace-nowrap transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                {col.isPrimaryKey && (
                                  <span title="Primary Key">
                                    <Key className="h-3 w-3 text-sky-400" />
                                  </span>
                                )}
                                <span>{col.columnName}</span>
                                <span className="text-[10px] text-slate-400 font-sans font-normal lowercase">
                                  ({col.dataType})
                                </span>
                                {isSorted ? (
                                  sortOrder === "ASC" ? (
                                    <ArrowUp className="h-3 w-3 text-sky-400" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3 text-sky-400" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-2.5 w-2.5 text-slate-600 opacity-0 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {dataResult.rows.map((row, rowIdx) => {
                        const pkCol = dataResult.columns.find((c) => c.isPrimaryKey)?.columnName || "id";
                        const rowKey = String(row[pkCol] ?? rowIdx);

                        return (
                          <tr
                            key={rowKey}
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                            {dataResult.columns.map((col) => (
                              <td
                                key={col.columnName}
                                className="px-4 py-3 text-slate-300 align-middle max-w-xs"
                              >
                                {formatCellValue(row[col.columnName], col)}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(row)}
                                  title="Edit Record"
                                  className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenDelete(row)}
                                  title="Delete Record"
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Footer */}
              {dataResult && dataResult.totalRows > 0 && (
                <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-400">
                    Showing{" "}
                    <span className="font-semibold text-slate-200">
                      {(dataResult.page - 1) * dataResult.pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-200">
                      {Math.min(dataResult.page * dataResult.pageSize, dataResult.totalRows)}
                    </span>{" "}
                    of <span className="font-semibold text-slate-200">{dataResult.totalRows}</span>{" "}
                    records
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    {/* Pagination Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(1)}
                        disabled={dataResult.page <= 1}
                        className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
                        title="First page"
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={dataResult.page <= 1}
                        className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
                        title="Previous page"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>

                      <span className="px-2 text-slate-300 font-mono">
                        Page {dataResult.page} of {dataResult.totalPages}
                      </span>

                      <button
                        onClick={() => setPage((p) => Math.min(dataResult.totalPages, p + 1))}
                        disabled={dataResult.page >= dataResult.totalPages}
                        className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
                        title="Next page"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setPage(dataResult.totalPages)}
                        disabled={dataResult.page >= dataResult.totalPages}
                        className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
                        title="Last page"
                      >
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-500 space-y-3">
              <Table2 className="h-10 w-10 mx-auto text-slate-600" />
              <h3 className="text-base font-semibold text-slate-300">Pilih Tabel dari Daftar</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Pilih salah satu tabel di sidebar kiri untuk melihat skema kolom dan record data secara otomatis.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Dynamic Insert / Edit Modal */}
      {selectedTable && dataResult && (
        <DynamicCrudModal
          isOpen={isCrudModalOpen}
          onClose={() => setIsCrudModalOpen(false)}
          mode={crudMode}
          tableName={selectedTable}
          columns={dataResult.columns}
          initialData={activeRowData}
          onSuccess={() => {
            showToast(
              crudMode === "create"
                ? "Record baru berhasil ditambahkan ke tabel."
                : "Perubahan record berhasil disimpan ke database."
            );
            fetchTableData(selectedTable, page, pageSize, searchQuery, sortBy, sortOrder);
          }}
        />
      )}

      {/* Confirmation Dialog for Destructive Delete */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Record PostgreSQL"
        message={`Apakah Anda yakin ingin menghapus record ini dari tabel "${selectedTable}"? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`}
        confirmLabel="Hapus Data"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
