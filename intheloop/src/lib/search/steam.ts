import { SearchSuggestion } from './types';

export async function searchSteam(query: string): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams({ term: query, l: 'english', cc: 'us' });

  const res = await fetch(`https://store.steampowered.com/api/storesearch?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  return (data.items || []).slice(0, 8).map((g: Record<string, unknown>) => ({
    value: g.name as string,
    label: g.name as string,
    subtitle: g.price
      ? `$${((g.price as Record<string, unknown>).final as number / 100).toFixed(2)}`
      : 'Free',
    imageUrl: g.tiny_image as string || undefined,
  }));
}
