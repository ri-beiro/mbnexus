import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import {
  createAutomation,
  deleteAutomation,
  listAutomations,
  updateAutomation,
} from "@/repositories/automationRepository";

const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("listAutomations", () => {
  it("lists automations ordered by name", async () => {
    const rows = [{ id: "a1", name: "Alerta de atraso" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listAutomations();

    expect(from).toHaveBeenCalledWith("automations");
    expect(mock.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("throws when the query fails", async () => {
    const mock = createChainableMock({ data: null, error: { message: "boom" } });
    from.mockReturnValue(mock as never);

    await expect(listAutomations()).rejects.toThrow("boom");
  });
});

describe("createAutomation", () => {
  it("inserts a new automation row and returns it", async () => {
    const row = { id: "a1", name: "Alerta de atraso" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createAutomation({
      organizationId: "org-1",
      name: "Alerta de atraso",
      triggerEvent: "task.overdue",
      createdBy: "user-1",
    });

    expect(from).toHaveBeenCalledWith("automations");
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        name: "Alerta de atraso",
        trigger_event: "task.overdue",
        created_by: "user-1",
        condition: {},
        action: {},
        is_active: true,
      }),
    );
    expect(result).toEqual(row);
  });
});

describe("updateAutomation", () => {
  it("updates only the given automation by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await updateAutomation("a1", { isActive: false, condition: { days_before: 5 } });

    expect(from).toHaveBeenCalledWith("automations");
    expect(mock.update).toHaveBeenCalledWith({ is_active: false, condition: { days_before: 5 } });
    expect(mock.eq).toHaveBeenCalledWith("id", "a1");
  });
});

describe("deleteAutomation", () => {
  it("deletes the automation by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await deleteAutomation("a1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "a1");
  });
});
