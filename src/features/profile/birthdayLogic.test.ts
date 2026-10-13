import { describe, expect, it } from "vitest";
import { isBirthdayToday } from "@/features/profile/birthdayLogic";

describe("isBirthdayToday", () => {
  it("returns true when month and day match today, regardless of year", () => {
    expect(isBirthdayToday("1990-05-20", new Date("2026-05-20T09:00:00Z"))).toBe(true);
  });

  it("returns false when the day differs", () => {
    expect(isBirthdayToday("1990-05-21", new Date("2026-05-20T09:00:00Z"))).toBe(false);
  });

  it("returns false when the month differs", () => {
    expect(isBirthdayToday("1990-06-20", new Date("2026-05-20T09:00:00Z"))).toBe(false);
  });

  it("returns false for a null birthday", () => {
    expect(isBirthdayToday(null, new Date("2026-05-20T09:00:00Z"))).toBe(false);
  });
});
