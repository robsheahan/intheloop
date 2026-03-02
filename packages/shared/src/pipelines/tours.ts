import { PipelineContext, PipelineResult } from './types';

const BANDSINTOWN_URL = 'https://rest.bandsintown.com/artists';
const APP_ID = 'tellmewhen';

export async function checkTours(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const filterCity = ((entity.entity_metadata.city as string) || '').toLowerCase();

    try {
      let events = await fetchEvents(entity.entity_name);

      if (filterCity) {
        events = events.filter((event) =>
          event.city.toLowerCase().includes(filterCity)
        );
      }

      for (const event of events) {
        const dedupKey = `${entity.entity_name}|${event.venue}|${event.date}`;

        results.push({
          entity_name: entity.entity_name,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          event_date: event.date,
          content: {
            type: 'tours',
            artist: entity.entity_name,
            title: `${event.venue}, ${event.city}`,
            venue: event.venue,
            city: event.city,
            country: event.country,
            date: event.date,
            url: event.link,
          },
        });
      }
    } catch (err) {
      console.error(`Tours pipeline error for "${entity.entity_name}":`, err);
    }
  }

  return results;
}

interface TourEvent {
  venue: string;
  city: string;
  country: string;
  date: string;
  link: string;
}

interface BandsintownEvent {
  datetime: string;
  venue: {
    name: string;
    city: string;
    region: string;
    country: string;
  };
  url: string;
  lineup: string[];
}

async function fetchEvents(artistName: string): Promise<TourEvent[]> {
  const encodedArtist = encodeURIComponent(artistName);
  const res = await fetch(
    `${BANDSINTOWN_URL}/${encodedArtist}/events?app_id=${APP_ID}`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) return [];

  const data: BandsintownEvent[] = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((event) => ({
    venue: event.venue?.name || 'Unknown Venue',
    city: event.venue?.city || '',
    country: event.venue?.country || '',
    date: event.datetime || '',
    link: event.url || '',
  }));
}
