import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
}));

import { supabase } from "@/lib/supabase";
import { createEvent, createTeamsMeeting, deleteEvent, listEvents, updateEvent } from "@/repositories/eventRepository";

const from = vi.mocked(supabase.from);
const invoke = vi.mocked(supabase.functions.invoke);

beforeEach(() => {
  from.mockReset();
  invoke.mockReset();
});

describe("listEvents", () => {
  it("lists events ordered by start date", async () => {
    const rows = [{ id: "e1", title: "Reunião" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listEvents();

    expect(from).toHaveBeenCalledWith("events");
    expect(mock.order).toHaveBeenCalledWith("starts_at", { ascending: true });
    expect(result).toEqual(rows);
  });
});

describe("createEvent", () => {
  it("inserts a row into events and returns it", async () => {
    const row = { id: "e1", title: "Reunião de time" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createEvent({
      organizationId: "org-1",
      title: "Reunião de time",
      createdBy: "user-1",
      startsAt: "2026-09-20T10:00:00.000Z",
      endsAt: "2026-09-20T11:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("events");
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        title: "Reunião de time",
        created_by: "user-1",
        starts_at: "2026-09-20T10:00:00.000Z",
        ends_at: "2026-09-20T11:00:00.000Z",
        type: "event",
      }),
    );
    expect(result).toEqual(row);
  });

  it("throws when the insert fails", async () => {
    const mock = createChainableMock({ data: null, error: { message: "invalid range" } });
    from.mockReturnValue(mock as never);

    await expect(
      createEvent({ organizationId: "org-1", title: "x", createdBy: "user-1", startsAt: "a", endsAt: "b" }),
    ).rejects.toThrow("invalid range");
  });
});

describe("updateEvent", () => {
  it("updates only the given event by id, including moving its dates", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await updateEvent("e1", { startsAt: "2026-09-21T10:00:00.000Z", endsAt: "2026-09-21T11:00:00.000Z" });

    expect(from).toHaveBeenCalledWith("events");
    expect(mock.update).toHaveBeenCalledWith({
      starts_at: "2026-09-21T10:00:00.000Z",
      ends_at: "2026-09-21T11:00:00.000Z",
    });
    expect(mock.eq).toHaveBeenCalledWith("id", "e1");
  });
});

describe("deleteEvent", () => {
  it("deletes the event by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await deleteEvent("e1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "e1");
  });
});

describe("createTeamsMeeting", () => {
  it("invokes the ms-meetings Edge Function and returns the updated event", async () => {
    const updated = { id: "e1", teams_meeting_id: "m1", teams_join_url: "https://teams.microsoft.com/x" };
    invoke.mockResolvedValue({ data: updated, error: null });

    const result = await createTeamsMeeting("e1");

    expect(invoke).toHaveBeenCalledWith("ms-meetings", { body: { eventId: "e1" } });
    expect(result).toEqual(updated);
  });

  it("throws when the Edge Function call fails", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "integração desativada" } });

    await expect(createTeamsMeeting("e1")).rejects.toThrow("integração desativada");
  });
});
