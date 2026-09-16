import type { Note } from "@/types/database";

export interface NoteTreeNode {
  note: Note;
  children: NoteTreeNode[];
}

/** Nests notes into a tree by parent_note_id for the workspace sidebar
 * (section 13). Archived notes are excluded entirely; a note whose parent
 * is archived, missing, or was itself excluded becomes a root instead of
 * being silently dropped — losing track of a page is worse than
 * misplacing it one level up. Siblings are ordered by `position`. */
export function buildNoteTree(notes: Note[]): NoteTreeNode[] {
  const visible = notes.filter((n) => !n.is_archived);
  const visibleIds = new Set(visible.map((n) => n.id));

  const byParent = new Map<string | null, Note[]>();
  for (const note of visible) {
    const parentKey = note.parent_note_id && visibleIds.has(note.parent_note_id) ? note.parent_note_id : null;
    const siblings = byParent.get(parentKey) ?? [];
    siblings.push(note);
    byParent.set(parentKey, siblings);
  }

  function build(parentId: string | null): NoteTreeNode[] {
    const children = (byParent.get(parentId) ?? []).sort((a, b) => a.position - b.position);
    return children.map((note) => ({ note, children: build(note.id) }));
  }

  return build(null);
}
