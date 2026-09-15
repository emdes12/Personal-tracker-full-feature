import { api } from "./client";
import type { Note } from "../types";

export interface NoteFilter {
  goalId?: string;
  targetId?: string;
  taskId?: string;
  occurrenceId?: string;
  reviewId?: string;
}

function toQuery(filter: NoteFilter): string {
  const params = new URLSearchParams(filter as Record<string, string>);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function listNotes(filter: NoteFilter = {}) {
  return api.get<{ notes: Note[] }>(`/notes${toQuery(filter)}`);
}

export function createNote(input: { content: string } & NoteFilter) {
  return api.post<{ note: Note }>("/notes", input);
}

export function updateNote(id: string, content: string) {
  return api.patch<{ note: Note }>(`/notes/${id}`, { content });
}

export function deleteNote(id: string) {
  return api.delete<void>(`/notes/${id}`);
}
