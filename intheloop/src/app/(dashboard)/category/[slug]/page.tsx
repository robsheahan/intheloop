'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useCategories } from '@/lib/hooks/useCategories';
import { useAlerts, useMarkSeen, useMarkAllSeen } from '@/lib/hooks/useAlerts';
import { AlertHistory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/categories';


function sortNewestFirst(alerts: AlertHistory[]): AlertHistory[] {
  return [...alerts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

function renderDetail(content: Record<string, unknown>, type: string): string {
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
      return (content.release_type as string) || '';
    case 'github':
      return (content.release_name as string) || '';
    case 'steam':
      return `Original: $${content.original_price} | Sale: $${content.sale_price}`;
    case 'podcasts':
      return (content.podcast_name as string) || '';
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

function AlertTable({
  alerts,
  onMarkSeen,
}: {
  alerts: AlertHistory[];
  onMarkSeen?: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Detail</TableHead>
          <TableHead className="w-16">Status</TableHead>
          <TableHead className="w-20 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((a) => {
          const type = a.content.type as string;
          const isUnseen = !a.seen_at;
          const url = typeof a.content.url === 'string' ? a.content.url : null;

          return (
            <TableRow
              key={a.id}
              className={isUnseen ? 'bg-muted/30' : ''}
            >
              <TableCell className="font-medium max-w-[300px] truncate">
                {renderTitle(a.content, type)}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[300px] truncate">
                {renderDetail(a.content, type)}
              </TableCell>
              <TableCell>
                {isUnseen && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    New
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {isUnseen && onMarkSeen && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onMarkSeen(a.id)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      View
                    </a>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: categories } = useCategories();
  const { data: alerts, isLoading } = useAlerts(slug);
  const markSeen = useMarkSeen();
  const markAllSeen = useMarkAllSeen();

  const category = categories?.find((c) => c.slug === slug);
  const Icon = getCategoryIcon(slug);
  const color = getCategoryColor(slug);

  const unseenAlerts = (alerts || []).filter((a) => !a.seen_at);
  const seenAlerts = (alerts || []).filter((a) => a.seen_at);

  const sortedUnseen = sortNewestFirst(unseenAlerts);
  const sortedSeen = sortNewestFirst(seenAlerts);

  const handleMarkAllSeen = async () => {
    try {
      await markAllSeen.mutateAsync(slug);
      toast.success('All alerts marked as seen');
    } catch {
      toast.error('Failed to mark alerts');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6" style={{ color }} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {category?.name || slug}
            </h1>
            {category?.description && (
              <p className="text-muted-foreground text-sm">{category.description}</p>
            )}
          </div>
        </div>
        {unseenAlerts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllSeen}
            disabled={markAllSeen.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all seen
          </Button>
        )}
      </div>

      {sortedUnseen.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Unseen ({sortedUnseen.length})
          </h2>
          <AlertTable
            alerts={sortedUnseen}
            onMarkSeen={(id) => markSeen.mutate(id)}
          />
        </div>
      )}

      {sortedSeen.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Previous ({sortedSeen.length})
          </h2>
          <AlertTable alerts={sortedSeen} />
        </div>
      )}

      {(alerts || []).length === 0 && (
        <p className="text-muted-foreground text-sm py-4">
          No alerts yet. Tap New Events to check for updates.
        </p>
      )}
    </div>
  );
}
