import "server-only";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/db/prisma";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function uploadFloorPlanImage(input: {
  organisationId: string;
  eventId: string;
  file: File;
}): Promise<{ url: string }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "File storage is not configured. Set BLOB_READ_WRITE_TOKEN to upload floor plans.",
    );
  }
  if (!ALLOWED.has(input.file.type)) {
    throw new Error("Floor plan must be PNG, JPEG, or WebP.");
  }
  if (input.file.size > MAX_BYTES) {
    throw new Error("Floor plan must be 8 MB or smaller.");
  }

  const ext =
    input.file.type === "image/png"
      ? "png"
      : input.file.type === "image/webp"
        ? "webp"
        : "jpg";

  const pathname = `orgs/${input.organisationId}/events/${input.eventId}/venue/floor.${ext}`;
  const blob = await put(pathname, input.file, {
    access: "public",
    contentType: input.file.type,
    addRandomSuffix: true,
  });

  await prisma.fileObject.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      kind: "EVENT_ASSET",
      filename: input.file.name || `floor.${ext}`,
      contentType: input.file.type,
      url: blob.url,
      sizeBytes: input.file.size,
    },
  });

  return { url: blob.url };
}
