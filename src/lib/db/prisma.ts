import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Use a versioned global key. Next.js HMR keeps `globalThis.prisma` across
 * `prisma generate`, so a renamed key forces a fresh client after schema changes.
 */
const GLOBAL_KEY = "__bizcon_prisma_v11_event_sponsors__" as const;

type PrismaGlobal = typeof globalThis & {
  [GLOBAL_KEY]?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function clientMatchesSchema(client: PrismaClient) {
  const venue = (
    client as unknown as { venueFloorPlan?: { findFirst?: unknown } }
  ).venueFloorPlan;
  if (typeof venue?.findFirst !== "function") return false;

  // Guard against HMR reusing a client generated before org feature columns existed.
  return (
    "venueAiFloorPlanEnabled" in Prisma.OrganisationScalarFieldEnum &&
    "tokenEncrypted" in Prisma.MapCheckpointScalarFieldEnum &&
    "kind" in Prisma.MapAnalyticsEventScalarFieldEnum &&
    "tier" in Prisma.EventSponsorScalarFieldEnum
  );
}

function getPrismaClient(): PrismaClient {
  const g = globalThis as PrismaGlobal;
  const existing = g[GLOBAL_KEY];

  if (existing) {
    if (clientMatchesSchema(existing)) {
      return existing;
    }
    void existing.$disconnect();
    g[GLOBAL_KEY] = undefined;
  }

  const client = createPrismaClient();

  if (!clientMatchesSchema(client)) {
    throw new Error(
      "Prisma client is out of date (missing VenueFloorPlan, Organisation.venueAiFloorPlanEnabled, MapAnalyticsEvent, or EventSponsor). Run `npx prisma generate`, delete the `.next` folder, and restart the dev server.",
    );
  }

  if (process.env.NODE_ENV !== "production") {
    g[GLOBAL_KEY] = client;
  }

  // Drop legacy singletons if present from older code.
  const legacy = globalThis as unknown as {
    prisma?: PrismaClient;
    __bizcon_prisma_v5_venue_maps__?: PrismaClient;
    __bizcon_prisma_v6_org_venue_ai__?: PrismaClient;
    __bizcon_prisma_v7_org_venue_ai__?: PrismaClient;
    __bizcon_prisma_v8_checkpoint_cipher__?: PrismaClient;
    __bizcon_prisma_v9_map_analytics__?: PrismaClient;
    __bizcon_prisma_v10_event_website__?: PrismaClient;
  };
  for (const key of [
    "prisma",
    "__bizcon_prisma_v5_venue_maps__",
    "__bizcon_prisma_v6_org_venue_ai__",
    "__bizcon_prisma_v7_org_venue_ai__",
    "__bizcon_prisma_v8_checkpoint_cipher__",
    "__bizcon_prisma_v9_map_analytics__",
    "__bizcon_prisma_v10_event_website__",
  ] as const) {
    const old = legacy[key];
    if (old && old !== client) {
      void old.$disconnect();
      legacy[key] = undefined;
    }
  }

  return client;
}

export const prisma = getPrismaClient();

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL ?? "";
  return Boolean(url) && !url.includes("USER:PASSWORD");
}
