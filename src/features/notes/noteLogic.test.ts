import { describe, expect, it } from "vitest";
import { buildNoteTree } from "@/features/notes/noteLogic";
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

describe("buildNoteTree", () => {
  it("returns an empty tree for an empty list", () => {
    expect(buildNoteTree([])).toEqual([]);
  });

  it("puts notes with no parent at the root", () => {
    const notes = [makeNote({ id: "1", title: "A" }), makeNote({ id: "2", title: "B" })];
    const tree = buildNoteTree(notes);
    expect(tree.map((n) => n.note.id)).toEqual(["1", "2"]);
    expect(tree.every((n) => n.children.length === 0)).toBe(true);
  });

  it("nests a note under its parent", () => {
    const notes = [
      makeNote({ id: "1", title: "Workspace" }),
      makeNote({ id: "2", title: "Subpágina", parent_note_id: "1" }),
    ];
    const tree = buildNoteTree(notes);
    expect(tree).toHaveLength(1);
    expect(tree[0].children.map((n) => n.note.id)).toEqual(["2"]);
  });

  it("nests arbitrarily deep", () => {
    const notes = [
      makeNote({ id: "1", title: "A" }),
      makeNote({ id: "2", title: "B", parent_note_id: "1" }),
      makeNote({ id: "3", title: "C", parent_note_id: "2" }),
    ];
    const tree = buildNoteTree(notes);
    expect(tree[0].children[0].children.map((n) => n.note.id)).toEqual(["3"]);
  });

  it("orders siblings by position", () => {
    const notes = [
      makeNote({ id: "2", title: "Segunda", position: 1 }),
      makeNote({ id: "1", title: "Primeira", position: 0 }),
    ];
    expect(buildNoteTree(notes).map((n) => n.note.id)).toEqual(["1", "2"]);
  });

  it("excludes archived notes", () => {
    const notes = [makeNote({ id: "1", title: "Ativa" }), makeNote({ id: "2", title: "Arquivada", is_archived: true })];
    expect(buildNoteTree(notes).map((n) => n.note.id)).toEqual(["1"]);
  });

  it("treats a note whose parent is archived (or missing) as a root, rather than dropping it", () => {
    const notes = [makeNote({ id: "1", title: "Órfã", parent_note_id: "missing-parent" })];
    expect(buildNoteTree(notes).map((n) => n.note.id)).toEqual(["1"]);
  });
});
