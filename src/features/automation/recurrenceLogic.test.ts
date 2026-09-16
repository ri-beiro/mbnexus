import { describe, expect, it } from "vitest";
import { computeNextOccurrence, RECURRENCE_PRESETS } from "@/features/automation/recurrenceLogic";

describe("computeNextOccurrence", () => {
  it("returns the following day for a daily rule", () => {
    expect(computeNextOccurrence("daily", "2026-09-15")).toBe("2026-09-16");
  });

  it("returns the date N days out for an interval rule", () => {
    expect(computeNextOccurrence("interval:5d", "2026-09-15")).toBe("2026-09-20");
  });

  it("finds the next matching weekday for a weekly rule", () => {
    // 2026-09-15 is a Tuesday; next Monday or Wednesday should be Wednesday (+1 day).
    expect(computeNextOccurrence("weekly:MON,WED,FRI", "2026-09-15")).toBe("2026-09-16");
  });

  it("wraps to next week when no matching weekday remains this week", () => {
    // 2026-09-15 is a Tuesday; only Monday configured means next Monday, 6 days out.
    expect(computeNextOccurrence("weekly:MON", "2026-09-15")).toBe("2026-09-21");
  });

  it("finds the same day next month for a monthly rule when the day hasn't passed", () => {
    expect(computeNextOccurrence("monthly:20", "2026-09-15")).toBe("2026-09-20");
  });

  it("rolls over to next month when the day of month has already passed", () => {
    expect(computeNextOccurrence("monthly:10", "2026-09-15")).toBe("2026-10-10");
  });

  it("finds the same date next year for a yearly rule when it hasn't passed this year", () => {
    expect(computeNextOccurrence("yearly:12-25", "2026-09-15")).toBe("2026-12-25");
  });

  it("rolls over to next year when the date has already passed", () => {
    expect(computeNextOccurrence("yearly:01-01", "2026-09-15")).toBe("2027-01-01");
  });

  it("returns null for an unrecognized rule", () => {
    expect(computeNextOccurrence("nonsense", "2026-09-15")).toBeNull();
  });

  it("returns null for null/empty input", () => {
    expect(computeNextOccurrence(null, "2026-09-15")).toBeNull();
    expect(computeNextOccurrence("", "2026-09-15")).toBeNull();
  });

  it("exposes a small set of human-friendly presets", () => {
    expect(RECURRENCE_PRESETS.map((p) => p.rule)).toContain("daily");
    expect(RECURRENCE_PRESETS.every((p) => p.label.length > 0)).toBe(true);
  });
});
