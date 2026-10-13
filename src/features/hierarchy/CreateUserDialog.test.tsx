import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Department, ManagementUnit } from "@/types/database";

vi.mock("@/repositories/userAdminRepository", () => ({
  inviteUser: vi.fn(),
}));

import { CreateUserDialog } from "@/features/hierarchy/CreateUserDialog";
import { inviteUser } from "@/repositories/userAdminRepository";

const mockInviteUser = vi.mocked(inviteUser);

const managementUnits: ManagementUnit[] = [
  { id: "mu-1", organization_id: "org-1", name: "CD Food Town", description: null, manager_profile_id: null, is_active: true, created_at: "", updated_at: "" },
  { id: "mu-2", organization_id: "org-1", name: "CD Betim", description: null, manager_profile_id: null, is_active: true, created_at: "", updated_at: "" },
];
const departments: Department[] = [
  { id: "dept-1", organization_id: "org-1", management_unit_id: "mu-1", name: "Transportes", description: null, coordinator_profile_id: null, is_active: true, created_at: "", updated_at: "" },
  { id: "dept-2", organization_id: "org-1", management_unit_id: "mu-2", name: "Logística", description: null, coordinator_profile_id: null, is_active: true, created_at: "", updated_at: "" },
];

function renderDialog(onCreated = vi.fn(), onClose = vi.fn()) {
  return {
    onCreated,
    onClose,
    ...render(
      <ToastProvider>
        <CreateUserDialog
          open
          onClose={onClose}
          managementUnits={managementUnits}
          departments={departments}
          onCreated={onCreated}
        />
      </ToastProvider>,
    ),
  };
}

beforeEach(() => {
  mockInviteUser.mockReset();
});

describe("CreateUserDialog", () => {
  it("submit is disabled until name, email, CD, setor and papel are all filled", async () => {
    const user = userEvent.setup();
    renderDialog();

    const submit = screen.getByRole("button", { name: /convidar/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/nome completo/i), "Novo Usuário");
    await user.type(screen.getByLabelText(/e-mail/i), "novo@mbnexus.dev");
    await user.selectOptions(screen.getByLabelText(/^cd$/i), "mu-1");
    await user.selectOptions(screen.getByLabelText(/^setor$/i), "dept-1");
    await user.selectOptions(screen.getByLabelText(/^papel no setor$/i), "lider");

    expect(submit).not.toBeDisabled();
  });

  it("invites the user with the selected CD, setor and papel", async () => {
    const user = userEvent.setup();
    mockInviteUser.mockResolvedValue({ profileId: "p-1", teamId: "t-1" });
    const { onCreated, onClose } = renderDialog();

    await user.type(screen.getByLabelText(/nome completo/i), "Novo Usuário");
    await user.type(screen.getByLabelText(/e-mail/i), "novo@mbnexus.dev");
    await user.selectOptions(screen.getByLabelText(/^cd$/i), "mu-1");
    await user.selectOptions(screen.getByLabelText(/^setor$/i), "dept-1");
    await user.selectOptions(screen.getByLabelText(/^papel no setor$/i), "gestor");
    await user.click(screen.getByRole("button", { name: /convidar/i }));

    await waitFor(() =>
      expect(mockInviteUser).toHaveBeenCalledWith({
        fullName: "Novo Usuário",
        email: "novo@mbnexus.dev",
        managementUnitId: "mu-1",
        departmentId: "dept-1",
        papel: "gestor",
      }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("resets the setor and only offers setores from the newly selected CD", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.selectOptions(screen.getByLabelText(/^cd$/i), "mu-1");
    await user.selectOptions(screen.getByLabelText(/^setor$/i), "dept-1");
    expect(screen.getByLabelText(/^setor$/i)).toHaveValue("dept-1");

    await user.selectOptions(screen.getByLabelText(/^cd$/i), "mu-2");

    expect(screen.getByLabelText(/^setor$/i)).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Transportes" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Logística" })).toBeInTheDocument();
  });
});
