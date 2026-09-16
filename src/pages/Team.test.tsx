import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile, Team, TeamMember } from "@/types/database";
import type { TaskListRow } from "@/repositories/taskRepository";

vi.mock("@/repositories/taskRepository", () => ({
  listTasks: vi.fn(),
}));

vi.mock("@/repositories/profileRepository", () => ({
  listOrgProfiles: vi.fn(),
}));

vi.mock("@/repositories/hierarchyRepository", () => ({
  listTeams: vi.fn(),
  listTeamMembers: vi.fn(),
}));

import { Team as TeamPage } from "@/pages/Team";
import { listTasks } from "@/repositories/taskRepository";
import { listOrgProfiles } from "@/repositories/profileRepository";
import { listTeamMembers, listTeams } from "@/repositories/hierarchyRepository";

const mockListTasks = vi.mocked(listTasks);
const mockListOrgProfiles = vi.mocked(listOrgProfiles);
const mockListTeams = vi.mocked(listTeams);
const mockListTeamMembers = vi.mocked(listTeamMembers);

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

function makeTeam(overrides: Partial<Team> & { id: string; name: string }): Team {
  return {
    organization_id: "org-1",
    department_id: "dept-1",
    description: null,
    leader_profile_id: null,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeTeamMember(teamId: string, profileId: string): TeamMember {
  return { id: `${teamId}-${profileId}`, team_id: teamId, profile_id: profileId, is_primary: true, joined_at: "" };
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
  return render(<TeamPage />);
}

beforeEach(() => {
  mockListTasks.mockReset();
  mockListOrgProfiles.mockReset();
  mockListTeams.mockReset();
  mockListTeamMembers.mockReset();
});

describe("Team page", () => {
  it("shows each member with their team and open task count", async () => {
    mockListOrgProfiles.mockResolvedValue([makeProfile({ id: "u1", full_name: "João Pedro Silva" })]);
    mockListTeams.mockResolvedValue([makeTeam({ id: "t1", name: "Equipe Desenvolvimento" })]);
    mockListTeamMembers.mockResolvedValue([makeTeamMember("t1", "u1")]);
    mockListTasks.mockResolvedValue([
      makeTask({ id: "1", title: "Tarefa 1", assigneeIds: ["u1"], status: "a_fazer" }),
      makeTask({ id: "2", title: "Tarefa 2", assigneeIds: ["u1"], status: "concluido" }),
    ]);

    renderPage();

    expect(await screen.findByText("João Pedro Silva")).toBeInTheDocument();
    expect(screen.getByText("Equipe Desenvolvimento")).toBeInTheDocument();
    const row = screen.getByTestId("team-row-u1");
    expect(row.textContent).toMatch(/1/); // 1 open task
  });

  it("shows an empty state when the team has no members", async () => {
    mockListOrgProfiles.mockResolvedValue([]);
    mockListTeams.mockResolvedValue([]);
    mockListTeamMembers.mockResolvedValue([]);
    mockListTasks.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(/nenhum membro/i)).toBeInTheDocument();
  });

  it("flags an overloaded member with the sobrecarga level", async () => {
    mockListOrgProfiles.mockResolvedValue([makeProfile({ id: "u1", full_name: "Maria Fernanda Alves" })]);
    mockListTeams.mockResolvedValue([makeTeam({ id: "t1", name: "Equipe Suporte" })]);
    mockListTeamMembers.mockResolvedValue([makeTeamMember("t1", "u1")]);
    // 30 open tasks at the 120-minute default estimate = 3600 minutes,
    // well over the 2400-minute weekly capacity.
    mockListTasks.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) =>
        makeTask({ id: `t${i}`, title: `Tarefa ${i}`, assigneeIds: ["u1"], status: "a_fazer" }),
      ),
    );

    renderPage();

    const row = await screen.findByTestId("team-row-u1");
    expect(within(row).getByText(/sobrecarga/i)).toBeInTheDocument();
  });
});
