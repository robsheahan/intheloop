import { PipelineContext, PipelineResult } from './types';

const MUSICBRAINZ_URL = 'https://musicbrainz.org/ws/2/release';
const USER_AGENT = 'InTheLoop/1.0 (personal project)';

export async function checkTours(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const filterCity = ((entity.entity_metadata.city as string) || '').toLowerCase();
    const filterCountry = ((entity.entity_metadata.country as string) || '').toLowerCase();

    try {
      let items = await fetchEvents(entity.entity_name);

      if (filterCity || filterCountry) {
        items = items.filter((item) => {
          if (filterCity && !item.city.toLowerCase().includes(filterCity)) return false;
          if (filterCountry && !item.country.toLowerCase().includes(filterCountry)) return false;
          return true;
        });
      }

      for (const item of items) {
        const dedupKey = `${entity.entity_name}|${item.venue}|${item.date}`;

        results.push({
          entity_name: entity.entity_name,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          content: {
            type: 'tours',
            artist: entity.entity_name,
            title: item.venue,
            venue: item.venue,
            city: item.city,
            country: item.country,
            date: item.date,
            url: item.link,
            release_type: 'single/live',
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

async function fetchEvents(artistName: string): Promise<TourEvent[]> {
  const params = new URLSearchParams({
    query: `artist:"${artistName}"`,
    type: 'single',
    limit: '10',
    fmt: 'json',
  });

  const res = await fetch(`${MUSICBRAINZ_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const events: TourEvent[] = [];

  for (const release of data.releases || []) {
    const artistCredit = release['artist-credit'] || [];
    const matched = artistCredit.some(
      (ac: Record<string, unknown>) =>
        (ac.name as string || '').toLowerCase().includes(artistName.toLowerCase()) ||
        ((ac.artist as Record<string, unknown>)?.name as string || '').toLowerCase().includes(artistName.toLowerCase())
    );
    if (!matched) continue;

    const mbid = release.id || '';
    events.push({
      venue: release.title || 'Unknown Release',
      city: release.country || '',
      country: '',
      date: release.date || '',
      link: mbid ? `https://musicbrainz.org/release/${mbid}` : '',
    });
  }

  return events;
}
