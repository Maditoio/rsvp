import { NextResponse } from "next/server";
import { requireEvent } from "@/lib/authz/require";
import { loadPairingDetail } from "@/modules/matchmaking/pairing-detail";

export async function GET(
  request: Request,
  context: { params: Promise<{ orgSlug: string; eventId: string }> },
) {
  const { orgSlug, eventId } = await context.params;
  const ctx = await requireEvent(orgSlug, eventId, "event.read");
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subjectId");
  const candidateId = url.searchParams.get("candidateId");
  if (!subjectId || !candidateId) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const detail = await loadPairingDetail(
    ctx.organisation.id,
    eventId,
    subjectId,
    candidateId,
  );
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
