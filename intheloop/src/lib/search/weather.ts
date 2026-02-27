import { SearchSuggestion } from './types';

export async function searchWeather(query: string): Promise<SearchSuggestion[]> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return [];

  const data = await res.json();

  return (data.results || []).map((c: Record<string, unknown>) => ({
    value: c.name as string,
    label: c.name as string,
    subtitle: [c.admin1, c.country].filter(Boolean).join(', '),
  }));
}
