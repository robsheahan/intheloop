import { PipelineFunction } from './types';
import { checkMusic } from './music';
import { checkBooks } from './books';
import { checkNews } from './news';
import { checkCrypto } from './crypto';
import { checkStocks } from './stocks';
import { checkMovies } from './movies';
import { checkTours } from './tours';
import { checkGithub } from './github';
import { checkSteam } from './steam';
import { checkPodcasts } from './podcasts';
import { checkWeather } from './weather';
import { checkReddit } from './reddit';
import { checkCurrency } from './currency';

export const PIPELINE_MAP: Record<string, PipelineFunction> = {
  music: checkMusic,
  tours: checkTours,
  books: checkBooks,
  crypto: checkCrypto,
  stocks: checkStocks,
  movies: checkMovies,
  news: checkNews,
  github: checkGithub,
  steam: checkSteam,
  podcasts: checkPodcasts,
  weather: checkWeather,
  reddit: checkReddit,
  currency: checkCurrency,
};

export function getPipeline(slug: string): PipelineFunction | undefined {
  return PIPELINE_MAP[slug];
}

export function getAllPipelineSlugs(): string[] {
  return Object.keys(PIPELINE_MAP);
}
