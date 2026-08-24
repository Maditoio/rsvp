/** Absolute canvas layout for badge elements (positions as % of badge size). */

export const BADGE_ELEMENT_IDS = [
  "eventLogo",
  "eventName",
  "name",
  "company",
  "jobTitle",
  "category",
  "country",
  "sponsors",
  "qr",
] as const;

export type BadgeElementId = (typeof BADGE_ELEMENT_IDS)[number];

export type BadgeElementPose = {
  /** Left edge as % of badge width (0–100). */
  x: number;
  /** Top edge as % of badge height (0–100). */
  y: number;
  zIndex: number;
};

export type BadgeLayout = Record<BadgeElementId, BadgeElementPose>;

export const BADGE_ELEMENT_LABELS: Record<BadgeElementId, string> = {
  eventLogo: "Event logo",
  eventName: "Event name",
  name: "Attendee name",
  company: "Company",
  jobTitle: "Job title",
  category: "Category",
  country: "Country",
  sponsors: "Sponsors",
  qr: "QR code",
};

function pose(x: number, y: number, zIndex: number): BadgeElementPose {
  return {
    x: clampPct(x),
    y: clampPct(y),
    zIndex,
  };
}

export function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

export function parsePose(
  value: unknown,
  fallback: BadgeElementPose,
): BadgeElementPose {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const x = typeof raw.x === "number" ? raw.x : Number(raw.x);
  const y = typeof raw.y === "number" ? raw.y : Number(raw.y);
  const z =
    typeof raw.zIndex === "number" ? raw.zIndex : Number(raw.zIndex);
  return {
    x: Number.isFinite(x) ? clampPct(x) : fallback.x,
    y: Number.isFinite(y) ? clampPct(y) : fallback.y,
    zIndex: Number.isFinite(z) ? Math.round(z) : fallback.zIndex,
  };
}

/** Classic: logo top-left, name centre, category bottom-centre, QR bottom-right. */
export const CLASSIC_LAYOUT: BadgeLayout = {
  eventLogo: pose(4, 4, 2),
  eventName: pose(55, 5, 2),
  name: pose(8, 28, 4),
  company: pose(8, 44, 4),
  jobTitle: pose(8, 54, 4),
  country: pose(8, 64, 4),
  category: pose(8, 86, 8),
  sponsors: pose(8, 92, 3),
  qr: pose(68, 55, 5),
};

export const LAYOUT_PRESETS: Record<string, BadgeLayout> = {
  classic: CLASSIC_LAYOUT,
  qr_left: {
    eventLogo: pose(4, 4, 2),
    eventName: pose(55, 5, 2),
    qr: pose(4, 30, 5),
    name: pose(32, 28, 4),
    company: pose(32, 44, 4),
    jobTitle: pose(32, 54, 4),
    category: pose(32, 64, 4),
    country: pose(32, 74, 4),
    sponsors: pose(8, 86, 3),
  },
  qr_center: {
    eventLogo: pose(4, 4, 2),
    eventName: pose(55, 5, 2),
    name: pose(8, 22, 4),
    company: pose(8, 36, 4),
    jobTitle: pose(8, 45, 4),
    category: pose(8, 54, 4),
    country: pose(8, 62, 4),
    qr: pose(36, 68, 5),
    sponsors: pose(8, 88, 3),
  },
  sponsor_footer: {
    eventLogo: pose(4, 4, 2),
    eventName: pose(55, 5, 2),
    name: pose(8, 26, 4),
    company: pose(8, 42, 4),
    jobTitle: pose(8, 52, 4),
    category: pose(8, 62, 4),
    country: pose(8, 72, 4),
    qr: pose(70, 40, 5),
    sponsors: pose(6, 86, 3),
  },
  sponsor_header: {
    sponsors: pose(6, 3, 3),
    name: pose(8, 22, 4),
    company: pose(8, 38, 4),
    jobTitle: pose(8, 48, 4),
    category: pose(8, 58, 4),
    country: pose(8, 68, 4),
    qr: pose(70, 40, 5),
    eventLogo: pose(8, 82, 2),
    eventName: pose(45, 84, 2),
  },
  side_rail: {
    eventLogo: pose(2, 20, 2),
    eventName: pose(2, 55, 2),
    name: pose(22, 22, 4),
    company: pose(22, 40, 4),
    jobTitle: pose(22, 50, 4),
    category: pose(22, 60, 4),
    country: pose(22, 70, 4),
    qr: pose(70, 35, 5),
    sponsors: pose(22, 86, 3),
  },
  compact: {
    eventLogo: pose(30, 4, 2),
    eventName: pose(8, 4, 2),
    name: pose(8, 28, 4),
    company: pose(8, 46, 4),
    jobTitle: pose(8, 56, 4),
    category: pose(8, 66, 4),
    country: pose(8, 76, 4),
    qr: pose(4, 82, 5),
    sponsors: pose(40, 86, 3),
  },
};

export function getLayoutPreset(designId: string): BadgeLayout {
  return LAYOUT_PRESETS[designId] ?? CLASSIC_LAYOUT;
}

export function parseBadgeLayout(
  value: unknown,
  fallback: BadgeLayout = CLASSIC_LAYOUT,
): BadgeLayout {
  if (!value || typeof value !== "object") return { ...fallback };
  const raw = value as Record<string, unknown>;
  const next = { ...fallback };
  for (const id of BADGE_ELEMENT_IDS) {
    if (id in raw) {
      next[id] = parsePose(raw[id], fallback[id]);
    }
  }
  return next;
}

export function moveLayoutElement(
  layout: BadgeLayout,
  id: BadgeElementId,
  x: number,
  y: number,
): BadgeLayout {
  return {
    ...layout,
    [id]: {
      ...layout[id],
      x: clampPct(x),
      y: clampPct(y),
    },
  };
}

export const SNAP_THRESHOLD_PCT = 2;

export type SnapGuideState = {
  vertical: boolean;
  horizontal: boolean;
};

/**
 * Snap so the element's centre lines up with the badge centre (and mid-axes).
 * `widthPct` / `heightPct` are the element size as % of the badge.
 */
export function snapElementPose(
  x: number,
  y: number,
  widthPct: number,
  heightPct: number,
  threshold = SNAP_THRESHOLD_PCT,
): { x: number; y: number; guides: SnapGuideState } {
  const targets = [50];
  let nextX = x;
  let nextY = y;
  let vertical = false;
  let horizontal = false;

  const centerX = x + widthPct / 2;
  for (const t of targets) {
    if (Math.abs(centerX - t) <= threshold) {
      nextX = t - widthPct / 2;
      vertical = true;
      break;
    }
  }

  const centerY = y + heightPct / 2;
  for (const t of targets) {
    if (Math.abs(centerY - t) <= threshold) {
      nextY = t - heightPct / 2;
      horizontal = true;
      break;
    }
  }

  return {
    x: clampPct(nextX),
    y: clampPct(nextY),
    guides: { vertical, horizontal },
  };
}
