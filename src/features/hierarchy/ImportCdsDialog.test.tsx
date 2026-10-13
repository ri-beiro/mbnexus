import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";

vi.mock("xlsx", () => ({
  read: vi.fn(() => ({ SheetNames: ["Sheet1"], Sheets: { Sheet1: {} } })),
  utils: { sheet_to_json: vi.fn(() => [{ Nome: "CD Food Town" }, { Nome: "CD Betim" }]) },
}));

vi.mock("@/repositories/hierarchyRepository", () => ({
  bulkCreateManagementUnits: vi.fn(),
}));

import { ImportCdsDialog } from "@/features/hierarchy/ImportCdsDialog";
import { bulkCreateManagementUnits } from "@/repositories/hierarchyRepository";

const mockBulkCreate = vi.mocked(bulkCreateManagementUnits);

function renderDialog(onImported = vi.fn(), onClose = vi.fn()) {
  return {
    onImported,
    onClose,
    ...render(
      <ToastProvider>
        <ImportCdsDialog open onClose={onClose} onImported={onImported} />
      </ToastProvider>,
    ),
  };
}

function makeFile() {
  return new File(["Nome\nCD Food Town\nCD Betim"], "cds.csv", { type: "text/csv" });
}

beforeEach(() => {
  mockBulkCreate.mockReset().mockResolvedValue(undefined);
});

describe("ImportCdsDialog", () => {
  it("parses the uploaded file and shows a preview of the names found", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.upload(screen.getByLabelText(/selecionar planilha/i), makeFile());

    expect(await screen.findByText("2 CD(s) encontrado(s)")).toBeInTheDocument();
    expect(screen.getByText("CD Food Town")).toBeInTheDocument();
    expect(screen.getByText("CD Betim")).toBeInTheDocument();
  });

  it("imports the parsed names and closes on confirm", async () => {
    const user = userEvent.setup();
    const { onImported, onClose } = renderDialog();

    await user.upload(screen.getByLabelText(/selecionar planilha/i), makeFile());
    await screen.findByText("2 CD(s) encontrado(s)");
    await user.click(screen.getByRole("button", { name: /importar \(2\)/i }));

    await waitFor(() => expect(mockBulkCreate).toHaveBeenCalledWith(["CD Food Town", "CD Betim"]));
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("disables the import button until a file with names is parsed", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /^importar$/i })).toBeDisabled();
  });
});
