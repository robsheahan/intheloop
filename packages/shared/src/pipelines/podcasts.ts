import { PipelineContext, PipelineResult } from './types';

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

export async function checkPodcasts(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const personName = entity.entity_name;

    try {
      const episodes = await fetchGuestEpisodes(personName);
      for (const ep of episodes) {
        const dedupKey = `${personName}|${ep.podcastName}|${ep.episodeTitle}`;

        results.push({
          entity_name: personName,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          event_date: ep.published,
          content: {
            type: 'podcasts',
            person: personName,
            podcast_name: ep.podcastName,
            episode_title: ep.episodeTitle,
            published: ep.published,
            duration_ms: ep.durationMs,
            url: ep.link,
          },
        });
      }
    } catch (err) {
      console.error(`Podcasts pipeline error for "${personName}":`, err);
    }
  }

  return results;
}

interface GuestEpisode {
  podcastName: string;
  episodeTitle: string;
  published: string;
  durationMs: number;
  link: string;
}

async function fetchGuestEpisodes(personName: string): Promise<GuestEpisode[]> {
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
  const episodes: GuestEpisode[] = [];
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
