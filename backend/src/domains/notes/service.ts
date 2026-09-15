import { db } from "../../db/index";
import type { NoteRow } from "../../db/types";
import { NotFoundError } from "../../lib/errors";

export interface NoteFilter {
  goalId?: string;
  targetId?: string;
  taskId?: string;
  occurrenceId?: string;
  reviewId?: string;
}

export function listNotes(userId: string, filter: NoteFilter = {}): Promise<NoteRow[]> {
  return db<NoteRow>("notes")
    .where({ userId, ...filter })
    .orderBy("createdAt", "desc");
}

export function searchNotes(userId: string, query: string): Promise<NoteRow[]> {
  return db<NoteRow>("notes").where({ userId }).whereILike("content", `%${query}%`).orderBy("createdAt", "desc").limit(25);
}

export async function createNote(
  userId: string,
  input: {
    content: string;
    goalId?: string | null;
    targetId?: string | null;
    taskId?: string | null;
    occurrenceId?: string | null;
    reviewId?: string | null;
  },
): Promise<NoteRow> {
  const [row] = await db<NoteRow>("notes").insert({ userId, ...input }).returning("*");
  return row;
}

export async function updateNote(userId: string, noteId: string, content: string): Promise<NoteRow> {
  const [row] = await db<NoteRow>("notes")
    .where({ id: noteId, userId })
    .update({ content, updatedAt: new Date() })
    .returning("*");
  if (!row) throw new NotFoundError("Note not found");
  return row;
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const count = await db<NoteRow>("notes").where({ id: noteId, userId }).del();
  if (count === 0) throw new NotFoundError("Note not found");
}
