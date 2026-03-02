import {
  Music, MapPin, BookOpen, Bitcoin, TrendingUp, Film,
  Newspaper, Github, Gamepad2, Podcast, Cloud, MessageSquare, DollarSign,
} from 'lucide-react';

export { CATEGORY_COLORS, getCategoryColor } from '@tmw/shared/utils/category-colors';

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

export function getCategoryIcon(slug: string) {
  return CATEGORY_ICONS[slug] || Newspaper;
}
