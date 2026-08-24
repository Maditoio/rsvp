import type { BadgePrintPayload } from "@/modules/badges/print-payload";

export function isBadgePrintPayload(
  value: BadgePrintPayload | null,
): value is BadgePrintPayload {
  return value != null;
}
