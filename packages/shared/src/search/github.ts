import { SearchSuggestion } from './types';

export async function searchGithub(query: string): Promise<SearchSuggestion[]> {
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=8`,
    {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) return [];

  const data = await res.json();

  return (data.items || []).map((r: Record<string, unknown>) => ({
    value: r.full_name as string,
    label: r.full_name as string,
    subtitle: r.description
      ? (r.description as string).slice(0, 80)
      : `${r.stargazers_count} stars`,
  }));
}
