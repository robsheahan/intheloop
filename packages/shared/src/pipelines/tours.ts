import { PipelineContext, PipelineResult } from './types';

const TICKETMASTER_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';
const SERPAPI_URL = 'https://serpapi.com/search.json';

export async function checkTours(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const filterCity = ((entity.entity_metadata.city as string) || '').toLowerCase();
    const countryCode = (entity.entity_metadata.countryCode as string) || '';

    try {
      // Fetch from both sources in parallel
      const [tmEvents, serpEvents] = await Promise.all([
        fetchTicketmasterEvents(entity.entity_name, countryCode),
        fetchSerpApiEvents(entity.entity_name, filterCity, countryCode),
      ]);

      // Merge and deduplicate
      let events = deduplicateEvents([...tmEvents, ...serpEvents]);

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
  source: 'ticketmaster' | 'serpapi';
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractDate(dateStr: string): string {
  // Normalise to YYYY-MM-DD regardless of source format
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().slice(0, 10);
}

function deduplicateEvents(events: TourEvent[]): TourEvent[] {
  const seen = new Map<string, TourEvent>();

  for (const event of events) {
    const key = `${normalise(event.venue)}|${extractDate(event.date)}`;

    if (!seen.has(key)) {
      seen.set(key, event);
    } else {
      // Prefer Ticketmaster (has better structured data / ticket links)
      const existing = seen.get(key)!;
      if (event.source === 'ticketmaster' && existing.source !== 'ticketmaster') {
        seen.set(key, event);
      }
    }
  }

  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Ticketmaster
// ---------------------------------------------------------------------------

interface TicketmasterEvent {
  name: string;
  dates: {
    start: {
      dateTime?: string;
      localDate?: string;
    };
  };
  url: string;
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      country?: { name: string; countryCode: string };
    }>;
  };
}

async function fetchTicketmasterEvents(artistName: string, countryCode?: string): Promise<TourEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    keyword: artistName,
    classificationName: 'music',
    size: '50',
    sort: 'date,asc',
  });

  if (countryCode) {
    params.set('countryCode', countryCode);
  }

  try {
    const res = await fetch(
      `${TICKETMASTER_URL}?${params.toString()}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!res.ok) {
      console.error(`Ticketmaster API error for "${artistName}": ${res.status}`);
      return [];
    }

    const data = await res.json();
    const allEvents: TicketmasterEvent[] = data._embedded?.events || [];

    const artistLower = artistName.toLowerCase();
    return allEvents
      .filter((event) => event.name.toLowerCase().includes(artistLower))
      .map((event) => {
        const venue = event._embedded?.venues?.[0];
        return {
          venue: venue?.name || 'Unknown Venue',
          city: venue?.city?.name || '',
          country: venue?.country?.name || '',
          date: event.dates.start.dateTime || event.dates.start.localDate || '',
          link: event.url || '',
          source: 'ticketmaster' as const,
        };
      });
  } catch (err) {
    console.error(`Ticketmaster fetch error for "${artistName}":`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// SerpAPI (Google Events)
// ---------------------------------------------------------------------------

interface SerpApiEvent {
  title: string;
  date?: { start_date?: string; when?: string };
  address?: string[];
  venue?: { name?: string };
  link?: string;
  ticket_info?: Array<{ source?: string; link?: string }>;
}

async function fetchSerpApiEvents(artistName: string, city?: string, countryCode?: string): Promise<TourEvent[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];

  const query = city
    ? `${artistName} concert ${city}`
    : `${artistName} concert`;

  const params = new URLSearchParams({
    engine: 'google_events',
    q: query,
    api_key: apiKey,
    hl: 'en',
  });

  if (countryCode) {
    params.set('gl', countryCode.toLowerCase());
  }

  try {
    const res = await fetch(
      `${SERPAPI_URL}?${params.toString()}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!res.ok) {
      console.error(`SerpAPI error for "${artistName}": ${res.status}`);
      return [];
    }

    const data = await res.json();
    const events: SerpApiEvent[] = data.events_results || [];

    const artistLower = artistName.toLowerCase();

    return events
      .filter((event) => event.title.toLowerCase().includes(artistLower))
      .map((event) => {
        const ticketUrl = event.ticket_info?.[0]?.link || event.link || '';
        const venueName = event.venue?.name || event.address?.[0] || 'Unknown Venue';
        const cityName = extractCityFromAddress(event.address);
        const date = parseGoogleDate(event.date?.start_date, event.date?.when);

        return {
          venue: venueName,
          city: cityName,
          country: '',
          date,
          link: ticketUrl,
          source: 'serpapi' as const,
        };
      });
  } catch (err) {
    console.error(`SerpAPI fetch error for "${artistName}":`, err);
    return [];
  }
}

function extractCityFromAddress(address?: string[]): string {
  if (!address || address.length === 0) return '';
  // Google Events typically puts "City, State" or "City, Country" in the last element
  const last = address[address.length - 1];
  return last.split(',')[0].trim();
}

function parseGoogleDate(startDate?: string, when?: string): string {
  // start_date is like "Mar 15" or "Mar 15, 2026"
  if (startDate) {
    const withYear = startDate.match(/\d{4}/) ? startDate : `${startDate}, ${new Date().getFullYear()}`;
    const d = new Date(withYear);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // Fallback: parse from the "when" field like "Sat, Mar 15, 8 PM AEDT"
  if (when) {
    const cleaned = when.replace(/\d{1,2}(:\d{2})?\s*(AM|PM)\s*.*$/i, '').trim();
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return '';
}
