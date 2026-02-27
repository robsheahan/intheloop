import { PipelineContext, PipelineResult } from './types';

const OL_SEARCH = 'https://openlibrary.org/search.json';

interface OLDoc {
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  key: string;
  cover_i?: number;
}

export async function checkBooks(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const author = entity.entity_name;

    try {
      const books = await fetchAuthorBooks(author);
      for (const book of books) {
        const dedupKey = `${author}|${book.title}`;

        results.push({
          entity_name: author,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          content: {
            type: 'books',
            title: book.title,
            author: book.author_name?.[0] || author,
            year: book.first_publish_year,
            url: `https://openlibrary.org${book.key}`,
            cover_url: book.cover_i
              ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
              : null,
          },
        });
      }
    } catch (err) {
      console.error(`Books pipeline error for "${author}":`, err);
    }
  }

  return results;
}

async function fetchAuthorBooks(author: string): Promise<OLDoc[]> {
  const params = new URLSearchParams({
    author: author,
    sort: 'new',
    limit: '10',
    fields: 'title,author_name,first_publish_year,key,cover_i',
  });

  const res = await fetch(`${OL_SEARCH}?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  return data.docs || [];
}
