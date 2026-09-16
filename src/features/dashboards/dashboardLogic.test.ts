import { describe, expect, it } from "vitest";
import { countByKey } from "@/features/dashboards/dashboardLogic";

describe("countByKey", () => {
  it("counts items into every ordered key, even ones with zero matches", () => {
    const items = [{ status: "a" }, { status: "a" }, { status: "b" }];
    const result = countByKey(items, (i) => i.status, ["a", "b", "c"] as const, (k) => k.toUpperCase());
    expect(result).toEqual([
      { label: "A", value: 2 },
      { label: "B", value: 1 },
      { label: "C", value: 0 },
    ]);
  });

  it("returns all-zero counts for an empty list", () => {
    const result = countByKey<{ status: "a" | "b" }, "a" | "b">([], (i) => i.status, ["a", "b"], (k) => k);
    expect(result).toEqual([
      { label: "a", value: 0 },
      { label: "b", value: 0 },
    ]);
  });

  it("preserves the given key order regardless of input order", () => {
    const items = [{ status: "b" }, { status: "a" }];
    const result = countByKey(items, (i) => i.status, ["a", "b"] as const, (k) => k);
    expect(result.map((r) => r.label)).toEqual(["a", "b"]);
  });
});
