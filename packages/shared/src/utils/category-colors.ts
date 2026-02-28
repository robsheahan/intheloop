export const CATEGORY_COLORS: Record<string, string> = {
  music: '#e11d48',
  tours: '#7c3aed',
  books: '#2563eb',
  crypto: '#f59e0b',
  stocks: '#10b981',
  movies: '#ec4899',
  news: '#6366f1',
  github: '#1f2937',
  steam: '#1e40af',
  podcasts: '#8b5cf6',
  weather: '#0ea5e9',
  reddit: '#f97316',
  currency: '#14b8a6',
};

export function getCategoryColor(slug: string): string {
  return CATEGORY_COLORS[slug] || '#6b7280';
}
