import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" } }),
}));

vi.mock("@/repositories/notificationRepository", () => ({
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

import { NotificationPreferencesPanel } from "@/features/notifications/NotificationPreferencesPanel";
import { getNotificationPreferences, updateNotificationPreferences } from "@/repositories/notificationRepository";

const mockGetPrefs = vi.mocked(getNotificationPreferences);
const mockUpdatePrefs = vi.mocked(updateNotificationPreferences);

function renderPanel() {
  return render(
    <ToastProvider>
      <NotificationPreferencesPanel />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockGetPrefs.mockReset();
  mockUpdatePrefs.mockReset();
});

describe("NotificationPreferencesPanel", () => {
  it("loads and shows the current preferences", async () => {
    mockGetPrefs.mockResolvedValue({
      profile_id: "user-1",
      in_app_enabled: true,
      email_enabled: false,
      updated_at: "2026-09-01T00:00:00.000Z",
    });

    renderPanel();

    expect(await screen.findByLabelText(/notificações no aplicativo/i)).toBeChecked();
    expect(screen.getByLabelText(/notificações por e-mail/i)).not.toBeChecked();
  });

  it("defaults both preferences to enabled when none exist yet", async () => {
    mockGetPrefs.mockResolvedValue(null);

    renderPanel();

    expect(await screen.findByLabelText(/notificações no aplicativo/i)).toBeChecked();
    expect(screen.getByLabelText(/notificações por e-mail/i)).toBeChecked();
  });

  it("saves a preference change immediately", async () => {
    const user = userEvent.setup();
    mockGetPrefs.mockResolvedValue({
      profile_id: "user-1",
      in_app_enabled: true,
      email_enabled: true,
      updated_at: "2026-09-01T00:00:00.000Z",
    });
    mockUpdatePrefs.mockResolvedValue({
      profile_id: "user-1",
      in_app_enabled: true,
      email_enabled: false,
      updated_at: "2026-09-16T00:00:00.000Z",
    });

    renderPanel();
    const emailToggle = await screen.findByLabelText(/notificações por e-mail/i);
    await user.click(emailToggle);

    await waitFor(() =>
      expect(mockUpdatePrefs).toHaveBeenCalledWith("user-1", { emailEnabled: false }),
    );
  });

  it("shows a toast when saving fails", async () => {
    const user = userEvent.setup();
    mockGetPrefs.mockResolvedValue({
      profile_id: "user-1",
      in_app_enabled: true,
      email_enabled: true,
      updated_at: "2026-09-01T00:00:00.000Z",
    });
    mockUpdatePrefs.mockRejectedValue(new Error("falha ao salvar"));

    renderPanel();
    const emailToggle = await screen.findByLabelText(/notificações por e-mail/i);
    await user.click(emailToggle);

    expect(await screen.findByText(/não foi possível salvar/i)).toBeInTheDocument();
  });
});
