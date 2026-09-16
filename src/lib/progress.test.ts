import { describe, expect, it } from "vitest";
import { percentageComplete } from "@/lib/progress";

describe("percentageComplete", () => {
  it("returns null for an empty list (caller keeps its own value)", () => {
    expect(percentageComplete([], (x: { done: boolean }) => x.done)).toBeNull();
  });

  it("computes the rounded percentage of items matching the predicate", () => {
    const items = [{ done: true }, { done: true }, { done: true }, { done: false }];
    expect(percentageComplete(items, (x) => x.done)).toBe(75);
  });

  it("returns 100 when every item matches", () => {
    expect(percentageComplete([{ done: true }, { done: true }], (x) => x.done)).toBe(100);
  });

  it("returns 0 when no item matches", () => {
    expect(percentageComplete([{ done: false }, { done: false }], (x) => x.done)).toBe(0);
  });

  it("rounds to the nearest whole percentage", () => {
    const items = [{ done: true }, { done: false }, { done: false }];
    expect(percentageComplete(items, (x) => x.done)).toBe(33);
  });
});
