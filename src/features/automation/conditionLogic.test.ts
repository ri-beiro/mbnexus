import { describe, expect, it } from "vitest";
import { evaluateAutomationCondition, type AutomationTaskContext } from "@/features/automation/conditionLogic";

const baseTask: AutomationTaskContext = {
  due_date: null,
  status: "in_progress",
  priority: "medium",
  subtasks_total: 0,
  subtasks_done: 0,
};

describe("evaluateAutomationCondition", () => {
  describe("task.due_soon", () => {
    it("matches when the due date falls within the default 3-day window", () => {
      const task = { ...baseTask, due_date: "2026-09-18" };
      expect(evaluateAutomationCondition("task.due_soon", {}, task, "2026-09-16")).toBe(true);
    });

    it("does not match when the due date is further out than the configured window", () => {
      const task = { ...baseTask, due_date: "2026-09-25" };
      expect(evaluateAutomationCondition("task.due_soon", { days_before: 3 }, task, "2026-09-16")).toBe(false);
    });

    it("respects a custom days_before window", () => {
      const task = { ...baseTask, due_date: "2026-09-25" };
      expect(evaluateAutomationCondition("task.due_soon", { days_before: 10 }, task, "2026-09-16")).toBe(true);
    });

    it("does not match a task with no due date", () => {
      expect(evaluateAutomationCondition("task.due_soon", {}, baseTask, "2026-09-16")).toBe(false);
    });

    it("does not match a task that is already done", () => {
      const task = { ...baseTask, due_date: "2026-09-17", status: "done" };
      expect(evaluateAutomationCondition("task.due_soon", {}, task, "2026-09-16")).toBe(false);
    });

    it("does not match a task that is already overdue", () => {
      const task = { ...baseTask, due_date: "2026-09-10" };
      expect(evaluateAutomationCondition("task.due_soon", {}, task, "2026-09-16")).toBe(false);
    });
  });

  describe("task.overdue", () => {
    it("matches when the due date is in the past and the task isn't done", () => {
      const task = { ...baseTask, due_date: "2026-09-10" };
      expect(evaluateAutomationCondition("task.overdue", {}, task, "2026-09-16")).toBe(true);
    });

    it("does not match when the due date is today or in the future", () => {
      const task = { ...baseTask, due_date: "2026-09-16" };
      expect(evaluateAutomationCondition("task.overdue", {}, task, "2026-09-16")).toBe(false);
    });

    it("does not match a done task even if its due date has passed", () => {
      const task = { ...baseTask, due_date: "2026-09-10", status: "done" };
      expect(evaluateAutomationCondition("task.overdue", {}, task, "2026-09-16")).toBe(false);
    });

    it("respects a min_days_overdue threshold", () => {
      const task = { ...baseTask, due_date: "2026-09-14" };
      expect(evaluateAutomationCondition("task.overdue", { min_days_overdue: 5 }, task, "2026-09-16")).toBe(false);
      expect(evaluateAutomationCondition("task.overdue", { min_days_overdue: 2 }, task, "2026-09-16")).toBe(true);
    });
  });

  describe("subtasks.completed", () => {
    it("matches when there are subtasks and all are done", () => {
      const task = { ...baseTask, subtasks_total: 3, subtasks_done: 3 };
      expect(evaluateAutomationCondition("subtasks.completed", {}, task, "2026-09-16")).toBe(true);
    });

    it("does not match when some subtasks remain open", () => {
      const task = { ...baseTask, subtasks_total: 3, subtasks_done: 2 };
      expect(evaluateAutomationCondition("subtasks.completed", {}, task, "2026-09-16")).toBe(false);
    });

    it("does not match a task with no subtasks at all", () => {
      expect(evaluateAutomationCondition("subtasks.completed", {}, baseTask, "2026-09-16")).toBe(false);
    });
  });

  describe("common filters", () => {
    it("applies an optional status filter on top of the trigger check", () => {
      const task = { ...baseTask, due_date: "2026-09-10", status: "blocked" };
      expect(evaluateAutomationCondition("task.overdue", { status: "blocked" }, task, "2026-09-16")).toBe(true);
      expect(evaluateAutomationCondition("task.overdue", { status: "in_progress" }, task, "2026-09-16")).toBe(false);
    });

    it("applies an optional priority filter on top of the trigger check", () => {
      const task = { ...baseTask, due_date: "2026-09-10", priority: "high" };
      expect(evaluateAutomationCondition("task.overdue", { priority: "high" }, task, "2026-09-16")).toBe(true);
      expect(evaluateAutomationCondition("task.overdue", { priority: "low" }, task, "2026-09-16")).toBe(false);
    });
  });

  it("returns false for an unrecognized trigger event", () => {
    expect(evaluateAutomationCondition("something.unknown", {}, baseTask, "2026-09-16")).toBe(false);
  });
});
