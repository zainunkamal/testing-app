import { NextRequest, NextResponse } from "next/server";
import { redisService } from "@/services/redis.service";
import { handleRedisError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET: Either scan keys or get single key value
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const singleKey = searchParams.get("key");

  // Single key value inspection
  if (singleKey) {
    try {
      const result = await redisService.getKeyValue(singleKey);
      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (error) {
      const safeError = handleRedisError(error, `api/redis/keys GET [key: ${singleKey}]`);
      return NextResponse.json(
        {
          success: false,
          code: safeError.code,
          message: safeError.message,
        },
        { status: 404 }
      );
    }
  }

  // Scan multiple keys
  const pattern = searchParams.get("pattern") || "*";
  const cursor = searchParams.get("cursor") || "0";
  const count = parseInt(searchParams.get("count") || "50", 10);

  try {
    const result = await redisService.scanKeys({
      pattern,
      cursor,
      count,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const safeError = handleRedisError(error, `api/redis/keys SCAN [pattern: ${pattern}]`);
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
 * POST: Set a new key-value pair
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, ttl } = body;

    if (!key || typeof key !== "string" || key.trim() === "") {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'key' is required." },
        { status: 400 }
      );
    }

    if (value === undefined || value === null) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'value' is required." },
        { status: 400 }
      );
    }

    let parsedTtl: number | null = null;
    if (ttl !== undefined && ttl !== null && String(ttl).trim() !== "") {
      const num = Number(ttl);
      if (isNaN(num) || !Number.isInteger(num) || num < -1) {
        return NextResponse.json(
          { success: false, code: "VALIDATION_ERROR", message: "TTL must be an integer >= -1." },
          { status: 400 }
        );
      }
      parsedTtl = num;
    }

    const result = await redisService.setKey({
      key: key.trim(),
      value: String(value),
      ttl: parsedTtl,
    });

    return NextResponse.json(
      {
        ...result,
        message: "Key successfully created in Redis.",
      },
      { status: 201 }
    );
  } catch (error) {
    const safeError = handleRedisError(error, "api/redis/keys POST");
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
 * PUT: Update an existing key value and/or TTL
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, ttl } = body;

    if (!key || typeof key !== "string" || key.trim() === "") {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'key' is required." },
        { status: 400 }
      );
    }

    if (value === undefined || value === null) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'value' is required." },
        { status: 400 }
      );
    }

    let parsedTtl: number | null = null;
    if (ttl !== undefined && ttl !== null && String(ttl).trim() !== "") {
      const num = Number(ttl);
      if (isNaN(num) || !Number.isInteger(num) || num < -1) {
        return NextResponse.json(
          { success: false, code: "VALIDATION_ERROR", message: "TTL must be an integer >= -1." },
          { status: 400 }
        );
      }
      parsedTtl = num;
    }

    const result = await redisService.updateKey({
      key: key.trim(),
      value: String(value),
      ttl: parsedTtl,
    });

    return NextResponse.json({
      ...result,
      message: "Key successfully updated in Redis.",
    });
  } catch (error) {
    const safeError = handleRedisError(error, "api/redis/keys PUT");
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
 * DELETE: Delete a key
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key || typeof key !== "string" || key.trim() === "") {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", message: "Field 'key' is required." },
        { status: 400 }
      );
    }

    const result = await redisService.deleteKey(key.trim());

    return NextResponse.json({
      ...result,
      message: "Key successfully deleted from Redis.",
    });
  } catch (error) {
    const safeError = handleRedisError(error, "api/redis/keys DELETE");
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
