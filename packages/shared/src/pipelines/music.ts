import { PipelineContext, PipelineResult } from './types';

const ITUNES_SEARCH = 'https://itunes.apple.com/search';

interface ITunesResult {
  collectionName?: string;
  trackName?: string;
  artistName: string;
  releaseDate: string;
  collectionType?: string;
  artworkUrl100?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
  wrapperType: string;
}

export async function checkMusic(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const releaseType = (entity.entity_metadata.release_type as string) || 'all';
    const artist = entity.entity_name;

    try {
      const items = await fetchReleases(artist, releaseType);
      for (const item of items) {
        const title = item.collectionName || item.trackName || 'Unknown';
        const dedupKey = `${artist}|${title}`;

        results.push({
          entity_name: artist,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          event_date: item.releaseDate,
          content: {
            type: 'music',
            title,
            artist: item.artistName,
            release_date: item.releaseDate,
            artwork_url: item.artworkUrl100,
            url: item.collectionViewUrl || item.trackViewUrl,
            release_type: item.collectionType || item.wrapperType,
          },
        });
      }
    } catch (err) {
      console.error(`Music pipeline error for "${artist}":`, err);
    }
  }

  return results;
}

async function fetchReleases(artist: string, releaseType: string): Promise<ITunesResult[]> {
  const params = new URLSearchParams({
    term: artist,
    media: 'music',
    limit: '20',
  });

  if (releaseType === 'album') {
    params.set('entity', 'album');
  } else if (releaseType === 'single') {
    params.set('entity', 'song');
  } else {
    params.set('entity', 'album');
  }

  const res = await fetch(`${ITUNES_SEARCH}?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).filter(
    (r: ITunesResult) => r.artistName.toLowerCase() === artist.toLowerCase()
  );
}
