import { PipelineContext, PipelineResult } from './types';

const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search';

export async function checkNews(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const keyword = entity.entity_name;

    try {
      const articles = await fetchNewsArticles(keyword);
      for (const article of articles) {
        const dedupKey = `${keyword}|${article.title}`;

        results.push({
          entity_name: keyword,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          event_date: article.pubDate || undefined,
          content: {
            type: 'news',
            title: article.title,
            url: article.link,
            source: article.source,
            published: article.pubDate,
          },
        });
      }
    } catch (err) {
      console.error(`News pipeline error for "${keyword}":`, err);
    }
  }

  return results;
}

interface NewsArticle {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

async function fetchNewsArticles(keyword: string): Promise<NewsArticle[]> {
  const url = `${GOOGLE_NEWS_RSS}?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const xml = await res.text();
  return parseRSS(xml).slice(0, 10);
}

function parseRSS(xml: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const source = extractTag(itemXml, 'source');
    const pubDate = extractTag(itemXml, 'pubDate');

    if (title && link) {
      items.push({ title, link, source: source || 'Unknown', pubDate: pubDate || '' });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's');
  const match = regex.exec(xml);
  return match?.[1]?.trim() || '';
}
