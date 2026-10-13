import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types/database";

vi.mock("@/repositories/hierarchyRepository", () => ({
  listTeams: vi.fn(),
  listDepartments: vi.fn(),
  listManagementUnits: vi.fn(),
}));
vi.mock("@/repositories/profileRepository", () => ({
  getProfile: vi.fn(),
}));

import { ProfileHoverCard, type HoverableProfile } from "@/features/profile/ProfileHoverCard";
import { resetOrgHierarchySnapshotCache } from "@/features/profile/orgContext";
import { listDepartments, listManagementUnits, listTeams } from "@/repositories/hierarchyRepository";
import { getProfile } from "@/repositories/profileRepository";

const mockListTeams = vi.mocked(listTeams);
const mockListDepartments = vi.mocked(listDepartments);
const mockListManagementUnits = vi.mocked(listManagementUnits);
const mockGetProfile = vi.mocked(getProfile);

function makeProfile(overrides: Partial<HoverableProfile> = {}): HoverableProfile {
  return {
    id: "user-1",
    full_name: "Ana Teste",
    email: "ana@mbnexus.dev",
    job_title: "Gerente de Projetos",
    avatar_url: null,
    teams_url: null,
    whatsapp_number: null,
    primary_team_id: null,
    ...overrides,
  };
}

function renderCard(profile: HoverableProfile) {
  return render(
    <ProfileHoverCard profile={profile}>
      <button type="button">trigger</button>
    </ProfileHoverCard>,
  );
}

beforeEach(() => {
  resetOrgHierarchySnapshotCache();
  mockListTeams.mockReset().mockResolvedValue([]);
  mockListDepartments.mockReset().mockResolvedValue([]);
  mockListManagementUnits.mockReset().mockResolvedValue([]);
  mockGetProfile.mockReset();
});

describe("ProfileHoverCard", () => {
  it("shows the person's name, role and email on hover", async () => {
    const user = userEvent.setup();
    renderCard(makeProfile());

    await user.hover(screen.getByRole("button", { name: "trigger" }));

    expect(await screen.findByText("Ana Teste")).toBeInTheDocument();
    expect(screen.getByText("Gerente de Projetos")).toBeInTheDocument();
    expect(screen.getByText("ana@mbnexus.dev")).toBeInTheDocument();
  });

  it("shows Teams and WhatsApp links when set", async () => {
    const user = userEvent.setup();
    renderCard(makeProfile({ teams_url: "https://teams.microsoft.com/l/x", whatsapp_number: "+55 11 99999-0000" }));

    await user.hover(screen.getByRole("button", { name: "trigger" }));

    const teamsLink = await screen.findByRole("link", { name: /teams/i });
    expect(teamsLink).toHaveAttribute("href", "https://teams.microsoft.com/l/x");
    const waLink = screen.getByRole("link", { name: /whatsapp/i });
    expect(waLink).toHaveAttribute("href", "https://wa.me/5511999990000");
  });

  it("does not show the contact row when neither Teams nor WhatsApp is set", async () => {
    const user = userEvent.setup();
    renderCard(makeProfile());

    await user.hover(screen.getByRole("button", { name: "trigger" }));

    await screen.findByText("Ana Teste");
    expect(screen.queryByRole("link", { name: /teams/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
  });

  it("shows the CD and who the person reports to, resolved from the org hierarchy", async () => {
    const user = userEvent.setup();
    mockListTeams.mockResolvedValue([
      { id: "team-1", organization_id: "org-1", department_id: "dept-1", name: "Equipe ADM", description: null, leader_profile_id: "leader-1", is_active: true, created_at: "", updated_at: "" },
    ]);
    mockListDepartments.mockResolvedValue([
      { id: "dept-1", organization_id: "org-1", management_unit_id: "mu-1", name: "Transportes", description: null, coordinator_profile_id: null, is_active: true, created_at: "", updated_at: "" },
    ]);
    mockListManagementUnits.mockResolvedValue([
      { id: "mu-1", organization_id: "org-1", name: "CD Food Town", description: null, manager_profile_id: null, is_active: true, created_at: "", updated_at: "" },
    ]);
    mockGetProfile.mockResolvedValue({ id: "leader-1", full_name: "Carlos Líder" } as Profile);

    renderCard(makeProfile({ id: "member-1", primary_team_id: "team-1" }));
    await user.hover(screen.getByRole("button", { name: "trigger" }));

    expect(await screen.findByText("CD Food Town")).toBeInTheDocument();
    expect(await screen.findByText(/responde a carlos líder/i)).toBeInTheDocument();
  });
});
