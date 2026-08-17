import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { serve } from "inngest/next";
import { inngest } from "@/modules/jobs/client";
import { functions } from "@/modules/jobs/functions";

export const { GET, POST, PUT } = serve({ client: inngest, functions });

export function OPTIONS(_request: NextRequest) {
  return NextResponse.json({});
}
