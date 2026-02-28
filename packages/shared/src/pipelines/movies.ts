import { PipelineContext, PipelineResult } from './types';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function checkMovies(ctx: PipelineContext): Promise<PipelineResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('TMDB_API_KEY not configured — skipping movies pipeline');
    return [];
  }

  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const trackType = (entity.entity_metadata.track_type as string) || 'actor';

    try {
      const credits = await fetchCredits(entity.entity_name, trackType, apiKey);
      for (const item of credits) {
        const dedupKey = `${entity.entity_name}|${item.title}|${item.media_type}`;

        results.push({
          entity_name: entity.entity_name,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          content: {
            type: 'movies',
            person: entity.entity_name,
            title: item.title,
            media_type: item.media_type,
            release_date: item.release_date,
            url: item.link,
            track_type: trackType,
          },
        });
      }
    } catch (err) {
      console.error(`Movies pipeline error for "${entity.entity_name}":`, err);
    }
  }

  return results;
}

interface CreditItem {
  title: string;
  media_type: string;
  release_date: string;
  link: string;
}

async function fetchCredits(personName: string, trackType: string, apiKey: string): Promise<CreditItem[]> {
  const searchParams = new URLSearchParams({ api_key: apiKey, query: personName });
  const searchRes = await fetch(`${TMDB_BASE}/search/person?${searchParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!searchRes.ok) return [];

  const searchData = await searchRes.json();
  const persons = searchData.results || [];
  if (persons.length === 0) return [];

  const personId = persons[0].id;

  const creditsRes = await fetch(
    `${TMDB_BASE}/person/${personId}/combined_credits?api_key=${apiKey}`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!creditsRes.ok) return [];

  const creditsData = await creditsRes.json();

  let items = trackType === 'director'
    ? (creditsData.crew || []).filter((i: Record<string, unknown>) => i.job === 'Director')
    : creditsData.cast || [];

  items.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const dateA = (a.release_date || a.first_air_date || '') as string;
    const dateB = (b.release_date || b.first_air_date || '') as string;
    return dateB.localeCompare(dateA);
  });

  return items.slice(0, 10).map((item: Record<string, unknown>) => {
    const title = (item.title || item.name || 'Unknown') as string;
    const mediaType = (item.media_type || 'movie') as string;
    const releaseDate = (item.release_date || item.first_air_date || '') as string;
    const tmdbId = item.id;

    return {
      title,
      media_type: mediaType,
      release_date: releaseDate,
      link: tmdbId ? `https://www.themoviedb.org/${mediaType}/${tmdbId}` : '',
    };
  });
}
