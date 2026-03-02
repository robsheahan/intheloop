'use client';

import { useState } from 'react';
import { useOrderedCategories } from '@/lib/hooks/useOrderedCategories';
import { useTrackedEntities } from '@/lib/hooks/useTrackedEntities';
import { useEmailPreferences, useToggleEmailPreference } from '@/lib/hooks/useEmailPreferences';
import { AddEntityForm } from '@/components/tracked/AddEntityForm';
import { EntityList } from '@/components/tracked/EntityList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Radar } from 'lucide-react';
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/categories';
import { Category } from '@tmw/shared/types/database';

export default function TrackedPage() {
  const { data: categories, isLoading: catLoading } = useOrderedCategories();
  const { data: entities, isLoading: entLoading } = useTrackedEntities();
  const { data: emailPrefs } = useEmailPreferences();
  const toggleEmail = useToggleEmailPreference();
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const totalTracked = (entities || []).length;

  const header = (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.38_0.10_250)] to-[oklch(0.30_0.08_250)] p-6 shadow-lg">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#ff751f]/15 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-[oklch(0.52_0.11_250)]/20 blur-xl" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
          <Radar className="h-6 w-6 text-[#ff751f]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Tracked Items</h1>
          <p className="text-sm text-white/70">
            {totalTracked > 0
              ? `Tracking ${totalTracked} item${totalTracked === 1 ? '' : 's'} across your categories.`
              : 'Add items to start getting alerts.'}
          </p>
        </div>
      </div>
    </div>
  );

  if (catLoading || entLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const entitiesByCategory = (entities || []).reduce<Record<string, typeof entities>>((acc, e) => {
    const catId = e.category_id;
    if (!acc[catId]) acc[catId] = [];
    acc[catId]!.push(e);
    return acc;
  }, {});

  const getEmailEnabled = (catId: string) => {
    return emailPrefs?.find((p) => p.category_id === catId)?.enabled ?? false;
  };

  const allCats = categories || [];
  const trackedCats = allCats
    .filter((cat) => (entitiesByCategory[cat.id] || []).length > 0)
    .sort((a, b) => (entitiesByCategory[b.id] || []).length - (entitiesByCategory[a.id] || []).length);
  const untrackedCats = allCats
    .filter((cat) => (entitiesByCategory[cat.id] || []).length === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderCard = (cat: Category) => {
    const Icon = getCategoryIcon(cat.slug);
    const color = getCategoryColor(cat.slug);
    const catEntities = entitiesByCategory[cat.id] || [];
    const isExpanded = expandedSlug === cat.slug;

    return (
      <Card key={cat.id}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle
              className="flex items-center gap-2 text-base cursor-pointer"
              onClick={() => setExpandedSlug(isExpanded ? null : cat.slug)}
            >
              <Icon className="h-4 w-4" style={{ color }} />
              {cat.name}
              <span className="text-xs text-muted-foreground font-normal">
                ({catEntities.length})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor={`email-${cat.id}`} className="text-xs text-muted-foreground">
                Email
              </Label>
              <Switch
                id={`email-${cat.id}`}
                checked={getEmailEnabled(cat.id)}
                onCheckedChange={(checked) =>
                  toggleEmail.mutate({ categoryId: cat.id, enabled: checked })
                }
              />
            </div>
          </div>
          {cat.description && (
            <p className="text-xs text-muted-foreground">{cat.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <EntityList entities={catEntities} />
          {isExpanded && (
            <AddEntityForm
              category={cat}
              onSuccess={() => setExpandedSlug(null)}
            />
          )}
          {!isExpanded && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpandedSlug(cat.slug)}
            >
              + Add item
            </button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {header}

      {trackedCats.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Tracking</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trackedCats.map(renderCard)}
          </div>
        </div>
      )}

      {untrackedCats.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Not tracking</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {untrackedCats.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}
