import { SearchSuggestion } from './types';

export async function searchMusic(query: string): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams({
    term: query,
    entity: 'musicArtist',
    limit: '8',
  });

  const res = await fetch(`https://itunes.apple.com/search?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const seen = new Set<string>();

  return (data.results || [])
    .filter((r: Record<string, unknown>) => {
      const name = (r.artistName as string || '').toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    })
    .map((r: Record<string, unknown>) => ({
      value: r.artistName as string,
      label: r.artistName as string,
      subtitle: r.primaryGenreName as string || undefined,
    }));
}
