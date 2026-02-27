'use client';

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertHistory } from '@/types/database';
import { formatRelativeTime } from '@/lib/utils/formatting';
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/categories';

interface Props {
  alert: AlertHistory;
  onMarkSeen?: (id: string) => void;
  showCategory?: boolean;
}

export function AlertCard({ alert, onMarkSeen, showCategory = false }: Props) {
  const content = alert.content;
  const type = content.type as string;
  const isUnseen = !alert.seen_at;
  const categorySlug = (alert.tracked_entity?.category?.slug) || '';
  const Icon = getCategoryIcon(categorySlug);
  const color = getCategoryColor(categorySlug);

  return (
    <div
      className={`rounded-lg border p-3 space-y-1 ${
        isUnseen ? 'bg-muted/30 border-primary/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showCategory && (
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
          )}
          <span className="font-medium text-sm truncate">
            {renderTitle(content, type)}
          </span>
          {isUnseen && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              New
            </Badge>
          )}
        </div>
        {isUnseen && onMarkSeen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onMarkSeen(alert.id)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {renderDescription(content, type)}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{alert.tracked_entity?.entity_name}</span>
        <span>&middot;</span>
        <span>{formatRelativeTime(alert.created_at)}</span>
        {typeof content.url === 'string' && content.url && (
          <>
            <span>&middot;</span>
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              View
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function renderTitle(content: Record<string, unknown>, type: string): string {
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

function renderDescription(content: Record<string, unknown>, type: string): string {
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
