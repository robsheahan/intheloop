import { SearchSuggestion } from './types';

export async function searchStocks(query: string): Promise<SearchSuggestion[]> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    function: 'SYMBOL_SEARCH',
    keywords: query,
    apikey: apiKey,
  });

  const res = await fetch(`https://www.alphavantage.co/query?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  return (data.bestMatches || []).slice(0, 8).map((m: Record<string, string>) => ({
    value: m['1. symbol'],
    label: m['1. symbol'],
    subtitle: m['2. name'],
  }));
}
