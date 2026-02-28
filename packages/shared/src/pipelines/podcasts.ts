import { PipelineContext, PipelineResult } from './types';

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const ITUNES_LOOKUP_URL = 'https://itunes.apple.com/lookup';

export async function checkPodcasts(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const podcastName = entity.entity_name;

    try {
      const episodes = await fetchEpisodes(podcastName);
      for (const ep of episodes) {
        const dedupKey = `${podcastName}|${ep.episodeTitle}`;

        results.push({
          entity_name: podcastName,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          content: {
            type: 'podcasts',
            podcast_name: podcastName,
            episode_title: ep.episodeTitle,
            published: ep.published,
            duration_ms: ep.durationMs,
            url: ep.link,
          },
        });
      }
    } catch (err) {
      console.error(`Podcasts pipeline error for "${podcastName}":`, err);
    }
  }

  return results;
}

interface PodcastEpisode {
  episodeTitle: string;
  published: string;
  durationMs: number;
  link: string;
}

async function fetchEpisodes(podcastName: string): Promise<PodcastEpisode[]> {
  const searchParams = new URLSearchParams({
    term: podcastName,
    media: 'podcast',
    entity: 'podcast',
    limit: '1',
  });

  const searchRes = await fetch(`${ITUNES_SEARCH_URL}?${searchParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!searchRes.ok) return [];

  const searchData = await searchRes.json();
  const podcasts = searchData.results || [];
  if (podcasts.length === 0) return [];

  const collectionId = podcasts[0].collectionId;
  if (!collectionId) return [];

  const lookupParams = new URLSearchParams({
    id: String(collectionId),
    media: 'podcast',
    entity: 'podcastEpisode',
    limit: '10',
  });

  const lookupRes = await fetch(`${ITUNES_LOOKUP_URL}?${lookupParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!lookupRes.ok) return [];

  const lookupData = await lookupRes.json();
  const episodes: PodcastEpisode[] = [];

  for (const item of lookupData.results || []) {
    if (item.wrapperType !== 'podcastEpisode') continue;

    episodes.push({
      episodeTitle: item.trackName || '',
      published: item.releaseDate || '',
      durationMs: item.trackTimeMillis || 0,
      link: item.trackViewUrl || '',
    });
  }

  return episodes;
}
