import { SearchSuggestion } from './types';

let cachedInstruments: SearchSuggestion[] | null = null;

async function getInstruments(): Promise<SearchSuggestion[]> {
  if (cachedInstruments) return cachedInstruments;

  const res = await fetch('https://api.crypto.com/exchange/v1/public/get-instruments', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const instruments = data?.result?.data || [];

  cachedInstruments = instruments
    .filter((i: Record<string, unknown>) => (i.quote_currency as string) === 'USDT' || (i.quote_currency as string) === 'USD')
    .map((i: Record<string, unknown>) => ({
      value: i.symbol as string,
      label: i.symbol as string,
      subtitle: `${i.base_currency}/${i.quote_currency}`,
    }));

  return cachedInstruments ?? [];
}

export async function searchCrypto(query: string): Promise<SearchSuggestion[]> {
  const all = await getInstruments();
  const q = query.toUpperCase();
  return all.filter((s) => s.value.includes(q) || s.label.includes(q)).slice(0, 8);
}
