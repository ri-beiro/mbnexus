import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from "@/repositories/emailTemplateRepository";

const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("listEmailTemplates", () => {
  it("lists email templates ordered by key", async () => {
    const rows = [{ id: "t1", key: "tarefa_atrasada" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listEmailTemplates();

    expect(from).toHaveBeenCalledWith("email_templates");
    expect(mock.order).toHaveBeenCalledWith("key", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("throws when the query fails", async () => {
    const mock = createChainableMock({ data: null, error: { message: "boom" } });
    from.mockReturnValue(mock as never);

    await expect(listEmailTemplates()).rejects.toThrow("boom");
  });
});

describe("createEmailTemplate", () => {
  it("inserts a new email template row and returns it", async () => {
    const row = { id: "t1", key: "tarefa_atrasada" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createEmailTemplate({
      organizationId: "org-1",
      key: "tarefa_atrasada",
      subject: "Sua tarefa está atrasada",
      bodyHtml: "<p>Olá</p>",
    });

    expect(from).toHaveBeenCalledWith("email_templates");
    expect(mock.insert).toHaveBeenCalledWith({
      organization_id: "org-1",
      key: "tarefa_atrasada",
      subject: "Sua tarefa está atrasada",
      body_html: "<p>Olá</p>",
    });
    expect(result).toEqual(row);
  });
});

describe("updateEmailTemplate", () => {
  it("updates only the given template by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await updateEmailTemplate("t1", { subject: "Novo assunto" });

    expect(from).toHaveBeenCalledWith("email_templates");
    expect(mock.update).toHaveBeenCalledWith({ subject: "Novo assunto" });
    expect(mock.eq).toHaveBeenCalledWith("id", "t1");
  });
});

describe("deleteEmailTemplate", () => {
  it("deletes the template by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await deleteEmailTemplate("t1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "t1");
  });
});
