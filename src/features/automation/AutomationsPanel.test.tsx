import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Automation } from "@/types/database";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" } }),
}));

vi.mock("@/repositories/automationRepository", () => ({
  listAutomations: vi.fn(),
  createAutomation: vi.fn(),
  updateAutomation: vi.fn(),
  deleteAutomation: vi.fn(),
}));

import { AutomationsPanel } from "@/features/automation/AutomationsPanel";
import {
  createAutomation,
  deleteAutomation,
  listAutomations,
  updateAutomation,
} from "@/repositories/automationRepository";

const mockListAutomations = vi.mocked(listAutomations);
const mockCreateAutomation = vi.mocked(createAutomation);
const mockUpdateAutomation = vi.mocked(updateAutomation);
const mockDeleteAutomation = vi.mocked(deleteAutomation);

function makeAutomation(overrides: Partial<Automation> & { id: string; name: string }): Automation {
  return {
    organization_id: "org-1",
    description: null,
    trigger_event: "task.overdue",
    condition: {},
    action: {},
    is_active: true,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPanel() {
  return render(
    <ToastProvider>
      <AutomationsPanel />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListAutomations.mockReset();
  mockCreateAutomation.mockReset();
  mockUpdateAutomation.mockReset();
  mockDeleteAutomation.mockReset();
});

describe("AutomationsPanel", () => {
  it("lists existing automations", async () => {
    mockListAutomations.mockResolvedValue([makeAutomation({ id: "a1", name: "Alerta de atraso" })]);
    renderPanel();
    expect(await screen.findByText("Alerta de atraso")).toBeInTheDocument();
  });

  it("shows an empty state with no automations", async () => {
    mockListAutomations.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText(/nenhuma automação/i)).toBeInTheDocument();
  });

  it("creates a new automation from the quick-create form", async () => {
    const user = userEvent.setup();
    mockListAutomations.mockResolvedValueOnce([]);
    mockCreateAutomation.mockResolvedValue(makeAutomation({ id: "a1", name: "Nova automação" }));
    mockListAutomations.mockResolvedValueOnce([makeAutomation({ id: "a1", name: "Nova automação" })]);

    renderPanel();
    await screen.findByText(/nenhuma automação/i);

    await user.type(screen.getByPlaceholderText(/nome da automação/i), "Nova automação");
    await user.selectOptions(screen.getByLabelText(/gatilho/i), "task.due_soon");
    await user.click(screen.getByRole("button", { name: /criar automação/i }));

    await waitFor(() =>
      expect(mockCreateAutomation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Nova automação",
          triggerEvent: "task.due_soon",
          organizationId: "org-1",
          createdBy: "user-1",
        }),
      ),
    );
    expect(await screen.findByText("Nova automação")).toBeInTheDocument();
  });

  it("toggles an automation's active state", async () => {
    const user = userEvent.setup();
    mockListAutomations.mockResolvedValue([makeAutomation({ id: "a1", name: "Alerta de atraso", is_active: true })]);
    mockUpdateAutomation.mockResolvedValue(undefined);

    renderPanel();
    const row = await screen.findByTestId("automation-row-a1");

    await user.click(within(row).getByRole("button", { name: /desativar/i }));

    await waitFor(() => expect(mockUpdateAutomation).toHaveBeenCalledWith("a1", { isActive: false }));
  });

  it("deletes an automation", async () => {
    const user = userEvent.setup();
    mockListAutomations.mockResolvedValue([makeAutomation({ id: "a1", name: "Alerta de atraso" })]);
    mockDeleteAutomation.mockResolvedValue(undefined);

    renderPanel();
    const row = await screen.findByTestId("automation-row-a1");

    await user.click(within(row).getByRole("button", { name: /excluir/i }));

    await waitFor(() => expect(mockDeleteAutomation).toHaveBeenCalledWith("a1"));
  });
});
