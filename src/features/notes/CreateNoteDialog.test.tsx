import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Note } from "@/types/database";

vi.mock("@/repositories/noteRepository", () => ({
  createNote: vi.fn(),
}));

import { CreateNoteDialog } from "@/features/notes/CreateNoteDialog";
import { createNote } from "@/repositories/noteRepository";

const mockCreateNote = vi.mocked(createNote);

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

function renderDialog(onOpenChange = vi.fn(), onCreated = vi.fn(), notes: Note[] = []) {
  return render(
    <ToastProvider>
      <CreateNoteDialog
        open
        onOpenChange={onOpenChange}
        organizationId="org-1"
        ownerProfileId="user-1"
        notes={notes}
        onCreated={onCreated}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockCreateNote.mockReset();
});

describe("CreateNoteDialog", () => {
  it("shows the title and parent-page fields", async () => {
    renderDialog();
    expect(await screen.findByLabelText(/^título$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/página pai/i)).toBeInTheDocument();
  });

  it("creates a root page when no title is given", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    mockCreateNote.mockResolvedValue(makeNote({ id: "n1", title: "Sem título" }));

    renderDialog(onOpenChange, onCreated);
    await user.click(screen.getByRole("button", { name: /criar página/i }));

    await waitFor(() =>
      expect(mockCreateNote).toHaveBeenCalledWith({ organizationId: "org-1", ownerProfileId: "user-1" }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "n1" })));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("creates a page with a title and a parent page", async () => {
    const user = userEvent.setup();
    mockCreateNote.mockResolvedValue(makeNote({ id: "n2", title: "Reunião semanal" }));

    renderDialog(vi.fn(), vi.fn(), [makeNote({ id: "parent-1", title: "Projetos" })]);
    await user.type(await screen.findByLabelText(/^título$/i), "Reunião semanal");
    await user.selectOptions(screen.getByLabelText(/página pai/i), "parent-1");
    await user.click(screen.getByRole("button", { name: /criar página/i }));

    await waitFor(() =>
      expect(mockCreateNote).toHaveBeenCalledWith({
        organizationId: "org-1",
        ownerProfileId: "user-1",
        title: "Reunião semanal",
        parentNoteId: "parent-1",
      }),
    );
  });

  it("shows a toast and keeps the dialog open when creation fails", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockCreateNote.mockRejectedValue(new Error("falha ao criar"));

    renderDialog(onOpenChange);
    await user.click(screen.getByRole("button", { name: /criar página/i }));

    expect(await screen.findByText(/não foi possível criar a página/i)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
