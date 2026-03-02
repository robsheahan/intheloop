interface DigestAlert {
  title: string;
  description: string;
  entity: string;
  url: string | null;
}

interface CategorySection {
  name: string;
  color: string;
  alerts: DigestAlert[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildDigestHtml(sections: CategorySection[]): string {
  const categoryBlocks = sections
    .map((section) => {
      const items = section.alerts
        .map(
          (a) => `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f4f4f5;">
                <p style="margin: 0; color: #18181b; font-size: 14px; font-weight: 500;">${escapeHtml(a.title)}</p>
                ${a.description ? `<p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">${escapeHtml(a.description)}</p>` : ''}
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 12px;">
                  ${escapeHtml(a.entity)}${a.url ? ` &middot; <a href="${escapeHtml(a.url)}" style="color: #2563eb; text-decoration: none;">View</a>` : ''}
                </p>
              </td>
            </tr>`
        )
        .join('');

      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding-bottom: 8px; border-bottom: 2px solid ${section.color};">
              <h2 style="margin: 0; color: #18181b; font-size: 16px; font-weight: 600;">${escapeHtml(section.name)}</h2>
            </td>
          </tr>
          ${items}
        </table>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #18181b; padding: 24px 24px 20px;">
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600;">Tell Me When — Daily Digest</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <p style="margin: 0 0 20px; color: #52525b; font-size: 14px; line-height: 1.5;">
                Here's what's new since your last digest:
              </p>
              ${categoryBlocks}
              <p style="margin: 16px 0 0; color: #a1a1aa; font-size: 12px; line-height: 1.5;">
                Manage which categories you receive emails for in your Settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Reuse the same title/description logic as AlertCard
export function renderAlertTitle(content: Record<string, unknown>, type: string): string {
  switch (type) {
    case 'music':
      return `${content.title} - ${content.artist}`;
    case 'books':
      return `${content.title} by ${content.author}`;
    case 'news':
      return content.title as string;
    case 'crypto':
      return `${content.instrument}: $${content.price}`;
    case 'stocks':
      return `${content.symbol}: $${content.price}`;
    case 'movies':
      return `${content.title} (${content.media_type})`;
    case 'tours':
      return `${content.title} - ${content.artist}`;
    case 'github':
      return `${content.repo}: ${content.tag}`;
    case 'steam':
      return `${content.name}: ${content.discount_percent}% off`;
    case 'podcasts':
      return content.episode_title as string;
    case 'weather':
      return `${content.city}: ${content.alert_type} alert`;
    case 'reddit':
      return content.title as string;
    case 'currency':
      return `${content.pair}: ${content.rate}`;
    default:
      return (content.title as string) || 'Alert';
  }
}

export function renderAlertDescription(content: Record<string, unknown>, type: string): string {
  switch (type) {
    case 'music':
      return `${content.release_type} released ${content.release_date ? new Date(content.release_date as string).toLocaleDateString() : ''}`;
    case 'books':
      return content.year ? `Published ${content.year}` : '';
    case 'news':
      return `Source: ${content.source}`;
    case 'crypto':
      return `Price went ${content.direction} target of $${content.target_price}`;
    case 'stocks':
      return `Price went ${content.direction} target of $${content.target_price}`;
    case 'movies':
      return content.release_date ? `Release: ${content.release_date}` : '';
    case 'tours':
      return content.release_type as string || '';
    case 'github':
      return (content.release_name as string) || '';
    case 'steam':
      return `Original: $${content.original_price} | Sale: $${content.sale_price}`;
    case 'podcasts':
      return content.podcast_name as string || '';
    case 'weather':
      return `Value: ${content.value}, Threshold: ${content.threshold}`;
    case 'reddit':
      return `r/${content.subreddit} | Score: ${content.score}`;
    case 'currency':
      return `Rate went ${content.direction} target of ${content.target_rate}`;
    default:
      return (content.description as string) || '';
  }
}
