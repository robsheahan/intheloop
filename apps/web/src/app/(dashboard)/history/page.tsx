'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
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
        <Skeleton className="h-24 rounded-xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.38_0.10_250)] to-[oklch(0.30_0.08_250)] p-6 shadow-lg">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#ff751f]/15 blur-2xl" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-[oklch(0.52_0.11_250)]/20 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
            <Clock className="h-6 w-6 text-[#ff751f]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Alert History</h1>
            <p className="text-sm text-white/70">
              Browse all past alerts across every category.
              {data && ` ${data.total} total alerts.`}
            </p>
          </div>
        </div>
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
