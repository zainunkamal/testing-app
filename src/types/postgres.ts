import { PostgresSafeMeta } from "@/lib/url-sanitizer";

export type ConnectionState = "CONNECTED" | "DISCONNECTED" | "CHECKING";

export interface PostgresConnectionStatus {
  isConnected: boolean;
  status: ConnectionState;
  message: string;
  meta: PostgresSafeMeta;
  latencyMs?: number;
  timestamp: string;
}

export interface TableColumnMeta {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey: boolean;
  isIdentity: boolean;
}

export interface TableMeta {
  tableName: string;
  schemaName: string;
  estimatedRows?: number;
}

export interface TableDataResult {
  tableName: string;
  columns: TableColumnMeta[];
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PostgresInfo {
  version: string;
  databaseName: string;
  currentUser: string;
  status: ConnectionState;
  host: string;
  port: number;
  activeConnections?: number;
  maxConnections?: string;
  databaseSize?: string;
  encoding?: string;
  serverTime?: string;
  uptime?: string;
  timezone?: string;
}
