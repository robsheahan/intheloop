import { SearchSuggestion } from './types';

let spotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (spotifyToken && Date.now() < spotifyToken.expiresAt) {
    return spotifyToken.token;
  }

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    spotifyToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return spotifyToken.token;
  } catch {
    return null;
  }
}

async function searchSpotify(query: string): Promise<SearchSuggestion[]> {
  const token = await getSpotifyToken();
  if (!token) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      type: 'show',
      limit: '8',
    });
    const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.shows?.items || []).map((s: Record<string, unknown>) => ({
      value: s.name as string,
      label: s.name as string,
      subtitle: s.publisher as string || undefined,
      imageUrl: ((s.images as { url: string }[]) || [])[0]?.url || undefined,
    }));
  } catch {
    return [];
  }
}

async function searchItunes(query: string): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams({
    term: query,
    media: 'podcast',
    entity: 'podcast',
    limit: '8',
  });

  try {
    const res = await fetch(`https://itunes.apple.com/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.results || []).map((p: Record<string, unknown>) => ({
      value: p.collectionName as string,
      label: p.collectionName as string,
      subtitle: p.artistName as string || undefined,
      imageUrl: p.artworkUrl60 as string || undefined,
    }));
  } catch {
    return [];
  }
}

export async function searchPodcasts(query: string): Promise<SearchSuggestion[]> {
  const [itunesResults, spotifyResults] = await Promise.all([
    searchItunes(query),
    searchSpotify(query),
  ]);

  // Merge results, deduplicating by lowercase name
  const seen = new Set<string>();
  const merged: SearchSuggestion[] = [];

  for (const item of [...itunesResults, ...spotifyResults]) {
    const key = item.value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged.slice(0, 10);
}
