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
      if (content.track_mode === 'title') {
        return `${content.title}`;
      }
      return `${content.title} (${content.media_type})`;
    case 'tours':
      return `${content.title} - ${content.artist}`;
    case 'github':
      return `${content.repo}: ${content.tag}`;
    case 'steam':
      return `${content.name}: ${content.discount_percent}% off`;
    case 'podcasts':
      if (content.track_mode === 'show') {
        return `${content.episode_title}`;
      }
      return `${content.episode_title} — ${content.podcast_name}`;
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
      if (content.track_mode === 'title') {
        const parts: string[] = [];
        if (content.release_type) parts.push(content.release_type as string);
        if (content.release_date) parts.push(content.release_date as string);
        return parts.join(': ') || '';
      }
      return content.release_date ? `Release: ${content.release_date}` : '';
    case 'tours':
      return [
        content.date ? new Date(content.date as string).toLocaleDateString() : '',
        content.country as string || '',
      ].filter(Boolean).join(' · ');
    case 'github':
      return (content.release_name as string) || '';
    case 'steam':
      return `Original: $${content.original_price} | Sale: $${content.sale_price}`;
    case 'podcasts':
      if (content.track_mode === 'show') {
        return content.published ? `New episode · ${new Date(content.published as string).toLocaleDateString()}` : 'New episode';
      }
      return content.published ? new Date(content.published as string).toLocaleDateString() : '';
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
