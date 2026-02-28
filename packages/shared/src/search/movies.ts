import { SearchSuggestion } from './types';

export async function searchMovies(query: string): Promise<SearchSuggestion[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({ api_key: apiKey, query });

  const res = await fetch(`https://api.themoviedb.org/3/search/person?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  return (data.results || []).slice(0, 8).map((p: Record<string, unknown>) => ({
    value: p.name as string,
    label: p.name as string,
    subtitle: p.known_for_department as string || undefined,
    imageUrl: p.profile_path
      ? `https://image.tmdb.org/t/p/w92${p.profile_path}`
      : undefined,
  }));
}
