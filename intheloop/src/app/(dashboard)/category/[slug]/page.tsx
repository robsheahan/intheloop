'use client';

import { useParams } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useCategories } from '@/lib/hooks/useCategories';
import { useAlerts, useMarkSeen, useMarkAllSeen } from '@/lib/hooks/useAlerts';
import { AlertCard } from '@/components/shared/AlertCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/categories';

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

      {unseenAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Unseen ({unseenAlerts.length})
          </h2>
          {unseenAlerts.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              onMarkSeen={(id) => markSeen.mutate(id)}
            />
          ))}
        </div>
      )}

      {seenAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Previous ({seenAlerts.length})
          </h2>
          {seenAlerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}

      {(alerts || []).length === 0 && (
        <p className="text-muted-foreground text-sm py-4">
          No alerts yet. Run pipelines to check for updates.
        </p>
      )}
    </div>
  );
}
