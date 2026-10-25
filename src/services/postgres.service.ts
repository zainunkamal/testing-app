import { prisma } from "@/lib/prisma";
import { parsePostgresUrl, PostgresSafeMeta } from "@/lib/url-sanitizer";
import { handlePostgresError } from "@/lib/errors";
import {
  PostgresConnectionStatus,
  TableMeta,
  TableColumnMeta,
  TableDataResult,
} from "@/types/postgres";
import { logger } from "@/lib/logger";

function serializeRow(row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) return {};
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    clean[k] = typeof v === "bigint" ? Number(v) : v;
  }
  return clean;
}

export class PostgresService {
  /**
   * Safely test PostgreSQL connection using SELECT 1;
   */
  async testConnection(): Promise<PostgresConnectionStatus> {
    const meta: PostgresSafeMeta = parsePostgresUrl();
    const startTime = performance.now();

    try {
      await prisma.$queryRaw`SELECT 1 as result;`;
      const latencyMs = Math.round(performance.now() - startTime);

      logger.info("PostgresService", "Connection test successful", {
        host: meta.host,
        database: meta.database,
        latencyMs,
      });

      return {
        isConnected: true,
        status: "CONNECTED",
        message: "PostgreSQL connection successful.",
        meta,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const safeError = handlePostgresError(error, "PostgresService.testConnection");
      const latencyMs = Math.round(performance.now() - startTime);

      return {
        isConnected: false,
        status: "DISCONNECTED",
        message: safeError.message,
        meta,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get safe connection metadata without password
   */
  getSafeMetadata(): PostgresSafeMeta {
    return parsePostgresUrl();
  }

  /**
   * List all public tables in the database with estimated row counts
   */
  async getTables(): Promise<TableMeta[]> {
    try {
      const query = `
        SELECT 
          t.table_name AS "tableName",
          t.table_schema AS "schemaName",
          GREATEST(COALESCE(c.reltuples::bigint, 0), 0) AS "estimatedRows"
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
        WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name ASC;
      `;
      const rawTables = await prisma.$queryRawUnsafe<
        { tableName: string; schemaName: string; estimatedRows: bigint | number }[]
      >(query);
      return rawTables.map((t) => ({
        tableName: t.tableName,
        schemaName: t.schemaName,
        estimatedRows: Number(t.estimatedRows || 0),
      }));
    } catch (error) {
      logger.error("PostgresService.getTables", "Failed to introspect tables", error);
      throw error;
    }
  }

  /**
   * Introspect columns schema for a specific table
   */
  async getTableColumns(tableName: string): Promise<TableColumnMeta[]> {
    // Validate table name against whitelist to guarantee safety
    const validTables = await this.getTables();
    const tableExists = validTables.some((t) => t.tableName === tableName);

    if (!tableExists) {
      throw new Error(`Table "${tableName}" does not exist in the public schema.`);
    }

    try {
      const query = `
        SELECT 
          c.column_name AS "columnName",
          c.data_type AS "dataType",
          (c.is_nullable = 'YES') AS "isNullable",
          c.column_default AS "columnDefault",
          (c.is_identity = 'YES' OR COALESCE(c.column_default, '') LIKE 'nextval%') AS "isIdentity",
          EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name 
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY' 
              AND tc.table_schema = 'public' 
              AND tc.table_name = c.table_name 
              AND kcu.column_name = c.column_name
          ) AS "isPrimaryKey"
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
          AND c.table_name = $1
        ORDER BY c.ordinal_position ASC;
      `;

      const columns = await prisma.$queryRawUnsafe<TableColumnMeta[]>(query, tableName);
      return columns;
    } catch (error) {
      logger.error("PostgresService.getTableColumns", `Failed to introspect columns for ${tableName}`, error);
      throw error;
    }
  }

  /**
   * Safely query table data with pagination, search, and sorting
   * Uses parameterized queries and schema-validated column identifiers.
   */
  async getTableData(options: {
    tableName: string;
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<TableDataResult> {
    const {
      tableName,
      page = 1,
      pageSize = 10,
      search = "",
      sortBy,
      sortOrder = "DESC",
    } = options;

    const validatedPage = Math.max(1, Number(page) || 1);
    const validatedPageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const offset = (validatedPage - 1) * validatedPageSize;

    // 1. Validate table and get columns
    const columns = await this.getTableColumns(tableName);
    if (!columns || columns.length === 0) {
      throw new Error(`Table "${tableName}" has no accessible columns.`);
    }

    // 2. Determine safe sort column
    const pkColumn = columns.find((c) => c.isPrimaryKey)?.columnName;
    let safeSortColumn = pkColumn || columns[0].columnName;

    if (sortBy && columns.some((c) => c.columnName === sortBy)) {
      safeSortColumn = sortBy;
    }

    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // 3. Build search conditions with parameters
    const queryParams: unknown[] = [];
    let whereClause = "";

    if (search && search.trim() !== "") {
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern);
      const paramIdx = `$${queryParams.length}`;

      // Search across all text-compatible columns
      const searchableColumns = columns.filter((col) => {
        const type = col.dataType.toLowerCase();
        return (
          type.includes("char") ||
          type.includes("text") ||
          type.includes("uuid") ||
          type.includes("json")
        );
      });

      if (searchableColumns.length > 0) {
        const conditions = searchableColumns.map(
          (col) => `"${col.columnName}"::text ILIKE ${paramIdx}`
        );
        whereClause = `WHERE (${conditions.join(" OR ")})`;
      } else {
        // Fallback: search on primary key or first column casted to text
        whereClause = `WHERE ("${columns[0].columnName}"::text ILIKE ${paramIdx})`;
      }
    }

    // 4. Count total rows
    const countQuery = `
      SELECT COUNT(*)::bigint AS count 
      FROM "${tableName}"
      ${whereClause};
    `;

    const countResult = await prisma.$queryRawUnsafe<{ count: string | number }[]>(
      countQuery,
      ...queryParams
    );
    const totalRows = Number(countResult[0]?.count || 0);

    // 5. Query page rows with parameters
    const dataQueryParams = [...queryParams];
    dataQueryParams.push(validatedPageSize);
    const limitParam = `$${dataQueryParams.length}`;
    dataQueryParams.push(offset);
    const offsetParam = `$${dataQueryParams.length}`;

    const dataQuery = `
      SELECT * 
      FROM "${tableName}"
      ${whereClause}
      ORDER BY "${safeSortColumn}" ${safeSortOrder}
      LIMIT ${limitParam} OFFSET ${offsetParam};
    `;

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      dataQuery,
      ...dataQueryParams
    );

    const serializedRows = rows.map(serializeRow);

    const totalPages = Math.ceil(totalRows / validatedPageSize);

    return {
      tableName,
      columns,
      rows: serializedRows,
      totalRows,
      page: validatedPage,
      pageSize: validatedPageSize,
      totalPages: Math.max(1, totalPages),
    };
  }

  /**
   * Helper to safely parse input value based on PostgreSQL data type
   */
  private castValue(val: unknown, column: TableColumnMeta): unknown {
    if (val === undefined || val === "" || val === null) {
      if (column.isNullable) return null;
      if (column.columnDefault) return undefined; // Let DB handle default
      return null;
    }

    const type = column.dataType.toLowerCase();

    if (type.includes("int") || type.includes("serial")) {
      const parsed = parseInt(String(val), 10);
      if (isNaN(parsed)) throw new Error(`Invalid integer value for column "${column.columnName}".`);
      return parsed;
    }

    if (type.includes("numeric") || type.includes("decimal") || type.includes("real") || type.includes("double")) {
      const parsed = parseFloat(String(val));
      if (isNaN(parsed)) throw new Error(`Invalid numeric value for column "${column.columnName}".`);
      return parsed;
    }

    if (type.includes("bool")) {
      if (typeof val === "boolean") return val;
      return String(val).toLowerCase() === "true" || String(val) === "1";
    }

    if (type.includes("date") || type.includes("time")) {
      const d = new Date(String(val));
      if (isNaN(d.getTime())) throw new Error(`Invalid date/time value for column "${column.columnName}".`);
      return d;
    }

    if (type.includes("json")) {
      if (typeof val === "object") return JSON.stringify(val);
      try {
        JSON.parse(String(val));
        return String(val);
      } catch {
        throw new Error(`Invalid JSON format for column "${column.columnName}".`);
      }
    }

    return String(val);
  }

  /**
   * Insert a new row into any table with schema validation & parameterized query
   */
  async insertRow(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const columns = await this.getTableColumns(tableName);

    // Filter columns to insert (skip auto-increment/identity if not provided)
    const insertableColumns = columns.filter((col) => {
      const isAuto =
        col.isIdentity || (col.columnDefault && col.columnDefault.includes("nextval"));
      if (isAuto && (data[col.columnName] === undefined || data[col.columnName] === "" || data[col.columnName] === null)) {
        return false;
      }
      return data[col.columnName] !== undefined;
    });

    if (insertableColumns.length === 0) {
      throw new Error(`No valid column data provided for table "${tableName}".`);
    }

    const values: unknown[] = [];
    const colNames: string[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < insertableColumns.length; i++) {
      const col = insertableColumns[i];
      const rawVal = data[col.columnName];
      const castedVal = this.castValue(rawVal, col);

      if (castedVal !== undefined) {
        colNames.push(`"${col.columnName}"`);
        values.push(castedVal);
        placeholders.push(`$${values.length}`);
      }
    }

    const query = `
      INSERT INTO "${tableName}" (${colNames.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *;
    `;

    logger.info("PostgresService.insertRow", `Inserting row into ${tableName}`, {
      columns: colNames,
    });

    const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(query, ...values);
    return serializeRow(result[0]);
  }

  /**
   * Update an existing row by primary key with parameterized query
   */
  async updateRow(
    tableName: string,
    primaryKey: { column: string; value: unknown },
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const columns = await this.getTableColumns(tableName);
    const pkCol = columns.find((c) => c.columnName === primaryKey.column);

    if (!pkCol) {
      throw new Error(`Primary key column "${primaryKey.column}" does not exist in "${tableName}".`);
    }

    const pkValue = this.castValue(primaryKey.value, pkCol);

    // Only update non-PK columns that are present in payload
    const updatableColumns = columns.filter((col) => {
      if (col.columnName === primaryKey.column) return false;
      return data[col.columnName] !== undefined;
    });

    if (updatableColumns.length === 0) {
      throw new Error("No fields provided to update.");
    }

    const values: unknown[] = [];
    const setClauses: string[] = [];

    for (let i = 0; i < updatableColumns.length; i++) {
      const col = updatableColumns[i];
      const rawVal = data[col.columnName];
      const castedVal = this.castValue(rawVal, col);

      values.push(castedVal);
      setClauses.push(`"${col.columnName}" = $${values.length}`);
    }

    values.push(pkValue);
    const pkParamIdx = `$${values.length}`;

    const query = `
      UPDATE "${tableName}"
      SET ${setClauses.join(", ")}
      WHERE "${primaryKey.column}" = ${pkParamIdx}
      RETURNING *;
    `;

    logger.info("PostgresService.updateRow", `Updating row in ${tableName}`, {
      pkColumn: primaryKey.column,
    });

    const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(query, ...values);

    if (!result || result.length === 0) {
      throw new Error(`Record not found with ${primaryKey.column} = ${primaryKey.value}.`);
    }

    return serializeRow(result[0]);
  }

  /**
   * Delete an existing row by primary key with parameterized query
   */
  async deleteRow(
    tableName: string,
    primaryKey: { column: string; value: unknown }
  ): Promise<{ deleted: boolean; count: number }> {
    const columns = await this.getTableColumns(tableName);
    const pkCol = columns.find((c) => c.columnName === primaryKey.column);

    if (!pkCol) {
      throw new Error(`Primary key column "${primaryKey.column}" does not exist in "${tableName}".`);
    }

    const pkValue = this.castValue(primaryKey.value, pkCol);

    const query = `
      DELETE FROM "${tableName}"
      WHERE "${primaryKey.column}" = $1
      RETURNING "${primaryKey.column}";
    `;

    logger.info("PostgresService.deleteRow", `Deleting row in ${tableName}`, {
      pkColumn: primaryKey.column,
    });

    const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(query, pkValue);

    if (!result || result.length === 0) {
      throw new Error(`Record not found or already deleted.`);
    }

    return { deleted: true, count: result.length };
  }

  /**
   * Get server specifications, telemetry, and connection metrics
   */
  async getPostgresInfo(): Promise<import("@/types/postgres").PostgresInfo> {
    const meta = this.getSafeMetadata();
    try {
      const versionRes = await prisma.$queryRawUnsafe<{ version: string }[]>("SELECT version();");
      const dbRes = await prisma.$queryRawUnsafe<{ db: string; user: string; encoding: string; time: string }[]>(
        "SELECT current_database() as db, current_user as user, getdatabaseencoding() as encoding, now()::text as time;"
      );

      let activeConnections: number | undefined;
      try {
        const connRes = await prisma.$queryRawUnsafe<{ count: number }[]>(
          "SELECT count(*)::int as count FROM pg_stat_activity;"
        );
        activeConnections = connRes[0]?.count;
      } catch {
        // Fallback if user doesn't have pg_stat_activity permission
      }

      let maxConnections: string | undefined;
      try {
        const maxConnRes = await prisma.$queryRawUnsafe<{ max_connections: string }[]>("SHOW max_connections;");
        maxConnections = maxConnRes[0]?.max_connections;
      } catch {}

      let databaseSize: string | undefined;
      try {
        const sizeRes = await prisma.$queryRawUnsafe<{ size: string }[]>(
          "SELECT pg_size_pretty(pg_database_size(current_database())) as size;"
        );
        databaseSize = sizeRes[0]?.size;
      } catch {}

      let uptime: string | undefined;
      try {
        const uptimeRes = await prisma.$queryRawUnsafe<{ uptime: string }[]>(
          "SELECT (now() - pg_postmaster_start_time())::text as uptime;"
        );
        uptime = uptimeRes[0]?.uptime;
      } catch {}

      let timezone: string | undefined;
      try {
        const tzRes = await prisma.$queryRawUnsafe<{ TimeZone?: string; timezone?: string }[]>("SHOW TimeZone;");
        timezone = tzRes[0]?.TimeZone || tzRes[0]?.timezone;
      } catch {}

      return {
        version: versionRes[0]?.version || "Unknown",
        databaseName: dbRes[0]?.db || meta.database,
        currentUser: dbRes[0]?.user || "Unknown",
        status: "CONNECTED",
        host: meta.host,
        port: meta.port,
        activeConnections,
        maxConnections,
        databaseSize,
        encoding: dbRes[0]?.encoding,
        serverTime: dbRes[0]?.time,
        uptime,
        timezone,
      };
    } catch (error) {
      logger.error("PostgresService.getPostgresInfo", "Failed to retrieve Postgres info", error);
      return {
        version: "Unavailable",
        databaseName: meta.database,
        currentUser: "Unavailable",
        status: "DISCONNECTED",
        host: meta.host,
        port: meta.port,
      };
    }
  }
}

export const postgresService = new PostgresService();

