import { SearchSuggestion } from './types';

export async function searchBooks(query: string): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: '8' });

  const res = await fetch(`https://openlibrary.org/search/authors.json?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  return (data.docs || []).slice(0, 8).map((d: Record<string, unknown>) => ({
    value: d.name as string,
    label: d.name as string,
    subtitle: d.top_work ? `Known for: ${d.top_work}` : undefined,
  }));
}
