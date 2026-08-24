import type { Prisma } from "@prisma/client";

export type CategoryRule = {
  categoryId: string;
  autoAcceptRequests: boolean;
};

export type MeetingCapByCategory = {
  categoryId: string;
  maxConcurrent: number;
};

export type BatchTriggerConfig = {
  profilesThreshold: number | null;
  dailyPreEvent: boolean;
  lastTriggeredAt: string | null;
};

export type MeetingReminderConfig = {
  enabled24h: boolean;
  enabled30min: boolean;
};

export type PostMeetingFollowUpConfig = {
  enabled: boolean;
  pollId: string | null;
};

export type EventOperationsConfig = {
  requestModerationEnabled: boolean;
  categoryRules: CategoryRule[];
  meetingCapsByCategory: MeetingCapByCategory[];
  batchTriggers: BatchTriggerConfig;
  meetingReminders: MeetingReminderConfig;
  postMeetingFollowUp: PostMeetingFollowUpConfig;
};

export const DEFAULT_OPERATIONS_CONFIG: EventOperationsConfig = {
  requestModerationEnabled: false,
  categoryRules: [],
  meetingCapsByCategory: [],
  batchTriggers: {
    profilesThreshold: null,
    dailyPreEvent: false,
    lastTriggeredAt: null,
  },
  meetingReminders: {
    enabled24h: true,
    enabled30min: true,
  },
  postMeetingFollowUp: {
    enabled: false,
    pollId: null,
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseCategoryRules(raw: unknown): CategoryRule[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const obj = asRecord(row);
      if (!obj || typeof obj.categoryId !== "string") return null;
      return {
        categoryId: obj.categoryId,
        autoAcceptRequests: obj.autoAcceptRequests === true,
      };
    })
    .filter((row): row is CategoryRule => row != null);
}

function parseMeetingCaps(raw: unknown): MeetingCapByCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const obj = asRecord(row);
      if (!obj || typeof obj.categoryId !== "string") return null;
      const max = Number(obj.maxConcurrent);
      if (!Number.isInteger(max) || max < 1) return null;
      return { categoryId: obj.categoryId, maxConcurrent: max };
    })
    .filter((row): row is MeetingCapByCategory => row != null);
}

export function parseOperationsConfig(
  raw: Prisma.JsonValue | null | undefined,
): EventOperationsConfig {
  if (raw == null) return { ...DEFAULT_OPERATIONS_CONFIG };
  const obj = asRecord(raw);
  if (!obj) return { ...DEFAULT_OPERATIONS_CONFIG };

  const batch = asRecord(obj.batchTriggers);
  const reminders = asRecord(obj.meetingReminders);
  const followUp = asRecord(obj.postMeetingFollowUp);

  return {
    requestModerationEnabled: obj.requestModerationEnabled === true,
    categoryRules: parseCategoryRules(obj.categoryRules),
    meetingCapsByCategory: parseMeetingCaps(obj.meetingCapsByCategory),
    batchTriggers: {
      profilesThreshold:
        batch && batch.profilesThreshold != null
          ? Number(batch.profilesThreshold) || null
          : null,
      dailyPreEvent: batch?.dailyPreEvent === true,
      lastTriggeredAt:
        typeof batch?.lastTriggeredAt === "string" ? batch.lastTriggeredAt : null,
    },
    meetingReminders: {
      enabled24h: reminders?.enabled24h !== false,
      enabled30min: reminders?.enabled30min !== false,
    },
    postMeetingFollowUp: {
      enabled: followUp?.enabled === true,
      pollId: typeof followUp?.pollId === "string" ? followUp.pollId : null,
    },
  };
}

export function operationsConfigToJson(
  config: EventOperationsConfig,
): Prisma.InputJsonValue {
  return config as unknown as Prisma.InputJsonValue;
}

export function categoryAutoAccepts(
  config: EventOperationsConfig,
  categoryId: string | null | undefined,
): boolean {
  if (!categoryId) return false;
  return config.categoryRules.some(
    (rule) => rule.categoryId === categoryId && rule.autoAcceptRequests,
  );
}

export function maxConcurrentForCategory(
  config: EventOperationsConfig,
  categoryId: string | null | undefined,
): number | null {
  if (!categoryId) return null;
  const cap = config.meetingCapsByCategory.find((row) => row.categoryId === categoryId);
  return cap?.maxConcurrent ?? null;
}
