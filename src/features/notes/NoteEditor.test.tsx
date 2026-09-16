import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { NoteEditor } from "@/features/notes/NoteEditor";
import type { Note, NoteBlock } from "@/types/database";

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

function makeBlock(overrides: Partial<NoteBlock> & { id: string; type: NoteBlock["type"]; content: Record<string, unknown> }): NoteBlock {
  return {
    note_id: "n1",
    position: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderEditor(props: Partial<ComponentProps<typeof NoteEditor>> = {}) {
  const defaults: ComponentProps<typeof NoteEditor> = {
    note: makeNote({ id: "n1", title: "Minha página" }),
    blocks: [],
    onSaveTitle: vi.fn().mockResolvedValue(undefined),
    onAddBlock: vi.fn(),
    onSaveBlockContent: vi.fn().mockResolvedValue(undefined),
    onDeleteBlock: vi.fn(),
  };
  return render(
    <ToastProvider>
      <NoteEditor {...defaults} {...props} />
    </ToastProvider>,
  );
}

describe("NoteEditor", () => {
  it("shows the note title in an editable field", () => {
    renderEditor();
    expect(screen.getByDisplayValue("Minha página")).toBeInTheDocument();
  });

  it("shows 'Salvo' when there is nothing pending", () => {
    renderEditor();
    expect(screen.getByText("Salvo")).toBeInTheDocument();
  });

  it("shows 'Alterações não salvas' right after editing the title, then 'Salvo' once it persists", async () => {
    vi.useFakeTimers();
    try {
      const onSaveTitle = vi.fn().mockResolvedValue(undefined);
      renderEditor({ onSaveTitle });

      const titleInput = screen.getByDisplayValue("Minha página");
      fireEvent.change(titleInput, { target: { value: "Minha página!" } });
      expect(screen.getByText("Alterações não salvas")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onSaveTitle).toHaveBeenCalledWith("Minha página!");
      expect(screen.getByText("Salvo")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders a paragraph block's text and a checklist block's items", () => {
    const blocks = [
      makeBlock({ id: "b1", type: "paragraph", content: { text: "Um parágrafo" } }),
      makeBlock({
        id: "b2",
        type: "checklist",
        content: { items: [{ text: "Primeiro item", checked: false }, { text: "Segundo item", checked: true }] },
      }),
    ];
    renderEditor({ blocks });

    expect(screen.getByDisplayValue("Um parágrafo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Primeiro item")).toBeInTheDocument();
    const secondItemCheckbox = screen.getByRole("checkbox", { name: /segundo item/i });
    expect(secondItemCheckbox).toBeChecked();
  });

  it("saves a paragraph block's new text on blur", async () => {
    const user = userEvent.setup();
    const onSaveBlockContent = vi.fn().mockResolvedValue(undefined);
    const blocks = [makeBlock({ id: "b1", type: "paragraph", content: { text: "Original" } })];
    renderEditor({ blocks, onSaveBlockContent });

    const textarea = screen.getByDisplayValue("Original");
    await user.clear(textarea);
    await user.type(textarea, "Editado");
    await user.tab();

    expect(onSaveBlockContent).toHaveBeenCalledWith("b1", { text: "Editado" });
  });

  it("toggles a checklist item and saves the whole item list", async () => {
    const user = userEvent.setup();
    const onSaveBlockContent = vi.fn().mockResolvedValue(undefined);
    const blocks = [
      makeBlock({ id: "b1", type: "checklist", content: { items: [{ text: "Comprar café", checked: false }] } }),
    ];
    renderEditor({ blocks, onSaveBlockContent });

    await user.click(screen.getByRole("checkbox", { name: /comprar café/i }));

    expect(onSaveBlockContent).toHaveBeenCalledWith("b1", { items: [{ text: "Comprar café", checked: true }] });
  });

  it("adds a block of the chosen type", async () => {
    const user = userEvent.setup();
    const onAddBlock = vi.fn();
    renderEditor({ onAddBlock });

    await user.click(screen.getByRole("button", { name: /adicionar bloco/i }));
    await user.click(screen.getByRole("menuitem", { name: /checklist/i }));

    expect(onAddBlock).toHaveBeenCalledWith("checklist");
  });

  it("deletes a block", async () => {
    const user = userEvent.setup();
    const onDeleteBlock = vi.fn();
    const blocks = [makeBlock({ id: "b1", type: "paragraph", content: { text: "Remover" } })];
    renderEditor({ blocks, onDeleteBlock });

    const row = screen.getByTestId("note-block-b1");
    await user.click(within(row).getByRole("button", { name: /remover bloco/i }));

    expect(onDeleteBlock).toHaveBeenCalledWith("b1");
  });
});
