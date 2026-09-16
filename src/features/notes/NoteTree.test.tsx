import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NoteTree } from "@/features/notes/NoteTree";
import type { Note } from "@/types/database";

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

describe("NoteTree", () => {
  it("renders root notes and their nested subpages", () => {
    const notes = [makeNote({ id: "1", title: "Workspace" }), makeNote({ id: "2", title: "Subpágina", parent_note_id: "1" })];
    render(<NoteTree notes={notes} selectedId={null} onSelect={vi.fn()} onCreateRoot={vi.fn()} onCreateChild={vi.fn()} />);

    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Subpágina")).toBeInTheDocument();
  });

  it("shows an empty state with no notes", () => {
    render(<NoteTree notes={[]} selectedId={null} onSelect={vi.fn()} onCreateRoot={vi.fn()} onCreateChild={vi.fn()} />);
    expect(screen.getByText(/nenhuma nota/i)).toBeInTheDocument();
  });

  it("calls onSelect when a note is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <NoteTree
        notes={[makeNote({ id: "1", title: "Workspace" })]}
        selectedId={null}
        onSelect={onSelect}
        onCreateRoot={vi.fn()}
        onCreateChild={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Workspace"));

    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("calls onCreateRoot when the top-level 'nova página' button is clicked", async () => {
    const user = userEvent.setup();
    const onCreateRoot = vi.fn();
    render(<NoteTree notes={[]} selectedId={null} onSelect={vi.fn()} onCreateRoot={onCreateRoot} onCreateChild={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /nova página/i }));

    expect(onCreateRoot).toHaveBeenCalled();
  });

  it("calls onCreateChild with the parent id when a node's 'add subpage' button is clicked", async () => {
    const user = userEvent.setup();
    const onCreateChild = vi.fn();
    render(
      <NoteTree
        notes={[makeNote({ id: "1", title: "Workspace" })]}
        selectedId={null}
        onSelect={vi.fn()}
        onCreateRoot={vi.fn()}
        onCreateChild={onCreateChild}
      />,
    );

    const node = screen.getByTestId("note-tree-node-1");
    await user.click(within(node).getByRole("button", { name: /adicionar subpágina/i }));

    expect(onCreateChild).toHaveBeenCalledWith("1");
  });
});
