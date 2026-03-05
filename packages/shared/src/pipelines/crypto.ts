import { PipelineContext, PipelineResult } from './types';
import { baseEntityName } from '../utils/category-fields';

const TICKER_URL = 'https://api.crypto.com/exchange/v1/public/get-tickers';

export async function checkCrypto(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const targetPrice = parseFloat(entity.entity_metadata.target_price as string);
    const direction = (entity.entity_metadata.direction as string) || 'above';
    const baseName = baseEntityName(entity.entity_name);

    if (isNaN(targetPrice)) continue;

    try {
      const currentPrice = await fetchPrice(baseName);
      if (currentPrice === null) continue;

      const triggered =
        (direction === 'above' && currentPrice >= targetPrice) ||
        (direction === 'below' && currentPrice <= targetPrice);

      if (!triggered) continue;

      const checkDate = new Date().toISOString().split('T')[0];
      const dedupKey = `${baseName}|${direction}|${targetPrice}|${checkDate}`;

      results.push({
        entity_name: entity.entity_name,
        tracked_entity_id: entity.id,
        dedup_key: dedupKey,
        content: {
          type: 'crypto',
          instrument: baseName,
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

async function fetchPrice(entityName: string): Promise<number | null> {
  // entity_name may be a base currency like "BTC" or a full instrument like "BTC_USDT"
  // Try multiple instrument formats to find a match
  const candidates = entityName.includes('_')
    ? [entityName]
    : [`${entityName}_USDT`, `${entityName}_USD`];

  for (const instrument of candidates) {
    try {
      const res = await fetch(`${TICKER_URL}?instrument_name=${encodeURIComponent(instrument)}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const tickers = data?.result?.data;
      if (!tickers || tickers.length === 0) continue;

      return parseFloat(tickers[0].a);
    } catch {
      continue;
    }
  }

  return null;
}
