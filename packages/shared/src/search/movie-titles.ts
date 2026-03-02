import { SearchSuggestion } from './types';

export async function searchMovieTitles(query: string): Promise<SearchSuggestion[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({ api_key: apiKey, query });

  const res = await fetch(`https://api.themoviedb.org/3/search/multi?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  return (data.results || [])
    .filter((r: Record<string, unknown>) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 8)
    .map((r: Record<string, unknown>) => {
      const title = (r.title || r.name || '') as string;
      const year = ((r.release_date || r.first_air_date || '') as string).slice(0, 4);
      const mediaType = r.media_type as string;

      return {
        value: title,
        label: title,
        subtitle: [mediaType === 'tv' ? 'TV Show' : 'Movie', year].filter(Boolean).join(' · '),
        imageUrl: r.poster_path
          ? `https://image.tmdb.org/t/p/w92${r.poster_path}`
          : undefined,
        metadata: { tmdb_id: r.id, media_type: mediaType },
      };
    });
}
