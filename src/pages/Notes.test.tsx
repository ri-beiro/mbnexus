import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Note } from "@/types/database";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({
    profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" },
  }),
}));

vi.mock("@/repositories/noteRepository", () => ({
  listNotes: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  listBlocks: vi.fn(),
  createBlock: vi.fn(),
  updateBlock: vi.fn(),
  deleteBlock: vi.fn(),
}));

import { Notes } from "@/pages/Notes";
import { createNote, listBlocks, listNotes } from "@/repositories/noteRepository";

const mockListNotes = vi.mocked(listNotes);
const mockCreateNote = vi.mocked(createNote);
const mockListBlocks = vi.mocked(listBlocks);

function makeNote(overrides: Partial<Note> & { id: string; title: string }): Note {
  return {
    organization_id: "org-1",
    owner_profile_id: "user-1",
    parent_note_id: null,
    project_id: null,
    icon: null,
    position: 0,
    is_archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <Notes />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListNotes.mockReset();
  mockCreateNote.mockReset();
  mockListBlocks.mockReset();
});

describe("Notes page", () => {
  it("shows a placeholder when no note is selected", async () => {
    mockListNotes.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/selecione ou crie uma página/i)).toBeInTheDocument();
  });

  it("selects a note from the tree and shows its title and blocks", async () => {
    const user = userEvent.setup();
    mockListNotes.mockResolvedValue([makeNote({ id: "n1", title: "Minha página" })]);
    mockListBlocks.mockResolvedValue([]);

    renderPage();
    await user.click(await screen.findByText("Minha página"));

    await waitFor(() => expect(mockListBlocks).toHaveBeenCalledWith("n1"));
    expect(await screen.findByDisplayValue("Minha página")).toBeInTheDocument();
  });

  it("creates a root page and selects it", async () => {
    const user = userEvent.setup();
    mockListNotes.mockResolvedValueOnce([]);
    mockCreateNote.mockResolvedValue(makeNote({ id: "new-1", title: "Sem título" }));
    mockListNotes.mockResolvedValueOnce([makeNote({ id: "new-1", title: "Sem título" })]);
    mockListBlocks.mockResolvedValue([]);

    renderPage();
    await screen.findByText(/selecione ou crie uma página/i);

    await user.click(screen.getByRole("button", { name: /nova página/i }));

    await waitFor(() =>
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1", ownerProfileId: "user-1" }),
      ),
    );
    expect(await screen.findByDisplayValue("Sem título")).toBeInTheDocument();
  });
});
