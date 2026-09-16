import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Profile, ProjectPhase } from "@/types/database";

vi.mock("@/repositories/projectRepository", () => ({
  listProjectPhases: vi.fn(),
  createProjectPhase: vi.fn(),
  addProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
}));

import { ProjectDetailPanel } from "@/features/projects/ProjectDetailPanel";
import {
  addProjectMember,
  createProjectPhase,
  listProjectPhases,
  removeProjectMember,
} from "@/repositories/projectRepository";

const mockListProjectPhases = vi.mocked(listProjectPhases);
const mockCreateProjectPhase = vi.mocked(createProjectPhase);
const mockAddProjectMember = vi.mocked(addProjectMember);
const mockRemoveProjectMember = vi.mocked(removeProjectMember);

const PROFILES: Profile[] = [
  {
    id: "u1",
    organization_id: "org-1",
    full_name: "Bruno Tavares",
    email: "bruno@mbnexus.dev",
    job_title: null,
    avatar_url: null,
    is_active: true,
    primary_team_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "u2",
    organization_id: "org-1",
    full_name: "Larissa Mendonça",
    email: "larissa@mbnexus.dev",
    job_title: null,
    avatar_url: null,
    is_active: true,
    primary_team_id: null,
    created_at: "",
    updated_at: "",
  },
];

function makePhase(overrides: Partial<ProjectPhase> & { id: string; name: string }): ProjectPhase {
  return { project_id: "p1", position: 0, start_date: null, due_date: null, created_at: "2026-01-01T00:00:00.000Z", ...overrides };
}

function renderPanel(memberIds: string[] = [], computedProgress = 0) {
  return render(
    <ToastProvider>
      <ProjectDetailPanel projectId="p1" profiles={PROFILES} memberIds={memberIds} computedProgress={computedProgress} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListProjectPhases.mockReset();
  mockCreateProjectPhase.mockReset();
  mockAddProjectMember.mockReset();
  mockRemoveProjectMember.mockReset();
});

describe("ProjectDetailPanel", () => {
  it("lists phases once loaded", async () => {
    mockListProjectPhases.mockResolvedValue([makePhase({ id: "ph1", name: "Planejamento" })]);
    renderPanel();
    expect(await screen.findByText("Planejamento")).toBeInTheDocument();
  });

  it("shows the computed progress", async () => {
    mockListProjectPhases.mockResolvedValue([]);
    renderPanel([], 75);
    expect(await screen.findByText("75%")).toBeInTheDocument();
  });

  it("shows member names from the profile list", async () => {
    mockListProjectPhases.mockResolvedValue([]);
    renderPanel(["u1"]);
    expect(await screen.findByText("Bruno Tavares")).toBeInTheDocument();
  });

  it("adds a phase and shows it immediately", async () => {
    const user = userEvent.setup();
    mockListProjectPhases.mockResolvedValue([]);
    mockCreateProjectPhase.mockResolvedValue(makePhase({ id: "ph2", name: "Homologação" }));

    renderPanel();
    await waitFor(() => expect(mockListProjectPhases).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText(/nova fase/i), "Homologação");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(mockCreateProjectPhase).toHaveBeenCalledWith("p1", "Homologação"));
    expect(await screen.findByText("Homologação")).toBeInTheDocument();
  });

  it("adds a member from the picker", async () => {
    const user = userEvent.setup();
    mockListProjectPhases.mockResolvedValue([]);
    mockAddProjectMember.mockResolvedValue(undefined);

    renderPanel(["u1"]);
    await screen.findByText("Bruno Tavares");

    await user.selectOptions(screen.getByLabelText(/adicionar membro/i), "u2");

    await waitFor(() => expect(mockAddProjectMember).toHaveBeenCalledWith("p1", "u2"));
    expect(await screen.findByText("Larissa Mendonça")).toBeInTheDocument();
  });

  it("removes a member when its remove button is clicked", async () => {
    const user = userEvent.setup();
    mockListProjectPhases.mockResolvedValue([]);
    mockRemoveProjectMember.mockResolvedValue(undefined);

    renderPanel(["u1"]);
    await screen.findByText("Bruno Tavares");

    await user.click(screen.getByRole("button", { name: /remover Bruno Tavares/i }));

    await waitFor(() => expect(mockRemoveProjectMember).toHaveBeenCalledWith("p1", "u1"));
    expect(screen.queryByRole("button", { name: /remover Bruno Tavares/i })).not.toBeInTheDocument();
  });
});
