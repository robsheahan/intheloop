import { SearchFunction } from './types';
import { searchMusic } from './music';
import { searchBooks } from './books';
import { searchCrypto } from './crypto';
import { searchStocks } from './stocks';
import { searchMovies } from './movies';
import { searchGithub } from './github';
import { searchSteam } from './steam';

import { searchWeather } from './weather';
import { searchCurrency } from './currency';

// Tours uses the same artist search as music
const SEARCH_MAP: Record<string, SearchFunction> = {
  music: searchMusic,
  tours: searchMusic,
  books: searchBooks,
  crypto: searchCrypto,
  stocks: searchStocks,
  movies: searchMovies,
  github: searchGithub,
  steam: searchSteam,
  weather: searchWeather,
  currency: searchCurrency,
  cities: searchWeather,
  // news and reddit are freeform keywords — no search
};

export function getSearchFunction(slug: string): SearchFunction | undefined {
  return SEARCH_MAP[slug];
}

export function hasSearch(slug: string): boolean {
  return slug in SEARCH_MAP;
}
