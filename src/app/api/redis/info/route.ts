import { NextResponse } from "next/server";
import { redisService } from "@/services/redis.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = await redisService.getRedisInfo();
    return NextResponse.json({
      success: info.status === "CONNECTED",
      data: info,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Redis information",
      },
      { status: 500 }
    );
  }
}
