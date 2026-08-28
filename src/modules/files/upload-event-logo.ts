import "server-only";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/db/prisma";
import {
  blobStorageNotConfiguredMessage,
  isBlobStorageConfigured,
} from "@/modules/files/blob-config";
import {
  ALLOWED_EVENT_IMAGE_TYPES,
  MAX_EVENT_IMAGE_BYTES,
  eventImageTooLargeMessage,
  eventImageTypeError,
} from "@/modules/files/image-upload";

export async function uploadEventLogo(input: {
  organisationId: string;
  eventId: string;
  file: File;
}): Promise<{ url: string }> {
  if (!isBlobStorageConfigured()) {
    throw new Error(blobStorageNotConfiguredMessage());
  }

  if (!ALLOWED_EVENT_IMAGE_TYPES.has(input.file.type)) {
    throw new Error(eventImageTypeError());
  }

  if (input.file.size > MAX_EVENT_IMAGE_BYTES) {
    throw new Error(eventImageTooLargeMessage("logo"));
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
  kind?: "background" | "logo";
}): Promise<{ url: string }> {
  if (!isBlobStorageConfigured()) {
    throw new Error(blobStorageNotConfiguredMessage());
  }

  const imageKind = input.kind ?? "logo";

  if (!ALLOWED_EVENT_IMAGE_TYPES.has(input.file.type)) {
    throw new Error(eventImageTypeError());
  }

  if (input.file.size > MAX_EVENT_IMAGE_BYTES) {
    throw new Error(eventImageTooLargeMessage(imageKind));
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
