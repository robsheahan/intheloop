import { SearchSuggestion } from './types';

export async function searchBooks(query: string): Promise<SearchSuggestion[]> {
  const params = new URLSearchParams({
    q: `inauthor:"${query}"`,
    maxResults: '8',
    printType: 'books',
  });

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) params.set('key', apiKey);

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  const authorSet = new Map<string, string>();
  for (const item of data.items || []) {
    const authors: string[] = item.volumeInfo?.authors || [];
    for (const name of authors) {
      if (name.toLowerCase().includes(query.toLowerCase()) && !authorSet.has(name.toLowerCase())) {
        authorSet.set(name.toLowerCase(), name);
      }
    }
  }

  return Array.from(authorSet.values()).slice(0, 8).map((name) => ({
    value: name,
    label: name,
  }));
}
