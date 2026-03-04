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
    .filter((i: Record<string, unknown>) => {
      const quote = (i.quote_ccy || i.quote_currency) as string;
      return quote === 'USDT' || quote === 'USD';
    })
    .filter((i: Record<string, unknown>) => (i.inst_type as string) === 'CCY_PAIR')
    .map((i: Record<string, unknown>) => {
      const base = (i.base_ccy || i.base_currency) as string;
      const quote = (i.quote_ccy || i.quote_currency) as string;
      return {
        value: base,
        label: `${base}/${quote}`,
        subtitle: i.display_name as string || `${base}/${quote}`,
      };
    });

  return cachedInstruments ?? [];
}

export async function searchCrypto(query: string): Promise<SearchSuggestion[]> {
  const all = await getInstruments();
  const q = query.toUpperCase();
  return all.filter((s) => s.value.toUpperCase().includes(q) || s.label.toUpperCase().includes(q)).slice(0, 8);
}
