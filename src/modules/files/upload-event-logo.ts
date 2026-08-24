import "server-only";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/db/prisma";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function uploadEventLogo(input: {
  organisationId: string;
  eventId: string;
  file: File;
}): Promise<{ url: string }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "File storage is not configured. Set BLOB_READ_WRITE_TOKEN to upload logos.",
    );
  }

  if (!ALLOWED_TYPES.has(input.file.type)) {
    throw new Error("Logo must be PNG, JPEG, WebP, or SVG.");
  }

  if (input.file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo must be 2 MB or smaller.");
  }

  const ext =
    input.file.type === "image/png"
      ? "png"
      : input.file.type === "image/webp"
        ? "webp"
        : input.file.type === "image/svg+xml"
          ? "svg"
          : "jpg";

  const pathname = `orgs/${input.organisationId}/events/${input.eventId}/logo.${ext}`;
  const blob = await put(pathname, input.file, {
    access: "public",
    contentType: input.file.type,
    addRandomSuffix: false,
  });

  await prisma.fileObject.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      kind: "EVENT_ASSET",
      filename: input.file.name || `logo.${ext}`,
      contentType: input.file.type,
      url: blob.url,
      sizeBytes: input.file.size,
    },
  });

  await prisma.event.update({
    where: { id: input.eventId },
    data: { logoUrl: blob.url },
  });

  return { url: blob.url };
}

export async function removeEventLogo(
  organisationId: string,
  eventId: string,
): Promise<void> {
  await prisma.event.updateMany({
    where: { id: eventId, organisationId },
    data: { logoUrl: null },
  });
}

/** Upload a sponsor (or other event) logo asset — returns public URL only. */
export async function uploadEventAssetImage(input: {
  organisationId: string;
  eventId: string;
  file: File;
  /** Path segment under the event folder, e.g. `sponsors/abc` */
  pathnameSuffix: string;
}): Promise<{ url: string }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "File storage is not configured. Set BLOB_READ_WRITE_TOKEN to upload logos.",
    );
  }

  if (!ALLOWED_TYPES.has(input.file.type)) {
    throw new Error("Logo must be PNG, JPEG, WebP, or SVG.");
  }

  if (input.file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo must be 2 MB or smaller.");
  }

  const ext =
    input.file.type === "image/png"
      ? "png"
      : input.file.type === "image/webp"
        ? "webp"
        : input.file.type === "image/svg+xml"
          ? "svg"
          : "jpg";

  const pathname = `orgs/${input.organisationId}/events/${input.eventId}/${input.pathnameSuffix}.${ext}`;
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
      filename: input.file.name || `${input.pathnameSuffix}.${ext}`,
      contentType: input.file.type,
      url: blob.url,
      sizeBytes: input.file.size,
    },
  });

  return { url: blob.url };
}
