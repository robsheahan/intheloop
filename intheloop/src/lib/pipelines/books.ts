import { PipelineContext, PipelineResult } from './types';

const GB_SEARCH = 'https://www.googleapis.com/books/v1/volumes';

interface GBVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    language?: string;
    infoLink?: string;
    imageLinks?: { thumbnail?: string };
  };
}

export async function checkBooks(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const author = entity.entity_name;

    try {
      const books = await fetchAuthorBooks(author);
      for (const book of books) {
        const vi = book.volumeInfo;
        const year = vi.publishedDate ? vi.publishedDate.slice(0, 4) : null;
        const dedupKey = `${author}|${vi.title}`;

        results.push({
          entity_name: author,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          content: {
            type: 'books',
            title: vi.title,
            author: vi.authors?.[0] || author,
            year: year ? parseInt(year, 10) : null,
            url: vi.infoLink || `https://books.google.com/books?id=${book.id}`,
            cover_url: vi.imageLinks?.thumbnail || null,
          },
        });
      }
    } catch (err) {
      console.error(`Books pipeline error for "${author}":`, err);
    }
  }

  return results;
}

async function fetchAuthorBooks(author: string): Promise<GBVolume[]> {
  // Run three queries to maximize coverage:
  // 1. inauthor: ordered by newest
  // 2. inauthor: ordered by relevance
  // 3. Plain author name search (catches books not indexed under inauthor:)
  const [newestItems, relevanceItems, plainItems] = await Promise.all([
    fetchGBQuery(`inauthor:"${author}"`, 'newest'),
    fetchGBQuery(`inauthor:"${author}"`, 'relevance'),
    fetchGBQuery(`"${author}"`, 'newest'),
  ]);

  // Merge and deduplicate by volume id
  const seenIds = new Set<string>();
  const merged: GBVolume[] = [];
  for (const item of [...newestItems, ...relevanceItems, ...plainItems]) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      merged.push(item);
    }
  }

  // Filter to English books actually authored by the tracked author
  const authorLower = author.toLowerCase();
  const filtered = merged.filter((item) => {
    const vi = item.volumeInfo;
    if (vi.language && vi.language !== 'en') return false;
    return vi.authors?.some((name) => name.toLowerCase() === authorLower);
  });

  // Deduplicate by normalized title (different editions get different volume IDs)
  const seenTitles = new Set<string>();
  const unique: GBVolume[] = [];
  for (const item of filtered) {
    const key = item.volumeInfo.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      unique.push(item);
    }
  }
  return unique;
}

async function fetchGBQuery(query: string, orderBy: string): Promise<GBVolume[]> {
  const params = new URLSearchParams({
    q: query,
    orderBy,
    maxResults: '40',
    printType: 'books',
    langRestrict: 'en',
  });

  const res = await fetch(`${GB_SEARCH}?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  return data.items || [];
}
