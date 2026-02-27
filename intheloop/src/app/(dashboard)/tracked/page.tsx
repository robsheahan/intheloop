'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrderedCategories } from '@/lib/hooks/useOrderedCategories';
import { useTrackedEntities } from '@/lib/hooks/useTrackedEntities';
import { useEmailPreferences, useToggleEmailPreference } from '@/lib/hooks/useEmailPreferences';
import { AddEntityForm } from '@/components/tracked/AddEntityForm';
import { EntityList } from '@/components/tracked/EntityList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryIcon, getCategoryColor } from '@/lib/utils/categories';
import { Category } from '@/types/database';

export default function TrackedPage() {
  const { isLoading: authLoading } = useAuth();
  const { data: categories, isLoading: catLoading } = useOrderedCategories();
  const { data: entities, isLoading: entLoading } = useTrackedEntities();
  const { data: emailPrefs } = useEmailPreferences();
  const toggleEmail = useToggleEmailPreference();
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  if (authLoading || catLoading || entLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tracked Items</h1>
          <p className="text-muted-foreground">Manage the things you follow.</p>
        </div>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tracked Items</h1>
        <p className="text-muted-foreground">
          Manage the artists, stocks, repos, and more that you follow.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(categories || []).map((cat: Category) => {
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
        })}
      </div>
    </div>
  );
}
