import {
  Music, MapPin, BookOpen, Bitcoin, TrendingUp, Film,
  Newspaper, Github, Gamepad2, Podcast, Cloud, MessageSquare, DollarSign,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, typeof Music> = {
  music: Music,
  tours: MapPin,
  books: BookOpen,
  crypto: Bitcoin,
  stocks: TrendingUp,
  movies: Film,
  news: Newspaper,
  github: Github,
  steam: Gamepad2,
  podcasts: Podcast,
  weather: Cloud,
  reddit: MessageSquare,
  currency: DollarSign,
};

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

export function getCategoryIcon(slug: string) {
  return CATEGORY_ICONS[slug] || Newspaper;
}

export function getCategoryColor(slug: string) {
  return CATEGORY_COLORS[slug] || '#6b7280';
}
