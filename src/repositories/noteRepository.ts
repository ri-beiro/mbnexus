import { supabase } from "@/lib/supabase";
import type { Note, NoteBlock, NoteBlockType } from "@/types/database";

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase.from("notes").select("*").order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export interface CreateNoteInput {
  organizationId: string;
  ownerProfileId: string;
  title?: string;
  icon?: string | null;
  parentNoteId?: string | null;
  projectId?: string | null;
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      organization_id: input.organizationId,
      owner_profile_id: input.ownerProfileId,
      title: input.title ?? "Sem título",
      icon: input.icon ?? null,
      parent_note_id: input.parentNoteId ?? null,
      project_id: input.projectId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export interface UpdateNoteInput {
  title?: string;
  icon?: string | null;
  isArchived?: boolean;
}

const UPDATE_NOTE_KEYS: Record<keyof UpdateNoteInput, string> = {
  title: "title",
  icon: "icon",
  isArchived: "is_archived",
};

export async function updateNote(noteId: string, patch: UpdateNoteInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_NOTE_KEYS) as [keyof UpdateNoteInput, string][]) {
    if (key in patch) payload[column] = patch[key];
  }
  const { error } = await supabase.from("notes").update(payload).eq("id", noteId);
  if (error) throw error;
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
}

export async function listBlocks(noteId: string): Promise<NoteBlock[]> {
  const { data, error } = await supabase
    .from("note_blocks")
    .select("*")
    .eq("note_id", noteId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NoteBlock[];
}

export async function createBlock(
  noteId: string,
  type: NoteBlockType,
  content: Record<string, unknown>,
  position: number,
): Promise<NoteBlock> {
  const { data, error } = await supabase
    .from("note_blocks")
    .insert({ note_id: noteId, type, content, position })
    .select()
    .single();
  if (error) throw error;
  return data as NoteBlock;
}

export interface UpdateBlockInput {
  type?: NoteBlockType;
  content?: Record<string, unknown>;
  position?: number;
}

export async function updateBlock(blockId: string, patch: UpdateBlockInput): Promise<void> {
  const { error } = await supabase.from("note_blocks").update(patch).eq("id", blockId);
  if (error) throw error;
}

export async function deleteBlock(blockId: string): Promise<void> {
  const { error } = await supabase.from("note_blocks").delete().eq("id", blockId);
  if (error) throw error;
}
