'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrderedCategories } from '@/lib/hooks/useOrderedCategories';
import { useAlerts, useUnseenCounts } from '@/lib/hooks/useAlerts';
import { useTrackedEntities } from '@/lib/hooks/useTrackedEntities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/categories';
import { AlertCard } from '@/components/shared/AlertCard';
import { useMarkSeen } from '@/lib/hooks/useAlerts';
import { Category } from '@/types/database';

export default function DashboardPage() {
  const { profile, user, isLoading: authLoading } = useAuth();
  const { data: categories, isLoading: catLoading, isError: catError } = useOrderedCategories();
  const { data: entities, isLoading: entLoading } = useTrackedEntities();
  const { data: alerts } = useAlerts(undefined, true, 30);
  const { data: unseenCounts } = useUnseenCounts();
  const markSeen = useMarkSeen();
  const [isRunning, setIsRunning] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Safety: if still loading after 8s, force past loading state
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleRunPipelines = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/pipelines/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const totalNew = Object.values(data.summary as Record<string, { new: number }>)
          .reduce((sum, s) => sum + s.new, 0);
        toast.success(`Pipelines complete: ${totalNew} new alerts`);
      } else {
        toast.error(data.error || 'Pipeline run failed');
      }
    } catch {
      toast.error('Failed to fetch new events');
    } finally {
      setIsRunning(false);
    }
  };

  const entitiesCountByCategory = (entities || []).reduce<Record<string, number>>((acc, e) => {
    acc[e.category_id] = (acc[e.category_id] || 0) + 1;
    return acc;
  }, {});

  const alertsByCategory = (alerts || []).reduce<Record<string, typeof alerts>>((acc, a) => {
    const slug = a.tracked_entity?.category?.slug;
    if (slug) {
      if (!acc[slug]) acc[slug] = [];
      acc[slug]!.push(a);
    }
    return acc;
  }, {});

  const isLoading = !timedOut && (authLoading || catLoading || entLoading);
  const activeCategories = (categories || []).filter(
    (c: Category) => (entitiesCountByCategory[c.id] || 0) > 0
  );

  // Temporary debug — shows what's stuck if loading hangs
  const debugInfo = timedOut && !categories
    ? `auth:${authLoading} user:${!!user} cat:${catLoading} ent:${entLoading} err:${catError}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}.
          </p>
        </div>
        <Button onClick={handleRunPipelines} disabled={isRunning} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-shadow">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running...' : 'New Events'}
        </Button>
      </div>

      {debugInfo && (
        <p className="text-xs text-red-500 font-mono">{debugInfo}</p>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : catError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Failed to load data.{' '}
              <button onClick={() => window.location.reload()} className="underline">
                Reload
              </button>
            </p>
          </CardContent>
        </Card>
      ) : activeCategories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No tracked entities yet.{' '}
              <Link href="/tracked" className="underline">
                Start tracking
              </Link>{' '}
              to see alerts here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeCategories.map((cat: Category) => {
            const Icon = getCategoryIcon(cat.slug);
            const color = getCategoryColor(cat.slug);
            const count = unseenCounts?.[cat.slug] || 0;
            const catAlerts = (alertsByCategory[cat.slug] || []).slice(0, 3);

            return (
              <Card key={cat.id}>
                <CardHeader className="pb-2">
                  <Link href={`/category/${cat.slug}`}>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color }} />
                        {cat.name}
                      </span>
                      {count > 0 && (
                        <Badge variant="secondary">{count}</Badge>
                      )}
                    </CardTitle>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-2">
                  {catAlerts.length > 0 ? (
                    catAlerts.map((a) => (
                      <AlertCard
                        key={a.id}
                        alert={a}
                        onMarkSeen={(id) => markSeen.mutate(id)}
                      />
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      No unseen alerts. Tap New Events to check for updates.
                    </p>
                  )}
                  {count > 3 && (
                    <Link
                      href={`/category/${cat.slug}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      View all {count} alerts
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
