import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { serve } from "inngest/next";
import { inngest } from "@/modules/jobs/client";
import { functions } from "@/modules/jobs/functions";

/**
 * Inngest serve endpoint.
 *
 * `serveOrigin` tells Inngest Cloud what origin to use when calling back
 * into this handler to invoke registered functions. Without it the
 * dashboard may show zero functions even though the event key is valid.
 *
 * Locally, run `npx inngest-cli@latest dev` alongside `npm run dev` so
 * the dev server can poll http://localhost:3000/api/inngest.
 */
function origin(): string | undefined {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return undefined;
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  servePath: "/api/inngest",
  ...(origin() ? { serveOrigin: origin() } : {}),
});

export function OPTIONS(_request: NextRequest) {
  return NextResponse.json({});
}
