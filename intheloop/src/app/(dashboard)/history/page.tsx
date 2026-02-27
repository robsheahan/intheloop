'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAlertHistory, useMarkSeen } from '@/lib/hooks/useAlerts';
import { AlertCard } from '@/components/shared/AlertCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 30;

export default function HistoryPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAlertHistory(page, PAGE_SIZE);
  const markSeen = useMarkSeen();

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alert History</h1>
        <p className="text-muted-foreground">
          Browse all past alerts across every category.
          {data && ` ${data.total} total alerts.`}
        </p>
      </div>

      <div className="space-y-2">
        {data?.alerts.map((a) => (
          <AlertCard
            key={a.id}
            alert={a}
            showCategory
            onMarkSeen={!a.seen_at ? (id) => markSeen.mutate(id) : undefined}
          />
        ))}

        {data?.alerts.length === 0 && (
          <p className="text-muted-foreground text-sm py-4">
            No alerts yet.
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
