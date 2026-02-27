import { SearchSuggestion } from './types';

let cachedPairs: SearchSuggestion[] | null = null;

async function getCurrencyPairs(): Promise<SearchSuggestion[]> {
  if (cachedPairs) return cachedPairs;

  const res = await fetch('https://api.frankfurter.app/currencies', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data: Record<string, string> = await res.json();
  const codes = Object.keys(data);

  // Generate common pairs (each currency vs USD, EUR, GBP, AUD)
  const bases = ['USD', 'EUR', 'GBP', 'AUD'];
  const pairs: SearchSuggestion[] = [];

  for (const base of bases) {
    for (const code of codes) {
      if (code === base) continue;
      pairs.push({
        value: `${base}/${code}`,
        label: `${base}/${code}`,
        subtitle: `${data[base] || base} to ${data[code]}`,
      });
    }
  }

  cachedPairs = pairs;
  return pairs;
}

export async function searchCurrency(query: string): Promise<SearchSuggestion[]> {
  const all = await getCurrencyPairs();
  const q = query.toUpperCase();
  return all.filter((s) => s.value.includes(q) || s.subtitle?.toUpperCase().includes(q)).slice(0, 8);
}
