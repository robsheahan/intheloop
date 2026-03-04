import { SearchSuggestion } from './types';

export async function searchStocks(query: string): Promise<SearchSuggestion[]> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`,
    {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }
  );
  if (!res.ok) return [];

  const data = await res.json();

  return (data.quotes || [])
    .filter((q: Record<string, string>) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
    .slice(0, 8)
    .map((q: Record<string, string>) => ({
      value: q.symbol,
      label: q.symbol,
      subtitle: q.longname || q.shortname || '',
    }));
}
