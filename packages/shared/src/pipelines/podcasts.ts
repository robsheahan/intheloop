import { PipelineContext, PipelineResult } from './types';

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

export async function checkPodcasts(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const trackMode = (entity.entity_metadata?.track_mode as string) || 'guest';

    try {
      if (trackMode === 'show') {
        const episodes = await fetchShowEpisodes(entity.entity_name);
        for (const ep of episodes) {
          const dedupKey = `show|${entity.entity_name}|${ep.episodeTitle}`;

          results.push({
            entity_name: entity.entity_name,
            tracked_entity_id: entity.id,
            dedup_key: dedupKey,
            event_date: ep.published,
            content: {
              type: 'podcasts',
              track_mode: 'show',
              podcast_name: entity.entity_name,
              episode_title: ep.episodeTitle,
              published: ep.published,
              duration_ms: ep.durationMs,
              url: ep.link,
            },
          });
        }
      } else {
        const episodes = await fetchGuestEpisodes(entity.entity_name);
        for (const ep of episodes) {
          const dedupKey = `guest|${entity.entity_name}|${ep.podcastName}|${ep.episodeTitle}`;

          results.push({
            entity_name: entity.entity_name,
            tracked_entity_id: entity.id,
            dedup_key: dedupKey,
            event_date: ep.published,
            content: {
              type: 'podcasts',
              track_mode: 'guest',
              person: entity.entity_name,
              podcast_name: ep.podcastName,
              episode_title: ep.episodeTitle,
              published: ep.published,
              duration_ms: ep.durationMs,
              url: ep.link,
            },
          });
        }
      }
    } catch (err) {
      console.error(`Podcasts pipeline error for "${entity.entity_name}":`, err);
    }
  }

  return results;
}

interface Episode {
  podcastName: string;
  episodeTitle: string;
  published: string;
  durationMs: number;
  link: string;
}

async function fetchShowEpisodes(podcastName: string): Promise<Episode[]> {
  const params = new URLSearchParams({
    term: podcastName,
    media: 'podcast',
    entity: 'podcastEpisode',
    limit: '20',
  });

  const res = await fetch(`${ITUNES_SEARCH_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const episodes: Episode[] = [];
  const nameLower = podcastName.toLowerCase();

  for (const item of data.results || []) {
    if (item.wrapperType !== 'podcastEpisode') continue;

    // Only include episodes from the specific podcast
    const collectionName = (item.collectionName || '') as string;
    if (collectionName.toLowerCase() !== nameLower) continue;

    episodes.push({
      podcastName: collectionName,
      episodeTitle: (item.trackName || '') as string,
      published: item.releaseDate || '',
      durationMs: item.trackTimeMillis || 0,
      link: item.trackViewUrl || '',
    });
  }

  return episodes;
}

async function fetchGuestEpisodes(personName: string): Promise<Episode[]> {
  const params = new URLSearchParams({
    term: personName,
    media: 'podcast',
    entity: 'podcastEpisode',
    limit: '20',
  });

  const res = await fetch(`${ITUNES_SEARCH_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const episodes: Episode[] = [];
  const nameLower = personName.toLowerCase();

  for (const item of data.results || []) {
    if (item.wrapperType !== 'podcastEpisode') continue;

    const title = (item.trackName || '') as string;
    const description = (item.description || item.shortDescription || '') as string;

    // Only include episodes where the person's name appears in the title or description
    if (
      !title.toLowerCase().includes(nameLower) &&
      !description.toLowerCase().includes(nameLower)
    ) continue;

    episodes.push({
      podcastName: item.collectionName || '',
      episodeTitle: title,
      published: item.releaseDate || '',
      durationMs: item.trackTimeMillis || 0,
      link: item.trackViewUrl || '',
    });
  }

  return episodes;
}
