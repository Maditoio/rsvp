import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * After `prisma generate`, Next.js HMR can keep an old PrismaClient on
 * globalThis that is missing newly added model delegates (e.g. salesforce
 * after hubSpot was already present). Detect that and recreate.
 */
function isStalePrismaClient(client: PrismaClient): boolean {
  const delegates = client as unknown as Record<
    string,
    { findUnique?: unknown } | undefined
  >;
  for (const model of Prisma.dmmf.datamodel.models) {
    const key = model.name.charAt(0).toLowerCase() + model.name.slice(1);
    if (typeof delegates[key]?.findUnique !== "function") {
      return true;
    }
  }
  return false;
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && isStalePrismaClient(existing)) {
    void existing.$disconnect();
    globalForPrisma.prisma = undefined;
  }

  const client = globalForPrisma.prisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL ?? "";
  return Boolean(url) && !url.includes("USER:PASSWORD");
}
