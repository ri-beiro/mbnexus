import { describe, expect, it } from "vitest";
import { buildTimelineDays, computeBarStyle, resolveTimelineRange } from "@/features/gantt/ganttLogic";

describe("resolveTimelineRange", () => {
  it("returns null for an empty task list", () => {
    expect(resolveTimelineRange([])).toBeNull();
  });

  it("returns null when no task has a due date", () => {
    expect(resolveTimelineRange([{ start_date: null, due_date: null }])).toBeNull();
  });

  it("spans from the earliest start (or due, if no start) to the latest due date, with a day of padding on each side", () => {
    const range = resolveTimelineRange([
      { start_date: "2026-09-05", due_date: "2026-09-10" },
      { start_date: null, due_date: "2026-09-20" },
    ]);
    expect(range).toEqual({ start: "2026-09-04", end: "2026-09-21" });
  });
});

describe("buildTimelineDays", () => {
  it("returns every day in the inclusive range", () => {
    expect(buildTimelineDays("2026-09-01", "2026-09-04")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ]);
  });

  it("returns a single day when start equals end", () => {
    expect(buildTimelineDays("2026-09-01", "2026-09-01")).toEqual(["2026-09-01"]);
  });
});

describe("computeBarStyle", () => {
  const timelineStart = "2026-09-01";
  const dayWidth = 24;

  it("returns null when the task has no due date (nothing to anchor a bar to)", () => {
    expect(computeBarStyle({ start_date: "2026-09-02", due_date: null }, timelineStart, dayWidth)).toBeNull();
  });

  it("positions a multi-day bar from start_date to due_date", () => {
    const style = computeBarStyle({ start_date: "2026-09-03", due_date: "2026-09-05" }, timelineStart, dayWidth);
    // 2 days after timeline start -> left = 2 * dayWidth; spans 3 days inclusive -> width = 3 * dayWidth
    expect(style).toEqual({ leftPx: 48, widthPx: 72 });
  });

  it("treats a missing start_date as a single-day bar on the due date", () => {
    const style = computeBarStyle({ start_date: null, due_date: "2026-09-01" }, timelineStart, dayWidth);
    expect(style).toEqual({ leftPx: 0, widthPx: 24 });
  });
});
