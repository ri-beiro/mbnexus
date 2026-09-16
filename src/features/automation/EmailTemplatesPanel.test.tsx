import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { EmailTemplate } from "@/types/database";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" } }),
}));

vi.mock("@/repositories/emailTemplateRepository", () => ({
  listEmailTemplates: vi.fn(),
  createEmailTemplate: vi.fn(),
  updateEmailTemplate: vi.fn(),
  deleteEmailTemplate: vi.fn(),
}));

import { EmailTemplatesPanel } from "@/features/automation/EmailTemplatesPanel";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from "@/repositories/emailTemplateRepository";

const mockListTemplates = vi.mocked(listEmailTemplates);
const mockCreateTemplate = vi.mocked(createEmailTemplate);
const mockUpdateTemplate = vi.mocked(updateEmailTemplate);
const mockDeleteTemplate = vi.mocked(deleteEmailTemplate);

function makeTemplate(overrides: Partial<EmailTemplate> & { id: string; key: string }): EmailTemplate {
  return {
    organization_id: "org-1",
    subject: "Assunto padrão",
    body_html: "<p>Corpo</p>",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPanel() {
  return render(
    <ToastProvider>
      <EmailTemplatesPanel />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListTemplates.mockReset();
  mockCreateTemplate.mockReset();
  mockUpdateTemplate.mockReset();
  mockDeleteTemplate.mockReset();
});

describe("EmailTemplatesPanel", () => {
  it("lists existing templates", async () => {
    mockListTemplates.mockResolvedValue([makeTemplate({ id: "t1", key: "tarefa_atrasada" })]);
    renderPanel();
    expect(await screen.findByText("tarefa_atrasada")).toBeInTheDocument();
  });

  it("shows an empty state with no templates", async () => {
    mockListTemplates.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText(/nenhum modelo/i)).toBeInTheDocument();
  });

  it("creates a new template from the quick-create form", async () => {
    const user = userEvent.setup();
    mockListTemplates.mockResolvedValueOnce([]);
    mockCreateTemplate.mockResolvedValue(makeTemplate({ id: "t1", key: "novo_modelo" }));
    mockListTemplates.mockResolvedValueOnce([makeTemplate({ id: "t1", key: "novo_modelo" })]);

    renderPanel();
    await screen.findByText(/nenhum modelo/i);

    await user.type(screen.getByPlaceholderText(/chave/i), "novo_modelo");
    await user.type(screen.getByPlaceholderText(/assunto/i), "Assunto do e-mail");
    await user.type(screen.getByPlaceholderText(/corpo/i), "<p>Olá</p>");
    await user.click(screen.getByRole("button", { name: /criar modelo/i }));

    await waitFor(() =>
      expect(mockCreateTemplate).toHaveBeenCalledWith({
        organizationId: "org-1",
        key: "novo_modelo",
        subject: "Assunto do e-mail",
        bodyHtml: "<p>Olá</p>",
      }),
    );
    expect(await screen.findByText("novo_modelo")).toBeInTheDocument();
  });

  it("updates a template's subject inline", async () => {
    const user = userEvent.setup();
    mockListTemplates.mockResolvedValue([makeTemplate({ id: "t1", key: "tarefa_atrasada", subject: "Antigo" })]);
    mockUpdateTemplate.mockResolvedValue(undefined);

    renderPanel();
    const row = await screen.findByTestId("template-row-t1");

    const subjectInput = within(row).getByDisplayValue("Antigo");
    await user.clear(subjectInput);
    await user.type(subjectInput, "Novo assunto");
    await user.click(within(row).getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(mockUpdateTemplate).toHaveBeenCalledWith("t1", { subject: "Novo assunto" }));
  });

  it("deletes a template", async () => {
    const user = userEvent.setup();
    mockListTemplates.mockResolvedValue([makeTemplate({ id: "t1", key: "tarefa_atrasada" })]);
    mockDeleteTemplate.mockResolvedValue(undefined);

    renderPanel();
    const row = await screen.findByTestId("template-row-t1");

    await user.click(within(row).getByRole("button", { name: /excluir/i }));

    await waitFor(() => expect(mockDeleteTemplate).toHaveBeenCalledWith("t1"));
  });
});
