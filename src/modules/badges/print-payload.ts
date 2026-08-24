import type { BadgeConfig, BadgeSponsor } from "./config";
import type { BadgeTemplate } from "./templates";

/** Client-safe badge render model shared by print view and settings preview. */
export type BadgePrintPayload = {
  attendeeId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  categoryName: string | null;
  country: string | null;
  eventName: string;
  logoUrl: string | null;
  sponsorLogos: BadgeSponsor[];
  qrDataUrl: string;
  config: BadgeConfig;
  template: BadgeTemplate;
};

export const BADGE_PREVIEW_SAMPLE = {
  attendeeId: "preview",
  firstName: "Alex",
  lastName: "Morgan",
  company: "Acme Corp",
  jobTitle: "Product Lead",
  categoryName: "Delegate",
  country: "United Kingdom",
} as const;
