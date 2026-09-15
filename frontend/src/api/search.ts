import { api } from "./client";
import type { SearchResults } from "../types";

export function search(query: string) {
  return api.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`);
}
