import { NextResponse } from "next/server";
import { postgresService } from "@/services/postgres.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = await postgresService.getPostgresInfo();
    return NextResponse.json({
      success: info.status === "CONNECTED",
      data: info,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch PostgreSQL information",
      },
      { status: 500 }
    );
  }
}
