import { PipelineContext, PipelineResult } from './types';

const AV_URL = 'https://www.alphavantage.co/query';

export async function checkStocks(ctx: PipelineContext): Promise<PipelineResult[]> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    console.warn('ALPHA_VANTAGE_KEY not configured — skipping stocks pipeline');
    return [];
  }

  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const targetPrice = parseFloat(entity.entity_metadata.target_price as string);
    const direction = (entity.entity_metadata.direction as string) || 'above';

    if (isNaN(targetPrice)) continue;

    try {
      const currentPrice = await fetchPrice(entity.entity_name, apiKey);
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
          type: 'stocks',
          symbol: entity.entity_name,
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

async function fetchPrice(symbol: string, apiKey: string): Promise<number | null> {
  const params = new URLSearchParams({
    function: 'GLOBAL_QUOTE',
    symbol,
    apikey: apiKey,
  });

  const res = await fetch(`${AV_URL}?${params}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;

  const data = await res.json();
  const priceStr = data?.['Global Quote']?.['05. price'];
  if (!priceStr) return null;

  return parseFloat(priceStr);
}
