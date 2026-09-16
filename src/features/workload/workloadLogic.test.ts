import { describe, expect, it } from "vitest";
import {
  classifyWorkload,
  computeWorkloadMinutes,
  computeWorkloadPercent,
  DEFAULT_ESTIMATE_MINUTES,
  WEEKLY_CAPACITY_MINUTES,
} from "@/features/workload/workloadLogic";
import type { TaskStatus } from "@/types/database";

interface MiniTask {
  status: TaskStatus;
  estimate_minutes: number | null;
}

describe("computeWorkloadMinutes", () => {
  it("sums the estimate of open (non-concluido) tasks", () => {
    const tasks: MiniTask[] = [
      { status: "a_fazer", estimate_minutes: 120 },
      { status: "em_andamento", estimate_minutes: 60 },
    ];
    expect(computeWorkloadMinutes(tasks)).toBe(180);
  });

  it("excludes completed tasks", () => {
    const tasks: MiniTask[] = [{ status: "concluido", estimate_minutes: 600 }];
    expect(computeWorkloadMinutes(tasks)).toBe(0);
  });

  it("falls back to a default estimate for a task with no estimate set", () => {
    const tasks: MiniTask[] = [{ status: "a_fazer", estimate_minutes: null }];
    expect(computeWorkloadMinutes(tasks)).toBe(DEFAULT_ESTIMATE_MINUTES);
  });

  it("returns 0 for an empty list", () => {
    expect(computeWorkloadMinutes([])).toBe(0);
  });
});

describe("computeWorkloadPercent", () => {
  it("expresses minutes as a percentage of weekly capacity, rounded", () => {
    expect(computeWorkloadPercent(WEEKLY_CAPACITY_MINUTES / 2, WEEKLY_CAPACITY_MINUTES)).toBe(50);
  });

  it("can exceed 100% when overloaded", () => {
    expect(computeWorkloadPercent(WEEKLY_CAPACITY_MINUTES * 1.5, WEEKLY_CAPACITY_MINUTES)).toBe(150);
  });
});

describe("classifyWorkload", () => {
  it("classifies under 50% as baixa", () => {
    expect(classifyWorkload(0)).toBe("baixa");
    expect(classifyWorkload(49)).toBe("baixa");
  });

  it("classifies 50-84% as normal", () => {
    expect(classifyWorkload(50)).toBe("normal");
    expect(classifyWorkload(84)).toBe("normal");
  });

  it("classifies 85-110% as elevada", () => {
    expect(classifyWorkload(85)).toBe("elevada");
    expect(classifyWorkload(110)).toBe("elevada");
  });

  it("classifies over 110% as sobrecarga", () => {
    expect(classifyWorkload(111)).toBe("sobrecarga");
    expect(classifyWorkload(200)).toBe("sobrecarga");
  });
});
