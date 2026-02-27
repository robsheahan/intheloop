'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useCategories } from '@/lib/hooks/useCategories';
import { useAlerts, useMarkSeen, useMarkAllSeen } from '@/lib/hooks/useAlerts';
import { AlertHistory } from '@/types/database';
import { Button } from '@/components/ui/button';
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

interface EntityGroup {
  entityName: string;
  alerts: AlertHistory[];
}

/** Filter out alerts where the content author/artist doesn't match the tracked entity name */
function filterMismatched(alerts: AlertHistory[]): AlertHistory[] {
  return alerts.filter((a) => {
    const entityName = a.tracked_entity?.entity_name;
    if (!entityName) return true;
    const type = a.content.type as string;
    let contentName: string | undefined;
    if (type === 'books') contentName = a.content.author as string;
    else if (type === 'music' || type === 'tours') contentName = a.content.artist as string;
    if (!contentName) return true;
    return contentName.toLowerCase() === entityName.toLowerCase();
  });
}

/** Extract a sortable date from the alert content, falling back to created_at */
function getContentDate(a: AlertHistory): number {
  const c = a.content;
  if (c.release_date) return new Date(c.release_date as string).getTime();
  if (c.year) return new Date(`${c.year}-01-01`).getTime();
  if (c.date) return new Date(c.date as string).getTime();
  return new Date(a.created_at).getTime();
}

/** Group all alerts by entity, sort groups by most recent content date, sort alerts within each group newest first */
function groupByEntity(alerts: AlertHistory[]): EntityGroup[] {
  const map = new Map<string, AlertHistory[]>();
  for (const a of alerts) {
    const name = a.tracked_entity?.entity_name || 'Unknown';
    const list = map.get(name) || [];
    list.push(a);
    map.set(name, list);
  }
  return Array.from(map.entries())
    .map(([entityName, groupAlerts]) => ({
      entityName,
      alerts: [...groupAlerts].sort(
        (a, b) => getContentDate(b) - getContentDate(a)
      ),
    }))
    .sort((a, b) => {
      const aLatest = getContentDate(a.alerts[0]);
      const bLatest = getContentDate(b.alerts[0]);
      return bLatest - aLatest;
    });
}

function renderTitle(content: Record<string, unknown>, type: string): string {
  switch (type) {
    case 'music':
      return content.title as string;
    case 'books':
      return content.title as string;
    case 'news':
      return content.title as string;
    case 'crypto':
      return `${content.instrument}: $${content.price}`;
    case 'stocks':
      return `${content.symbol}: $${content.price}`;
    case 'movies':
      return `${content.title} (${content.media_type})`;
    case 'tours':
      return content.title as string;
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
      return `${content.release_type || 'Release'}${content.release_date ? ' — ' + new Date(content.release_date as string).toLocaleDateString() : ''}`;
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
              className={isUnseen ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
            >
              <TableCell className="font-medium max-w-[300px] truncate">
                {renderTitle(a.content, type)}
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {renderDetail(a.content, type)}
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
  const { data: alerts, isLoading: alertsLoading } = useAlerts(slug);
  const markSeen = useMarkSeen();
  const markAllSeen = useMarkAllSeen();

  const category = categories?.find((c) => c.slug === slug);
  const Icon = getCategoryIcon(slug);
  const color = getCategoryColor(slug);

  const filtered = filterMismatched(alerts || []);
  const unseenCount = filtered.filter((a) => !a.seen_at).length;
  const groups = groupByEntity(filtered);

  const handleMarkAllSeen = async () => {
    try {
      await markAllSeen.mutateAsync(slug);
      toast.success('All alerts marked as seen');
    } catch {
      toast.error('Failed to mark alerts');
    }
  };

  if (alertsLoading) {
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
        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
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
        {unseenCount > 0 && (
          <Button
            size="sm"
            onClick={handleMarkAllSeen}
            disabled={markAllSeen.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all seen
          </Button>
        )}
      </div>

      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.entityName} className="space-y-1">
              <h3 className="text-sm font-semibold text-primary">
                {group.entityName}
              </h3>
              <AlertTable
                alerts={group.alerts}
                onMarkSeen={(id) => markSeen.mutate(id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm py-4">
          No alerts yet. Tap New Events to check for updates.
        </p>
      )}
    </div>
  );
}
