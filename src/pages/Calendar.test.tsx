import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { TaskListRow } from "@/repositories/taskRepository";
import type { Event } from "@/types/database";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({
    profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" },
    hasPermission: () => true,
  }),
}));

vi.mock("@/repositories/taskRepository", () => ({
  listTasks: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("@/repositories/eventRepository", () => ({
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

import { Calendar } from "@/pages/Calendar";
import { listTasks, updateTask } from "@/repositories/taskRepository";
import { createEvent, listEvents, updateEvent } from "@/repositories/eventRepository";

const mockListTasks = vi.mocked(listTasks);
const mockUpdateTask = vi.mocked(updateTask);
const mockListEvents = vi.mocked(listEvents);
const mockCreateEvent = vi.mocked(createEvent);
const mockUpdateEvent = vi.mocked(updateEvent);

function makeTask(overrides: Partial<TaskListRow> & { id: string; title: string }): TaskListRow {
  return {
    organization_id: "org-1",
    project_id: null,
    phase_id: null,
    parent_task_id: null,
    team_id: null,
    description: null,
    status: "a_fazer",
    priority: "normal",
    start_date: null,
    due_date: null,
    estimate_minutes: null,
    progress: 0,
    recurrence_rule: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    project_name: null,
    assigneeIds: [],
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> & { id: string; title: string }): Event {
  return {
    organization_id: "org-1",
    description: null,
    type: "event",
    starts_at: "2026-09-20T10:00:00.000Z",
    ends_at: "2026-09-20T11:00:00.000Z",
    location: null,
    project_id: null,
    task_id: null,
    created_by: "user-1",
    teams_meeting_id: null,
    teams_join_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <Calendar />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListTasks.mockReset();
  mockUpdateTask.mockReset();
  mockListEvents.mockReset();
  mockCreateEvent.mockReset();
  mockUpdateEvent.mockReset();
});

describe("Calendar page", () => {
  it("shows tasks and events on their due/start date", async () => {
    mockListTasks.mockResolvedValue([makeTask({ id: "t1", title: "Entregar relatório", due_date: "2026-09-20" })]);
    mockListEvents.mockResolvedValue([makeEvent({ id: "e1", title: "Reunião de time", starts_at: "2026-09-21T10:00:00.000Z" })]);

    renderPage();

    const day20 = await screen.findByTestId("calendar-day-2026-09-20");
    expect(within(day20).getByText("Entregar relatório")).toBeInTheDocument();
    const day21 = screen.getByTestId("calendar-day-2026-09-21");
    expect(within(day21).getByText("Reunião de time")).toBeInTheDocument();
  });

  it("creates an event from the quick-create form", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([]);
    mockListEvents.mockResolvedValueOnce([]);
    mockCreateEvent.mockResolvedValue(makeEvent({ id: "new-1", title: "Novo evento" }));
    mockListEvents.mockResolvedValueOnce([makeEvent({ id: "new-1", title: "Novo evento" })]);

    renderPage();
    await waitFor(() => expect(mockListEvents).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText(/novo evento/i), "Novo evento");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Novo evento", organizationId: "org-1", createdBy: "user-1" }),
      ),
    );
  });

  it("moving a task's date updates the task, not an event", async () => {
    mockListTasks.mockResolvedValue([makeTask({ id: "t1", title: "Entregar relatório", due_date: "2026-09-20" })]);
    mockListEvents.mockResolvedValue([]);
    mockUpdateTask.mockResolvedValue(undefined);

    renderPage();
    const input = await screen.findByLabelText(/alterar data de entregar relatório/i);

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(input, { target: { value: "2026-09-25" } });

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith("t1", { dueDate: "2026-09-25" }));
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it("moving an event's date updates the event, not a task", async () => {
    mockListTasks.mockResolvedValue([]);
    mockListEvents.mockResolvedValue([makeEvent({ id: "e1", title: "Reunião de time", starts_at: "2026-09-20T10:00:00.000Z" })]);
    mockUpdateEvent.mockResolvedValue(undefined);

    renderPage();
    const input = await screen.findByLabelText(/alterar data de reunião de time/i);

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(input, { target: { value: "2026-09-25" } });

    await waitFor(() =>
      expect(mockUpdateEvent).toHaveBeenCalledWith("e1", { startsAt: "2026-09-25T10:00:00.000Z", endsAt: "2026-09-25T11:00:00.000Z" }),
    );
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });
});
