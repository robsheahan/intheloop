'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw, Loader2, Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrderedCategories } from '@/lib/hooks/useOrderedCategories';
import { useAlerts, useMarkSeen, useMarkAllSeenGlobal } from '@/lib/hooks/useAlerts';
import { useTrackedEntities } from '@/lib/hooks/useTrackedEntities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/categories';
import { AlertCard } from '@/components/shared/AlertCard';
import { Category } from '@intheloop/shared/types/database';

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data: categories, isLoading: catLoading, isError: catError } = useOrderedCategories();
  const { data: entities, isLoading: entLoading } = useTrackedEntities();
  const { data: allAlerts } = useAlerts(undefined, false, 50);
  const markSeen = useMarkSeen();
  const markAllSeenGlobal = useMarkAllSeenGlobal();
  const [isRunning, setIsRunning] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

  const isLoading = catLoading || entLoading;

  // After 3s of loading, show a "connecting" message instead of plain skeletons
  useEffect(() => {
    if (!isLoading) { setSlowLoad(false); return; }
    const timer = setTimeout(() => setSlowLoad(true), 3000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Split alerts into unseen and seen
  const unseenAlerts = useMemo(
    () => (allAlerts || []).filter((a) => !a.seen_at),
    [allAlerts]
  );
  const seenAlerts = useMemo(
    () => (allAlerts || []).filter((a) => a.seen_at),
    [allAlerts]
  );

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

  // Group seen alerts by category slug for the category cards
  const seenByCategory = useMemo(
    () =>
      seenAlerts.reduce<Record<string, typeof seenAlerts>>((acc, a) => {
        const slug = a.tracked_entity?.category?.slug;
        if (slug) {
          if (!acc[slug]) acc[slug] = [];
          acc[slug]!.push(a);
        }
        return acc;
      }, {}),
    [seenAlerts]
  );

  const activeCategories = (categories || []).filter(
    (c: Category) => (entitiesCountByCategory[c.id] || 0) > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}.
          </p>
        </div>
        <Button onClick={handleRunPipelines} disabled={isRunning} size="sm" className="bg-[#ff751f] hover:bg-[#e5681c] text-white shadow-md hover:shadow-lg transition-all">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running...' : 'New Events'}
        </Button>
      </div>

      {isLoading ? (
        slowLoad ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Connecting to server...
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        )
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
              No tracked items yet.{' '}
              <Link href="/tracked" className="underline">
                Start tracking
              </Link>{' '}
              to see alerts here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* New Events — unseen alerts as a flat chronological list */}
          {unseenAlerts.length > 0 && (
            <Card className="shadow-sm border-[#ff751f]/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-4 w-4 text-[#ff751f]" />
                    New Events
                    <Badge className="bg-[#ff751f] text-white hover:bg-[#e5681c]">
                      {unseenAlerts.length}
                    </Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllSeenGlobal.mutate()}
                    disabled={markAllSeenGlobal.isPending}
                    className="text-xs text-muted-foreground h-7"
                  >
                    {markAllSeenGlobal.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    )}
                    Mark all seen
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {unseenAlerts.map((a) => (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    onMarkSeen={(id) => markSeen.mutate(id)}
                    showCategory
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Category cards — recent seen alerts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeCategories.map((cat: Category) => {
              const Icon = getCategoryIcon(cat.slug);
              const color = getCategoryColor(cat.slug);
              const catAlerts = (seenByCategory[cat.slug] || []).slice(0, 3);

              return (
                <Card key={cat.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <Link href={`/category/${cat.slug}`}>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="h-4 w-4" style={{ color }} />
                        {cat.name}
                      </CardTitle>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {catAlerts.length > 0 ? (
                      catAlerts.map((a) => (
                        <AlertCard key={a.id} alert={a} />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">
                        No recent alerts.
                      </p>
                    )}
                    <Link
                      href={`/category/${cat.slug}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      View all
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
