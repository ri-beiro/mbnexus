import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Idea } from "@/types/database";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({
    profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" },
  }),
}));

vi.mock("@/repositories/ideaRepository", () => ({
  listIdeas: vi.fn(),
  createIdea: vi.fn(),
  updateIdea: vi.fn(),
  listIdeaComments: vi.fn(),
  addIdeaComment: vi.fn(),
  convertIdeaToProject: vi.fn(),
}));

import { Ideas } from "@/pages/Ideas";
import { convertIdeaToProject, createIdea, listIdeas, updateIdea } from "@/repositories/ideaRepository";

const mockListIdeas = vi.mocked(listIdeas);
const mockCreateIdea = vi.mocked(createIdea);
const mockUpdateIdea = vi.mocked(updateIdea);
const mockConvertIdeaToProject = vi.mocked(convertIdeaToProject);

function makeIdea(overrides: Partial<Idea> & { id: string; title: string }): Idea {
  return {
    organization_id: "org-1",
    author_id: "user-1",
    problem: null,
    proposal: null,
    expected_benefit: null,
    area_department_id: null,
    responsible_profile_id: null,
    impact: null,
    effort: null,
    priority: "normal",
    status: "ideia",
    converted_project_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <Ideas />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListIdeas.mockReset();
  mockCreateIdea.mockReset();
  mockUpdateIdea.mockReset();
  mockConvertIdeaToProject.mockReset();
});

describe("Ideas page", () => {
  it("lists ideas with their pipeline stage", async () => {
    mockListIdeas.mockResolvedValue([
      makeIdea({ id: "1", title: "Automatizar relatório", status: "ideia" }),
      makeIdea({ id: "2", title: "Novo onboarding", status: "em_analise" }),
    ]);

    renderPage();

    expect(await screen.findByText("Automatizar relatório")).toBeInTheDocument();
    expect(screen.getByText("Novo onboarding")).toBeInTheDocument();
  });

  it("shows an empty state with no ideas", async () => {
    mockListIdeas.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/nenhuma ideia/i)).toBeInTheDocument();
  });

  it("submits a new idea from the quick-create form", async () => {
    const user = userEvent.setup();
    mockListIdeas.mockResolvedValueOnce([]);
    mockCreateIdea.mockResolvedValue(makeIdea({ id: "new-1", title: "Nova ideia" }));
    mockListIdeas.mockResolvedValueOnce([makeIdea({ id: "new-1", title: "Nova ideia" })]);

    renderPage();
    await screen.findByText(/nenhuma ideia/i);

    await user.type(screen.getByPlaceholderText(/título da ideia/i), "Nova ideia");
    await user.click(screen.getByRole("button", { name: /registrar ideia/i }));

    await waitFor(() =>
      expect(mockCreateIdea).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Nova ideia", organizationId: "org-1", authorId: "user-1" }),
      ),
    );
    expect(await screen.findByText("Nova ideia")).toBeInTheDocument();
  });

  it("advances an idea to the next pipeline stage", async () => {
    const user = userEvent.setup();
    mockListIdeas.mockResolvedValue([makeIdea({ id: "1", title: "Automatizar relatório", status: "ideia" })]);
    mockUpdateIdea.mockResolvedValue(undefined);

    renderPage();
    const row = await screen.findByTestId("idea-row-1");

    await user.click(within(row).getByRole("button", { name: /avançar etapa/i }));

    await waitFor(() => expect(mockUpdateIdea).toHaveBeenCalledWith("1", { status: "em_analise" }));
  });

  it("converts an approved idea into a project", async () => {
    const user = userEvent.setup();
    const idea = makeIdea({ id: "1", title: "Automatizar relatório", status: "aprovada" });
    mockListIdeas.mockResolvedValue([idea]);
    mockConvertIdeaToProject.mockResolvedValue({ id: "p1", name: "Automatizar relatório" } as never);

    renderPage();
    const row = await screen.findByTestId("idea-row-1");

    await user.click(within(row).getByRole("button", { name: /transformar em projeto/i }));

    await waitFor(() => expect(mockConvertIdeaToProject).toHaveBeenCalledWith(idea, "user-1"));
  });

  it("does not offer to convert an idea that is not yet approved", async () => {
    mockListIdeas.mockResolvedValue([makeIdea({ id: "1", title: "Automatizar relatório", status: "ideia" })]);

    renderPage();
    const row = await screen.findByTestId("idea-row-1");

    expect(within(row).queryByRole("button", { name: /transformar em projeto/i })).not.toBeInTheDocument();
  });
});
