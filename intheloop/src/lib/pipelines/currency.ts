import { PipelineContext, PipelineResult } from './types';

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest';

export async function checkCurrency(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const pair = entity.entity_name;
    const targetRate = parseFloat(entity.entity_metadata.target_rate as string);
    const direction = (entity.entity_metadata.direction as string) || 'above';

    if (isNaN(targetRate)) continue;

    const parts = pair.split('/');
    if (parts.length !== 2) continue;
    const [fromCur, toCur] = [parts[0].trim(), parts[1].trim()];

    try {
      const currentRate = await fetchRate(fromCur, toCur);
      if (currentRate === null) continue;

      const triggered =
        (direction === 'above' && currentRate >= targetRate) ||
        (direction === 'below' && currentRate <= targetRate);

      if (!triggered) continue;

      const checkDate = new Date().toISOString().split('T')[0];
      const dedupKey = `${pair}|${direction}|${checkDate}`;

      results.push({
        entity_name: pair,
        tracked_entity_id: entity.id,
        dedup_key: dedupKey,
        content: {
          type: 'currency',
          pair,
          from_currency: fromCur,
          to_currency: toCur,
          rate: currentRate,
          target_rate: targetRate,
          direction,
          check_date: checkDate,
        },
      });
    } catch (err) {
      console.error(`Currency pipeline error for "${pair}":`, err);
    }
  }

  return results;
}

async function fetchRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  const params = new URLSearchParams({ from: fromCurrency, to: toCurrency });
  const res = await fetch(`${FRANKFURTER_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;

  const data = await res.json();
  return data.rates?.[toCurrency] ?? null;
}
