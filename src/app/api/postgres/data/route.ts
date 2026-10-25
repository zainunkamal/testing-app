import { NextRequest, NextResponse } from "next/server";
import { postgresService } from "@/services/postgres.service";
import { handlePostgresError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET: Retrieve paginated table data
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("table");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || undefined;
  const sortOrder = (searchParams.get("sortOrder")?.toUpperCase() === "ASC" ? "ASC" : "DESC") as "ASC" | "DESC";

  if (!tableName) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        message: "Query parameter 'table' is required.",
      },
      { status: 400 }
    );
  }

  try {
    const data = await postgresService.getTableData({
      tableName,
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const safeError = handlePostgresError(error, `api/postgres/data GET [${tableName}]`);
    return NextResponse.json(
      {
        success: false,
        code: safeError.code,
        message: safeError.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Insert a new record into table
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, data } = body;

    if (!table || typeof table !== "string") {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'table' is required." },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'data' object is required." },
        { status: 400 }
      );
    }

    const newRow = await postgresService.insertRow(table, data);

    return NextResponse.json(
      {
        success: true,
        message: "Record successfully inserted.",
        row: newRow,
      },
      { status: 201 }
    );
  } catch (error) {
    const safeError = handlePostgresError(error, "api/postgres/data POST");
    const statusCode =
      safeError.code === "DUPLICATE_KEY" ||
      safeError.code === "INVALID_DATA_TYPE" ||
      safeError.code === "VALIDATION_ERROR"
        ? 400
        : 500;
    return NextResponse.json(
      {
        success: false,
        code: safeError.code,
        message: safeError.message,
      },
      { status: statusCode }
    );
  }
}

/**
 * PUT: Update an existing record by primary key
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, primaryKey, data } = body;

    if (!table || typeof table !== "string") {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'table' is required." },
        { status: 400 }
      );
    }

    if (!primaryKey || !primaryKey.column || primaryKey.value === undefined) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Valid 'primaryKey' object is required." },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'data' object is required." },
        { status: 400 }
      );
    }

    const updatedRow = await postgresService.updateRow(table, primaryKey, data);

    return NextResponse.json({
      success: true,
      message: "Record successfully updated.",
      row: updatedRow,
    });
  } catch (error) {
    const safeError = handlePostgresError(error, "api/postgres/data PUT");
    const statusCode = safeError.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      {
        success: false,
        code: safeError.code,
        message: safeError.message,
      },
      { status: statusCode }
    );
  }
}

/**
 * DELETE: Delete a record by primary key
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, primaryKey } = body;

    if (!table || typeof table !== "string") {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'table' is required." },
        { status: 400 }
      );
    }

    if (!primaryKey || !primaryKey.column || primaryKey.value === undefined) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Valid 'primaryKey' object is required." },
        { status: 400 }
      );
    }

    const result = await postgresService.deleteRow(table, primaryKey);

    return NextResponse.json({
      success: true,
      message: "Record successfully deleted.",
      ...result,
    });
  } catch (error) {
    const safeError = handlePostgresError(error, "api/postgres/data DELETE");
    const statusCode = safeError.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      {
        success: false,
        code: safeError.code,
        message: safeError.message,
      },
      { status: statusCode }
    );
  }
}
