import { NextRequest, NextResponse } from "next/server";
import { postgresService } from "@/services/postgres.service";
import { handlePostgresError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("name");

  try {
    if (tableName) {
      const columns = await postgresService.getTableColumns(tableName);
      return NextResponse.json({
        success: true,
        tableName,
        columns,
      });
    }

    const tables = await postgresService.getTables();
    return NextResponse.json({
      success: true,
      tables,
    });
  } catch (error) {
    const safeError = handlePostgresError(error, "api/postgres/tables");
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
