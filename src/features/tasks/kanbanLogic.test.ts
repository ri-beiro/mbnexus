import { describe, expect, it } from "vitest";
import {
  computeBoardPosition,
  groupTasksByStatus,
  moveTaskToStatus,
  sortTasksByBoardPosition,
} from "@/features/tasks/kanbanLogic";
import { STATUS_ORDER } from "@/features/tasks/taskLabels";
import type { TaskStatus } from "@/types/database";

interface MiniTask {
  id: string;
  status: TaskStatus;
}

describe("groupTasksByStatus", () => {
  it("returns every status as a key, even with no tasks", () => {
    const groups = groupTasksByStatus<MiniTask>([]);
    expect(Object.keys(groups).sort()).toEqual([...STATUS_ORDER].sort());
    for (const status of STATUS_ORDER) {
      expect(groups[status]).toEqual([]);
    }
  });

  it("buckets each task under its own status", () => {
    const tasks: MiniTask[] = [
      { id: "1", status: "a_fazer" },
      { id: "2", status: "em_andamento" },
      { id: "3", status: "a_fazer" },
    ];
    const groups = groupTasksByStatus(tasks);
    expect(groups.a_fazer.map((t) => t.id)).toEqual(["1", "3"]);
    expect(groups.em_andamento.map((t) => t.id)).toEqual(["2"]);
    expect(groups.backlog).toEqual([]);
  });

  it("preserves the input order within each column", () => {
    const tasks: MiniTask[] = [
      { id: "b", status: "a_fazer" },
      { id: "a", status: "a_fazer" },
    ];
    expect(groupTasksByStatus(tasks).a_fazer.map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("moveTaskToStatus", () => {
  const tasks: MiniTask[] = [
    { id: "1", status: "backlog" },
    { id: "2", status: "a_fazer" },
  ];

  it("changes only the matching task's status", () => {
    const result = moveTaskToStatus(tasks, "1", "em_andamento");
    expect(result.find((t) => t.id === "1")?.status).toBe("em_andamento");
    expect(result.find((t) => t.id === "2")?.status).toBe("a_fazer");
  });

  it("does not mutate the input array", () => {
    const original = tasks.map((t) => ({ ...t }));
    moveTaskToStatus(tasks, "1", "concluido");
    expect(tasks).toEqual(original);
  });

  it("is a no-op when the task id is not found", () => {
    const result = moveTaskToStatus(tasks, "missing", "concluido");
    expect(result).toEqual(tasks);
  });
});

describe("sortTasksByBoardPosition", () => {
  it("sorts ascending by board_position", () => {
    const late = { id: "late", board_position: 2000 };
    const early = { id: "early", board_position: 1000 };
    expect(sortTasksByBoardPosition([late, early])).toEqual([early, late]);
  });

  it("places tasks with no position after every positioned task", () => {
    const positioned = { id: "positioned", board_position: 1000 };
    const unpositioned = { id: "unpositioned", board_position: null };
    expect(sortTasksByBoardPosition([unpositioned, positioned])).toEqual([positioned, unpositioned]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { id: "b", board_position: 2000 },
      { id: "a", board_position: 1000 },
    ];
    const original = [...input];
    sortTasksByBoardPosition(input);
    expect(input).toEqual(original);
  });
});

describe("computeBoardPosition", () => {
  it("returns a default position for the first card in an empty column", () => {
    expect(computeBoardPosition(null, null)).toBe(1000);
  });

  it("returns a position below the single card when dropped at the end", () => {
    expect(computeBoardPosition(1000, null)).toBe(2000);
  });

  it("returns a position above the single card when dropped at the start", () => {
    expect(computeBoardPosition(null, 1000)).toBe(0);
  });

  it("returns the midpoint when dropped between two cards", () => {
    expect(computeBoardPosition(1000, 2000)).toBe(1500);
  });
});
