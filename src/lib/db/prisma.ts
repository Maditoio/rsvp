import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Use a versioned global key. Next.js HMR keeps `globalThis.prisma` across
 * `prisma generate`, so a renamed key forces a fresh client after schema changes.
 */
const GLOBAL_KEY = "__bizcon_prisma_v4_organiser_roadmap__" as const;

type PrismaGlobal = typeof globalThis & {
  [GLOBAL_KEY]?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  const g = globalThis as PrismaGlobal;
  const existing = g[GLOBAL_KEY];

  if (existing) {
    const pollDelegate = (
      existing as unknown as { eventPoll?: { findMany?: unknown } }
    ).eventPoll;
    if (typeof pollDelegate?.findMany === "function") {
      return existing;
    }
    void existing.$disconnect();
    g[GLOBAL_KEY] = undefined;
  }

  const client = createPrismaClient();
  const pollDelegate = (
    client as unknown as { eventPoll?: { findMany?: unknown } }
  ).eventPoll;

  if (typeof pollDelegate?.findMany !== "function") {
    throw new Error(
      "Prisma client is missing EventPoll. Run `npx prisma generate`, delete the `.next` folder, and restart the dev server.",
    );
  }

  if (process.env.NODE_ENV !== "production") {
    g[GLOBAL_KEY] = client;
  }

  // Drop legacy singleton if present from older code.
  const legacy = globalThis as unknown as { prisma?: PrismaClient };
  if (legacy.prisma && legacy.prisma !== client) {
    void legacy.prisma.$disconnect();
    legacy.prisma = undefined;
  }

  return client;
}

export const prisma = getPrismaClient();

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL ?? "";
  return Boolean(url) && !url.includes("USER:PASSWORD");
}
