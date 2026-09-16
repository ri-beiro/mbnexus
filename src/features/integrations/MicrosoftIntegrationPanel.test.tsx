import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" } }),
}));

vi.mock("@/repositories/integrationRepository", () => ({
  getIntegration: vi.fn(),
  upsertIntegration: vi.fn(),
}));

import { MicrosoftIntegrationPanel } from "@/features/integrations/MicrosoftIntegrationPanel";
import { getIntegration, upsertIntegration } from "@/repositories/integrationRepository";

const mockGetIntegration = vi.mocked(getIntegration);
const mockUpsertIntegration = vi.mocked(upsertIntegration);

function renderPanel() {
  return render(
    <ToastProvider>
      <MicrosoftIntegrationPanel />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockGetIntegration.mockReset();
  mockUpsertIntegration.mockReset();
});

describe("MicrosoftIntegrationPanel", () => {
  it("shows a disabled state with no integration configured yet", async () => {
    mockGetIntegration.mockResolvedValue(null);
    renderPanel();
    expect(await screen.findByLabelText(/ativar integração/i)).not.toBeChecked();
    expect(screen.getByLabelText(/e-mail organizador/i)).toHaveValue("");
  });

  it("shows the current configuration when one exists", async () => {
    mockGetIntegration.mockResolvedValue({
      id: "i1",
      organization_id: "org-1",
      provider: "microsoft_365",
      is_enabled: true,
      config: { organizerUpn: "reunioes@mbnexus.dev" },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    renderPanel();

    expect(await screen.findByLabelText(/ativar integração/i)).toBeChecked();
    expect(screen.getByLabelText(/e-mail organizador/i)).toHaveValue("reunioes@mbnexus.dev");
  });

  it("saves the configuration", async () => {
    const user = userEvent.setup();
    mockGetIntegration.mockResolvedValue(null);
    mockUpsertIntegration.mockResolvedValue({
      id: "i1",
      organization_id: "org-1",
      provider: "microsoft_365",
      is_enabled: true,
      config: { organizerUpn: "reunioes@mbnexus.dev" },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    renderPanel();
    await screen.findByLabelText(/ativar integração/i);

    await user.click(screen.getByLabelText(/ativar integração/i));
    await user.type(screen.getByLabelText(/e-mail organizador/i), "reunioes@mbnexus.dev");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(mockUpsertIntegration).toHaveBeenCalledWith({
        organizationId: "org-1",
        provider: "microsoft_365",
        isEnabled: true,
        config: { organizerUpn: "reunioes@mbnexus.dev" },
      }),
    );
  });

  it("shows a toast when saving fails", async () => {
    const user = userEvent.setup();
    mockGetIntegration.mockResolvedValue(null);
    mockUpsertIntegration.mockRejectedValue(new Error("apenas super admins"));

    renderPanel();
    await screen.findByLabelText(/ativar integração/i);
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText(/não foi possível salvar/i)).toBeInTheDocument();
  });
});
