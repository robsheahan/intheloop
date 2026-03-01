import { PipelineContext, PipelineResult } from './types';

const REDDIT_SEARCH_URL = 'https://www.reddit.com/search.json';
const USER_AGENT = 'InTheLoop/1.0 (personal project)';

export async function checkReddit(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const keyword = entity.entity_name;
    const subreddit = ((entity.entity_metadata.subreddit as string) || '').trim();

    try {
      const posts = await fetchPosts(keyword, subreddit);
      for (const post of posts) {
        const dedupKey = `${keyword}|${post.title}`;

        results.push({
          entity_name: keyword,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          event_date: post.createdUtc ? new Date(post.createdUtc * 1000).toISOString() : undefined,
          content: {
            type: 'reddit',
            keyword,
            title: post.title,
            subreddit: post.subreddit,
            score: post.score,
            num_comments: post.numComments,
            author: post.author,
            url: post.link,
          },
        });
      }
    } catch (err) {
      console.error(`Reddit pipeline error for "${keyword}":`, err);
    }
  }

  return results;
}

interface RedditPost {
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  author: string;
  link: string;
  createdUtc: number;
}

async function fetchPosts(keyword: string, subreddit: string): Promise<RedditPost[]> {
  let url: string;
  const params = new URLSearchParams({
    q: keyword,
    sort: 'new',
    limit: '10',
    t: 'week',
  });

  if (subreddit) {
    url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/search.json`;
    params.set('restrict_sr', 'on');
  } else {
    url = REDDIT_SEARCH_URL;
  }

  const res = await fetch(`${url}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const posts: RedditPost[] = [];

  for (const child of data?.data?.children || []) {
    const post = child.data;
    posts.push({
      title: post.title || '',
      subreddit: post.subreddit || '',
      score: post.score || 0,
      numComments: post.num_comments || 0,
      author: post.author || '',
      link: `https://reddit.com${post.permalink || ''}`,
      createdUtc: post.created_utc || 0,
    });
  }

  return posts;
}
