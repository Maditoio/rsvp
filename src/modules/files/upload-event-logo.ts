import "server-only";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/db/prisma";
import {
  blobStorageNotConfiguredMessage,
  isBlobStorageConfigured,
} from "@/modules/files/blob-config";
import {
  MAX_EVENT_IMAGE_BYTES,
  eventImageTooLargeMessage,
  eventImageTypeError,
  formatFileBytes,
  resolveEventImageMime,
} from "@/modules/files/image-upload";

async function normalizeUploadFile(
  file: File,
  kind: "background" | "logo",
): Promise<File> {
  const mime = await resolveEventImageMime(file);
  if (!mime) {
    throw new Error(
      eventImageTypeError({
        reportedType: file.type || "(empty)",
        fileName: file.name,
        sizeBytes: file.size,
      }),
    );
  }
  if (file.size > MAX_EVENT_IMAGE_BYTES) {
    throw new Error(eventImageTooLargeMessage(kind, file.size));
  }
  if (mime === file.type) return file;
  return new File([file], file.name || `image.${extForMime(mime)}`, {
    type: mime,
    lastModified: file.lastModified,
  });
}

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  return "jpg";
}

async function putEventAsset(input: {
  organisationId: string;
  eventId: string;
  file: File;
  pathname: string;
  addRandomSuffix: boolean;
}): Promise<{ url: string }> {
  if (!isBlobStorageConfigured()) {
    throw new Error(blobStorageNotConfiguredMessage());
  }

  try {
    const blob = await put(input.pathname, input.file, {
      access: "public",
      contentType: input.file.type,
      addRandomSuffix: input.addRandomSuffix,
      // Event logo uses a fixed pathname (`logo.png`); re-uploads must overwrite.
      allowOverwrite: !input.addRandomSuffix,
    });

    await prisma.fileObject.create({
      data: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        kind: "EVENT_ASSET",
        filename: input.file.name || input.pathname.split("/").pop() || "asset",
        contentType: input.file.type,
        url: blob.url,
        sizeBytes: input.file.size,
      },
    });

    return { url: blob.url };
  } catch (error) {
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "unknown storage error";
    throw new Error(
      `Upload failed for "${input.file.name || "image"}" (${input.file.type || "unknown type"}, ${formatFileBytes(input.file.size)}): ${detail}`,
    );
  }
}

export async function uploadEventLogo(input: {
  organisationId: string;
  eventId: string;
  file: File;
}): Promise<{ url: string }> {
  const file = await normalizeUploadFile(input.file, "logo");
  const ext = extForMime(file.type);
  const pathname = `orgs/${input.organisationId}/events/${input.eventId}/logo.${ext}`;
  const { url } = await putEventAsset({
    organisationId: input.organisationId,
    eventId: input.eventId,
    file,
    pathname,
    addRandomSuffix: false,
  });

  await prisma.event.update({
    where: { id: input.eventId },
    data: { logoUrl: url },
  });

  return { url };
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
  const imageKind = input.kind ?? "logo";
  const file = await normalizeUploadFile(input.file, imageKind);
  const ext = extForMime(file.type);
  const pathname = `orgs/${input.organisationId}/events/${input.eventId}/${input.pathnameSuffix}.${ext}`;
  return putEventAsset({
    organisationId: input.organisationId,
    eventId: input.eventId,
    file,
    pathname,
    addRandomSuffix: true,
  });
}
