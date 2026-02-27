import { PipelineContext, PipelineResult } from './types';

const GB_SEARCH = 'https://www.googleapis.com/books/v1/volumes';

interface GBVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
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
  const params = new URLSearchParams({
    q: `inauthor:"${author}"`,
    orderBy: 'newest',
    maxResults: '10',
    printType: 'books',
  });

  const res = await fetch(`${GB_SEARCH}?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const items: GBVolume[] = data.items || [];

  // Filter to books actually authored by the tracked author
  const authorLower = author.toLowerCase();
  return items.filter((item) =>
    item.volumeInfo.authors?.some((name) =>
      name.toLowerCase() === authorLower
    )
  );
}
