import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import {
  createBlock,
  createNote,
  deleteBlock,
  deleteNote,
  listBlocks,
  listNotes,
  updateBlock,
  updateNote,
} from "@/repositories/noteRepository";

const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("listNotes", () => {
  it("lists notes ordered by position", async () => {
    const rows = [{ id: "n1", title: "Página" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listNotes();

    expect(from).toHaveBeenCalledWith("notes");
    expect(mock.order).toHaveBeenCalledWith("position", { ascending: true });
    expect(result).toEqual(rows);
  });
});

describe("createNote", () => {
  it("inserts a note owned by the given profile", async () => {
    const row = { id: "n1", title: "Nova página" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createNote({ organizationId: "org-1", ownerProfileId: "user-1", title: "Nova página" });

    expect(from).toHaveBeenCalledWith("notes");
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: "org-1", owner_profile_id: "user-1", title: "Nova página" }),
    );
    expect(result).toEqual(row);
  });

  it("defaults the title to 'Sem título' when none is given", async () => {
    const mock = createChainableMock({ data: { id: "n1" }, error: null });
    from.mockReturnValue(mock as never);

    await createNote({ organizationId: "org-1", ownerProfileId: "user-1" });

    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ title: "Sem título" }));
  });

  it("throws when the insert fails", async () => {
    const mock = createChainableMock({ data: null, error: { message: "constraint violated" } });
    from.mockReturnValue(mock as never);

    await expect(createNote({ organizationId: "org-1", ownerProfileId: "user-1" })).rejects.toThrow(
      "constraint violated",
    );
  });
});

describe("updateNote", () => {
  it("updates only the given note by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await updateNote("n1", { title: "Renomeada", isArchived: true });

    expect(from).toHaveBeenCalledWith("notes");
    expect(mock.update).toHaveBeenCalledWith({ title: "Renomeada", is_archived: true });
    expect(mock.eq).toHaveBeenCalledWith("id", "n1");
  });
});

describe("deleteNote", () => {
  it("deletes the note by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await deleteNote("n1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "n1");
  });
});

describe("listBlocks / createBlock / updateBlock / deleteBlock", () => {
  it("lists blocks for a note ordered by position", async () => {
    const rows = [{ id: "b1", type: "paragraph" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listBlocks("n1");

    expect(from).toHaveBeenCalledWith("note_blocks");
    expect(mock.eq).toHaveBeenCalledWith("note_id", "n1");
    expect(mock.order).toHaveBeenCalledWith("position", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("creates a block at the given position", async () => {
    const row = { id: "b1", type: "heading" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createBlock("n1", "heading", { text: "Título" }, 2);

    expect(mock.insert).toHaveBeenCalledWith({ note_id: "n1", type: "heading", content: { text: "Título" }, position: 2 });
    expect(result).toEqual(row);
  });

  it("updates a block's content", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await updateBlock("b1", { content: { text: "Editado" } });

    expect(from).toHaveBeenCalledWith("note_blocks");
    expect(mock.update).toHaveBeenCalledWith({ content: { text: "Editado" } });
    expect(mock.eq).toHaveBeenCalledWith("id", "b1");
  });

  it("deletes a block by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await deleteBlock("b1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "b1");
  });
});
