import { describe, expect, it } from "vitest";
import {
  parseOperationsConfig,
  categoryAutoAccepts,
  maxConcurrentForCategory,
  DEFAULT_OPERATIONS_CONFIG,
} from "@/modules/events/operations-config";

describe("operations config", () => {
  it("returns defaults for null config", () => {
    const config = parseOperationsConfig(null);
    expect(config.requestModerationEnabled).toBe(false);
    expect(config.meetingReminders.enabled24h).toBe(true);
  });

  it("parses category rules and caps", () => {
    const config = parseOperationsConfig({
      requestModerationEnabled: true,
      categoryRules: [{ categoryId: "cat1", autoAcceptRequests: true }],
      meetingCapsByCategory: [{ categoryId: "cat1", maxConcurrent: 2 }],
    });
    expect(config.requestModerationEnabled).toBe(true);
    expect(categoryAutoAccepts(config, "cat1")).toBe(true);
    expect(maxConcurrentForCategory(config, "cat1")).toBe(2);
  });

  it("merges partial config with defaults", () => {
    const config = parseOperationsConfig({ meetingReminders: { enabled30min: false } });
    expect(config.meetingReminders.enabled30min).toBe(false);
    expect(config.meetingReminders.enabled24h).toBe(true);
    expect(config.batchTriggers).toEqual(DEFAULT_OPERATIONS_CONFIG.batchTriggers);
  });
});
