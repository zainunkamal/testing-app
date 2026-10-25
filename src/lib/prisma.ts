import { PrismaClient } from "@prisma/client";

// Ensure all BigInt values from PostgreSQL queries serialize safely to JSON
// instead of throwing "Do not know how to serialize a BigInt"
if (typeof BigInt !== "undefined" && !(BigInt.prototype as unknown as { toJSON?: () => unknown }).toJSON) {
  (BigInt.prototype as unknown as { toJSON: () => unknown }).toJSON = function () {
    const int = Number(this);
    return Number.isSafeInteger(int) ? int : this.toString();
  };
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
