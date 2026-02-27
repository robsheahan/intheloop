import { PipelineContext, PipelineResult } from './types';

const STEAM_SEARCH_URL = 'https://store.steampowered.com/api/storesearch';
const STEAM_DETAILS_URL = 'https://store.steampowered.com/api/appdetails';

export async function checkSteam(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const gameName = entity.entity_name;

    try {
      const deals = await fetchDeals(gameName);
      for (const deal of deals) {
        const dedupKey = `${deal.appId}|${deal.discountPercent}`;

        results.push({
          entity_name: gameName,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          content: {
            type: 'steam',
            name: deal.name,
            app_id: deal.appId,
            discount_percent: deal.discountPercent,
            sale_price: deal.finalPrice,
            original_price: deal.originalPrice,
            url: `https://store.steampowered.com/app/${deal.appId}`,
          },
        });
      }
    } catch (err) {
      console.error(`Steam pipeline error for "${gameName}":`, err);
    }
  }

  return results;
}

interface SteamDeal {
  name: string;
  appId: number;
  discountPercent: number;
  finalPrice: string;
  originalPrice: string;
}

async function fetchDeals(gameName: string): Promise<SteamDeal[]> {
  const searchParams = new URLSearchParams({ term: gameName, l: 'english', cc: 'us' });
  const searchRes = await fetch(`${STEAM_SEARCH_URL}?${searchParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!searchRes.ok) return [];

  const searchData = await searchRes.json();
  const items = searchData.items || [];
  if (items.length === 0) return [];

  const deals: SteamDeal[] = [];

  for (const item of items.slice(0, 3)) {
    const appId = item.id;
    if (!appId) continue;

    const detailRes = await fetch(`${STEAM_DETAILS_URL}?appids=${appId}&cc=us`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!detailRes.ok) continue;

    const detailData = await detailRes.json();
    const appData = detailData?.[String(appId)]?.data;
    if (!appData) continue;

    const priceInfo = appData.price_overview;
    if (!priceInfo || priceInfo.discount_percent <= 0) continue;

    deals.push({
      name: appData.name || gameName,
      appId,
      discountPercent: priceInfo.discount_percent,
      finalPrice: priceInfo.final_formatted || '',
      originalPrice: priceInfo.initial_formatted || '',
    });
  }

  return deals;
}
