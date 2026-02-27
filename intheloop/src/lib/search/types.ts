export interface SearchSuggestion {
  value: string;
  label: string;
  subtitle?: string;
  imageUrl?: string;
}

export type SearchFunction = (query: string) => Promise<SearchSuggestion[]>;
