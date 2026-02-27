import { SearchSuggestion } from './types';

export async function searchPodcasts(query: string): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams({
    term: query,
    media: 'podcast',
    entity: 'podcast',
    limit: '8',
  });

  const res = await fetch(`https://itunes.apple.com/search?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  return (data.results || []).map((p: Record<string, unknown>) => ({
    value: p.collectionName as string,
    label: p.collectionName as string,
    subtitle: p.artistName as string || undefined,
    imageUrl: p.artworkUrl60 as string || undefined,
  }));
}
