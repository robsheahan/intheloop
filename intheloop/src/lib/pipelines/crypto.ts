import { PipelineContext, PipelineResult } from './types';

const TICKER_URL = 'https://api.crypto.com/exchange/v1/public/get-tickers';

export async function checkCrypto(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const targetPrice = parseFloat(entity.entity_metadata.target_price as string);
    const direction = (entity.entity_metadata.direction as string) || 'above';

    if (isNaN(targetPrice)) continue;

    try {
      const currentPrice = await fetchPrice(entity.entity_name);
      if (currentPrice === null) continue;

      const triggered =
        (direction === 'above' && currentPrice >= targetPrice) ||
        (direction === 'below' && currentPrice <= targetPrice);

      if (!triggered) continue;

      const checkDate = new Date().toISOString().split('T')[0];
      const dedupKey = `${entity.entity_name}|${direction}|${checkDate}`;

      results.push({
        entity_name: entity.entity_name,
        tracked_entity_id: entity.id,
        dedup_key: dedupKey,
        content: {
          type: 'crypto',
          instrument: entity.entity_name,
          price: currentPrice,
          target_price: targetPrice,
          direction,
          check_date: checkDate,
        },
      });
    } catch (err) {
      console.error(`Crypto pipeline error for "${entity.entity_name}":`, err);
    }
  }

  return results;
}

async function fetchPrice(instrumentName: string): Promise<number | null> {
  const res = await fetch(`${TICKER_URL}?instrument_name=${encodeURIComponent(instrumentName)}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;

  const data = await res.json();
  const tickers = data?.result?.data;
  if (!tickers || tickers.length === 0) return null;

  return parseFloat(tickers[0].a);
}
