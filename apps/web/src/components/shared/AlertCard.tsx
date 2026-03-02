'use client';

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertHistory } from '@tmw/shared/types/database';
import { formatRelativeTime } from '@tmw/shared/utils/formatting';
import { renderAlertTitle, renderAlertDescription } from '@tmw/shared/utils/alert-rendering';
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
            {renderAlertTitle(content, type)}
          </span>
          {isUnseen && (
            <Badge className="bg-[#ff751f] text-white text-[10px] px-1.5 py-0 shrink-0 hover:bg-[#e5681c]">
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
        {renderAlertDescription(content, type)}
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
