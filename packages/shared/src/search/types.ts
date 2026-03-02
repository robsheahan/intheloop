export interface SearchSuggestion {
  value: string;
  label: string;
  subtitle?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export type SearchFunction = (query: string) => Promise<SearchSuggestion[]>;
