/** Visual layout presets — independent of printer label size. */

export const BADGE_DESIGN_IDS = [
  "classic",
  "qr_left",
  "qr_center",
  "sponsor_footer",
  "sponsor_header",
  "side_rail",
  "compact",
] as const;

export type BadgeDesignId = (typeof BADGE_DESIGN_IDS)[number];

export const LOGO_POSITIONS = [
  "top",
  "bottom",
  "left",
  "right",
  "none",
] as const;
export type LogoPosition = (typeof LOGO_POSITIONS)[number];

export const QR_POSITIONS = ["left", "center", "right"] as const;
export type QrPosition = (typeof QR_POSITIONS)[number];

export const QR_SIZES = ["sm", "md", "lg"] as const;
export type QrSize = (typeof QR_SIZES)[number];

export const SPONSOR_POSITIONS = [
  "top",
  "bottom",
  "left",
  "right",
  "none",
] as const;
export type SponsorPosition = (typeof SPONSOR_POSITIONS)[number];

export type BadgeDesign = {
  id: BadgeDesignId;
  name: string;
  description: string;
  eventLogoPosition: LogoPosition;
  qrPosition: QrPosition;
  qrSize: QrSize;
  sponsorPosition: SponsorPosition;
};

export const BADGE_DESIGNS: Record<BadgeDesignId, BadgeDesign> = {
  classic: {
    id: "classic",
    name: "Classic",
    description: "Event logo top · name centre · QR bottom-right",
    eventLogoPosition: "top",
    qrPosition: "right",
    qrSize: "md",
    sponsorPosition: "bottom",
  },
  qr_left: {
    id: "qr_left",
    name: "QR left",
    description: "Small QR on the left · name on the right",
    eventLogoPosition: "top",
    qrPosition: "left",
    qrSize: "sm",
    sponsorPosition: "bottom",
  },
  qr_center: {
    id: "qr_center",
    name: "QR centred",
    description: "Logo top · name centre · QR bottom-centre",
    eventLogoPosition: "top",
    qrPosition: "center",
    qrSize: "md",
    sponsorPosition: "bottom",
  },
  sponsor_footer: {
    id: "sponsor_footer",
    name: "Sponsor footer",
    description: "Event logo top · sponsors along the bottom strip",
    eventLogoPosition: "top",
    qrPosition: "right",
    qrSize: "sm",
    sponsorPosition: "bottom",
  },
  sponsor_header: {
    id: "sponsor_header",
    name: "Sponsor header",
    description: "Sponsor logos across the top · event logo with name",
    eventLogoPosition: "bottom",
    qrPosition: "right",
    qrSize: "sm",
    sponsorPosition: "top",
  },
  side_rail: {
    id: "side_rail",
    name: "Side rail",
    description: "Event logo left rail · QR right · sponsors bottom",
    eventLogoPosition: "left",
    qrPosition: "right",
    qrSize: "md",
    sponsorPosition: "bottom",
  },
  compact: {
    id: "compact",
    name: "Compact",
    description: "Minimal · small QR bottom-left · logo top-centre",
    eventLogoPosition: "top",
    qrPosition: "left",
    qrSize: "sm",
    sponsorPosition: "none",
  },
};

export function getBadgeDesign(id: string): BadgeDesign {
  if (id in BADGE_DESIGNS) {
    return BADGE_DESIGNS[id as BadgeDesignId];
  }
  return BADGE_DESIGNS.classic;
}

export function listBadgeDesigns(): BadgeDesign[] {
  return BADGE_DESIGN_IDS.map((id) => BADGE_DESIGNS[id]);
}

export function qrSizeClass(size: QrSize): string {
  switch (size) {
    case "sm":
      return "size-10";
    case "lg":
      return "size-16";
    default:
      return "size-14";
  }
}
