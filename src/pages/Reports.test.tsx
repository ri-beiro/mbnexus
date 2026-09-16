import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types/database";
import type { TaskListRow } from "@/repositories/taskRepository";

vi.mock("@/repositories/taskRepository", () => ({
  listTasks: vi.fn(),
}));

vi.mock("@/repositories/profileRepository", () => ({
  listOrgProfiles: vi.fn(),
}));

vi.mock("@/repositories/hierarchyRepository", () => ({
  listTeamMembers: vi.fn(),
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { Reports } from "@/pages/Reports";
import { listTasks } from "@/repositories/taskRepository";
import { listOrgProfiles } from "@/repositories/profileRepository";
import { listTeamMembers } from "@/repositories/hierarchyRepository";
import { downloadTextFile } from "@/lib/download";

const mockListTasks = vi.mocked(listTasks);
const mockListOrgProfiles = vi.mocked(listOrgProfiles);
const mockListTeamMembers = vi.mocked(listTeamMembers);
const mockDownloadTextFile = vi.mocked(downloadTextFile);

function makeProfile(overrides: Partial<Profile> & { id: string; full_name: string }): Profile {
  return {
    organization_id: "org-1",
    email: "user@mbnexus.dev",
    job_title: null,
    avatar_url: null,
    is_active: true,
    primary_team_id: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskListRow> & { id: string; title: string; assigneeIds: string[] }): TaskListRow {
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
    ...overrides,
  };
}

function renderPage() {
  return render(<Reports />);
}

beforeEach(() => {
  mockListTasks.mockReset();
  mockListOrgProfiles.mockReset();
  mockListTeamMembers.mockReset();
  mockDownloadTextFile.mockReset();
});

describe("Reports page", () => {
  it("shows one row per team member with their completion rate", async () => {
    mockListOrgProfiles.mockResolvedValue([makeProfile({ id: "u1", full_name: "João Pedro Silva" })]);
    mockListTeamMembers.mockResolvedValue([{ id: "tm1", team_id: "t1", profile_id: "u1", is_primary: true, joined_at: "" }]);
    mockListTasks.mockResolvedValue([
      makeTask({ id: "1", title: "A", assigneeIds: ["u1"], status: "concluido" }),
      makeTask({ id: "2", title: "B", assigneeIds: ["u1"], status: "a_fazer" }),
    ]);

    renderPage();

    const row = await screen.findByTestId("report-row-u1");
    expect(within(row).getByText("João Pedro Silva")).toBeInTheDocument();
    expect(within(row).getByText("50%")).toBeInTheDocument();
  });

  it("exports the report as CSV with the right content", async () => {
    const user = userEvent.setup();
    mockListOrgProfiles.mockResolvedValue([makeProfile({ id: "u1", full_name: "João Pedro Silva" })]);
    mockListTeamMembers.mockResolvedValue([{ id: "tm1", team_id: "t1", profile_id: "u1", is_primary: true, joined_at: "" }]);
    mockListTasks.mockResolvedValue([makeTask({ id: "1", title: "A", assigneeIds: ["u1"], status: "concluido" })]);

    renderPage();
    await screen.findByTestId("report-row-u1");

    await user.click(screen.getByRole("button", { name: /exportar csv/i }));

    expect(mockDownloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, csv] = mockDownloadTextFile.mock.calls[0];
    expect(filename).toMatch(/\.csv$/);
    expect(csv).toContain("João Pedro Silva");
    expect(csv).toContain("100"); // completion rate
  });
});
