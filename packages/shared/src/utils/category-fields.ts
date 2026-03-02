export interface CategoryField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'autocomplete';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  searchSlug?: string;
  visibleWhen?: { field: string; value: string };
}

export interface EntityOverride {
  entityLabel: string;
  entityPlaceholder: string;
  searchSlug?: string;
}

export interface CategoryFormConfig {
  entityLabel: string;
  entityPlaceholder: string;
  fields: CategoryField[];
  entityOverrides?: Record<string, EntityOverride>;
}

export const CATEGORY_FORM_CONFIGS: Record<string, CategoryFormConfig> = {
  music: {
    entityLabel: 'Artist name',
    entityPlaceholder: 'e.g. Radiohead',
    fields: [
      {
        name: 'release_type',
        label: 'Release type',
        type: 'select',
        options: [
          { label: 'All', value: 'all' },
          { label: 'Albums only', value: 'album' },
          { label: 'Singles only', value: 'single' },
        ],
      },
    ],
  },
  tours: {
    entityLabel: 'Artist name',
    entityPlaceholder: 'e.g. Taylor Swift',
    fields: [
      { name: 'city', label: 'City', type: 'autocomplete', required: true, placeholder: 'e.g. Melbourne', searchSlug: 'cities' },
    ],
  },
  books: {
    entityLabel: 'Author name',
    entityPlaceholder: 'e.g. Brandon Sanderson',
    fields: [],
  },
  crypto: {
    entityLabel: 'Cryptocurrency',
    entityPlaceholder: 'e.g. BTC',
    fields: [
      { name: 'target_price', label: 'Target price (USD)', type: 'number', required: true, placeholder: '50000' },
      {
        name: 'direction',
        label: 'Alert when price goes',
        type: 'select',
        required: true,
        options: [
          { label: 'Above', value: 'above' },
          { label: 'Below', value: 'below' },
        ],
      },
    ],
  },
  stocks: {
    entityLabel: 'Stock symbol',
    entityPlaceholder: 'e.g. AAPL',
    fields: [
      { name: 'target_price', label: 'Target price', type: 'number', required: true, placeholder: '150' },
      {
        name: 'direction',
        label: 'Alert when price goes',
        type: 'select',
        required: true,
        options: [
          { label: 'Above', value: 'above' },
          { label: 'Below', value: 'below' },
        ],
      },
    ],
  },
  movies: {
    entityLabel: 'Person name',
    entityPlaceholder: 'e.g. Christopher Nolan',
    fields: [
      {
        name: 'track_mode',
        label: 'What do you want to track?',
        type: 'select',
        required: true,
        options: [
          { label: 'A person (actor/director)', value: 'person' },
          { label: 'A movie or TV show', value: 'title' },
        ],
      },
      {
        name: 'track_type',
        label: 'Track as',
        type: 'select',
        required: true,
        options: [
          { label: 'Actor', value: 'actor' },
          { label: 'Director', value: 'director' },
        ],
        visibleWhen: { field: 'track_mode', value: 'person' },
      },
    ],
    entityOverrides: {
      'track_mode:title': {
        entityLabel: 'Movie or TV show',
        entityPlaceholder: 'e.g. Oppenheimer',
        searchSlug: 'movie-titles',
      },
    },
  },
  news: {
    entityLabel: 'Keyword',
    entityPlaceholder: 'e.g. artificial intelligence',
    fields: [],
  },
  github: {
    entityLabel: 'Repository (owner/repo)',
    entityPlaceholder: 'e.g. vercel/next.js',
    fields: [],
  },
  steam: {
    entityLabel: 'Game name',
    entityPlaceholder: 'e.g. Elden Ring',
    fields: [],
  },
  podcasts: {
    entityLabel: 'Person name',
    entityPlaceholder: 'e.g. Elon Musk',
    fields: [],
  },
  weather: {
    entityLabel: 'City',
    entityPlaceholder: 'e.g. Melbourne',
    fields: [
      {
        name: 'alert_type',
        label: 'Alert type',
        type: 'select',
        required: true,
        options: [
          { label: 'Temperature above', value: 'temp_above' },
          { label: 'Temperature below', value: 'temp_below' },
          { label: 'Rain above (mm)', value: 'rain_above' },
          { label: 'Wind above (km/h)', value: 'wind_above' },
        ],
      },
      { name: 'threshold', label: 'Threshold value', type: 'number', required: true, placeholder: '35' },
    ],
  },
  reddit: {
    entityLabel: 'Keyword',
    entityPlaceholder: 'e.g. typescript',
    fields: [
      { name: 'subreddit', label: 'Subreddit (optional)', type: 'text', placeholder: 'e.g. programming' },
    ],
  },
  currency: {
    entityLabel: 'Currency pair (FROM/TO)',
    entityPlaceholder: 'e.g. USD/AUD',
    fields: [
      { name: 'target_rate', label: 'Target rate', type: 'number', required: true, placeholder: '1.55' },
      {
        name: 'direction',
        label: 'Alert when rate goes',
        type: 'select',
        required: true,
        options: [
          { label: 'Above', value: 'above' },
          { label: 'Below', value: 'below' },
        ],
      },
    ],
  },
};
