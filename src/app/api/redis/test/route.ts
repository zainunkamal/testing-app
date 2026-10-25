import { NextResponse } from "next/server";
import { redisService } from "@/services/redis.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await redisService.testConnection();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await redisService.testConnection();
  return NextResponse.json(result);
}
