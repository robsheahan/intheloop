import { PipelineContext, PipelineResult } from './types';
import { baseEntityName } from '../utils/category-fields';

export async function checkStocks(ctx: PipelineContext): Promise<PipelineResult[]> {
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
          type: 'stocks',
          symbol: baseName,
          price: currentPrice,
          target_price: targetPrice,
          direction,
          check_date: checkDate,
        },
      });
    } catch (err) {
      console.error(`Stocks pipeline error for "${entity.entity_name}":`, err);
    }
  }

  return results;
}

async function fetchPrice(symbol: string): Promise<number | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
    {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;

  return meta.regularMarketPrice;
}
