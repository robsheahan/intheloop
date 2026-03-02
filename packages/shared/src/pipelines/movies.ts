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
    const trackMode = (entity.entity_metadata.track_mode as string) || 'person';

    try {
      if (trackMode === 'title') {
        const releases = await fetchTitleReleases(entity, apiKey);
        results.push(...releases);
      } else {
        const trackType = (entity.entity_metadata.track_type as string) || 'actor';
        const credits = await fetchCredits(entity.entity_name, trackType, apiKey);
        for (const item of credits) {
          const dedupKey = `${entity.entity_name}|${item.title}|${item.media_type}`;

          results.push({
            entity_name: entity.entity_name,
            tracked_entity_id: entity.id,
            dedup_key: dedupKey,
            event_date: item.release_date,
            content: {
              type: 'movies',
              track_mode: 'person',
              person: entity.entity_name,
              title: item.title,
              media_type: item.media_type,
              release_date: item.release_date,
              url: item.link,
              track_type: trackType,
            },
          });
        }
      }
    } catch (err) {
      console.error(`Movies pipeline error for "${entity.entity_name}":`, err);
    }
  }

  return results;
}

// ─── Title mode: release dates and streaming availability ──────────

interface TitleEntity {
  id: string;
  entity_name: string;
  entity_metadata: Record<string, unknown>;
}

async function fetchTitleReleases(entity: TitleEntity, apiKey: string): Promise<PipelineResult[]> {
  let tmdbId = entity.entity_metadata.tmdb_id as number | undefined;
  let mediaType = (entity.entity_metadata.media_type as string) || 'movie';

  // Fall back to search if tmdb_id not in metadata (e.g. mobile users)
  if (!tmdbId) {
    const found = await searchTitleByName(entity.entity_name, apiKey);
    if (!found) return [];
    tmdbId = found.id;
    mediaType = found.media_type;
  }

  if (mediaType === 'tv') {
    return fetchTvReleases(entity, tmdbId, apiKey);
  }
  return fetchMovieReleases(entity, tmdbId, apiKey);
}

async function searchTitleByName(name: string, apiKey: string): Promise<{ id: number; media_type: string } | null> {
  const params = new URLSearchParams({ api_key: apiKey, query: name });
  const res = await fetch(`${TMDB_BASE}/search/multi?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;

  const data = await res.json();
  const match = (data.results || []).find(
    (r: Record<string, unknown>) => r.media_type === 'movie' || r.media_type === 'tv'
  );
  return match ? { id: match.id as number, media_type: match.media_type as string } : null;
}

async function fetchMovieReleases(entity: TitleEntity, tmdbId: number, apiKey: string): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];
  const link = `https://www.themoviedb.org/movie/${tmdbId}`;

  // Fetch release dates (AU then US fallback)
  const relRes = await fetch(
    `${TMDB_BASE}/movie/${tmdbId}/release_dates?api_key=${apiKey}`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (relRes.ok) {
    const relData = await relRes.json();
    const countries = relData.results || [];
    const au = countries.find((c: Record<string, unknown>) => c.iso_3166_1 === 'AU');
    const us = countries.find((c: Record<string, unknown>) => c.iso_3166_1 === 'US');
    const releases = (au || us)?.release_dates || [];

    const typeLabels: Record<number, string> = {
      1: 'Premiere',
      2: 'Limited Theatrical',
      3: 'Theatrical',
      4: 'Digital',
      5: 'Physical',
      6: 'TV',
    };

    const today = new Date().toISOString().slice(0, 10);
    for (const rel of releases) {
      const releaseType = typeLabels[rel.type as number] || `Type ${rel.type}`;
      const releaseDate = ((rel.release_date || '') as string).slice(0, 10);
      // Only include future release dates
      if (releaseDate && releaseDate < today) continue;
      const dedupKey = `title|${entity.entity_name}|movie|${releaseType}`;

      results.push({
        entity_name: entity.entity_name,
        tracked_entity_id: entity.id,
        dedup_key: dedupKey,
        event_date: releaseDate,
        content: {
          type: 'movies',
          track_mode: 'title',
          title: entity.entity_name,
          media_type: 'movie',
          release_type: releaseType,
          release_date: releaseDate,
          url: link,
        },
      });
    }
  }

  return results;
}

async function fetchTvReleases(entity: TitleEntity, tmdbId: number, apiKey: string): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];
  const link = `https://www.themoviedb.org/tv/${tmdbId}`;

  const res = await fetch(
    `${TMDB_BASE}/tv/${tmdbId}?api_key=${apiKey}`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const today = new Date().toISOString().slice(0, 10);

  // Premiere / first air date — only if upcoming
  if (data.first_air_date && data.first_air_date >= today) {
    results.push({
      entity_name: entity.entity_name,
      tracked_entity_id: entity.id,
      dedup_key: `title|${entity.entity_name}|tv|Premiere`,
      event_date: data.first_air_date,
      content: {
        type: 'movies',
        track_mode: 'title',
        title: entity.entity_name,
        media_type: 'tv',
        release_type: 'Premiere',
        release_date: data.first_air_date,
        url: link,
      },
    });
  }

  // Next episode to air
  if (data.next_episode_to_air) {
    const ep = data.next_episode_to_air;
    const epLabel = `S${ep.season_number}E${ep.episode_number}`;
    results.push({
      entity_name: entity.entity_name,
      tracked_entity_id: entity.id,
      dedup_key: `title|${entity.entity_name}|tv|${epLabel}`,
      event_date: ep.air_date,
      content: {
        type: 'movies',
        track_mode: 'title',
        title: entity.entity_name,
        media_type: 'tv',
        release_type: `New episode (${epLabel})`,
        release_date: ep.air_date,
        url: link,
      },
    });
  }

  // Latest season — only if upcoming
  if (data.seasons && data.seasons.length > 0) {
    const latest = data.seasons[data.seasons.length - 1];
    if (latest.air_date && latest.air_date >= today) {
      results.push({
        entity_name: entity.entity_name,
        tracked_entity_id: entity.id,
        dedup_key: `title|${entity.entity_name}|tv|Season ${latest.season_number}`,
        event_date: latest.air_date,
        content: {
          type: 'movies',
          track_mode: 'title',
          title: entity.entity_name,
          media_type: 'tv',
          release_type: `Season ${latest.season_number}`,
          release_date: latest.air_date,
          url: link,
        },
      });
    }
  }

  return results;
}

// ─── Person mode: credits (existing logic) ─────────────────────────

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

  const today = new Date().toISOString().slice(0, 10);

  // Only include upcoming projects (future date or no date = announced but unreleased)
  items = items.filter((item: Record<string, unknown>) => {
    const date = (item.release_date || item.first_air_date || '') as string;
    return !date || date >= today;
  });

  items.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const dateA = (a.release_date || a.first_air_date || '') as string;
    const dateB = (b.release_date || b.first_air_date || '') as string;
    return dateA.localeCompare(dateB);
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
