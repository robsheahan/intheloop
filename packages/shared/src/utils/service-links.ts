const MUSIC_CATEGORIES = new Set(['music', 'tours', 'podcasts']);

function searchUrl(service: string, query: string): string {
  const q = encodeURIComponent(query);
  switch (service) {
    case 'spotify':
      return `https://open.spotify.com/search/${q}`;
    case 'youtube_music':
      return `https://music.youtube.com/search?q=${q}`;
    case 'amazon_music':
      return `https://music.amazon.com/search/${q}`;
    default:
      return '';
  }
}

export function getServiceUrl(
  service: string | null | undefined,
  content: Record<string, unknown>,
  type: string,
): string | null {
  const originalUrl = typeof content.url === 'string' ? content.url : null;

  // Only transform for music-related categories
  if (!service || service === 'apple' || !MUSIC_CATEGORIES.has(type)) {
    return originalUrl;
  }

  let query = '';
  switch (type) {
    case 'music':
      query = [content.artist, content.title].filter(Boolean).join(' ');
      break;
    case 'tours':
      query = (content.artist as string) || (content.title as string) || '';
      break;
    case 'podcasts':
      query = [content.podcast_name, content.episode_title].filter(Boolean).join(' ');
      break;
  }

  if (!query) return originalUrl;

  const url = searchUrl(service, query);
  return url || originalUrl;
}
