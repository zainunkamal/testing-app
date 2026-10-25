import { NextResponse } from "next/server";
import { postgresService } from "@/services/postgres.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await postgresService.testConnection();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await postgresService.testConnection();
  return NextResponse.json(result);
}
