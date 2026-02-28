import { PipelineContext, PipelineResult } from './types';

const GITHUB_API = 'https://api.github.com/repos';

export async function checkGithub(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const repo = entity.entity_name;

    try {
      const releases = await fetchReleases(repo);
      for (const rel of releases) {
        const dedupKey = `${repo}|${rel.tag}`;

        results.push({
          entity_name: repo,
          tracked_entity_id: entity.id,
          dedup_key: dedupKey,
          content: {
            type: 'github',
            repo,
            tag: rel.tag,
            release_name: rel.name,
            published: rel.published,
            url: rel.link,
            prerelease: rel.prerelease,
          },
        });
      }
    } catch (err) {
      console.error(`GitHub pipeline error for "${repo}":`, err);
    }
  }

  return results;
}

interface GHRelease {
  tag: string;
  name: string;
  published: string;
  link: string;
  prerelease: boolean;
}

async function fetchReleases(repo: string): Promise<GHRelease[]> {
  const res = await fetch(`${GITHUB_API}/${repo}/releases?per_page=10`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data || []).map((rel: Record<string, unknown>) => ({
    tag: rel.tag_name || '',
    name: (rel.name || rel.tag_name || '') as string,
    published: (rel.published_at || '') as string,
    link: (rel.html_url || '') as string,
    prerelease: !!rel.prerelease,
  }));
}
