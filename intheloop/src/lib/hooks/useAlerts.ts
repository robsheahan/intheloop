import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AlertHistory } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

export function useAlerts(categorySlug?: string, unseenOnly = false, limit?: number) {
  const supabase = createClient();
  const { user } = useAuth();

  return useQuery<AlertHistory[]>({
    queryKey: ['alerts', categorySlug, unseenOnly, limit],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('alert_history')
        .select('*, tracked_entity:tracked_entities(*, category:categories(*))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (unseenOnly) {
        query = query.is('seen_at', null);
      }

      if (categorySlug) {
        query = query.eq('tracked_entity.category.slug', categorySlug);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out nulls from the join (when categorySlug filter applied)
      if (categorySlug) {
        return (data || []).filter(
          (a) => a.tracked_entity?.category?.slug === categorySlug
        );
      }
      return data || [];
    },
  });
}

export function useUnseenCounts() {
  const supabase = createClient();
  const { user } = useAuth();

  return useQuery<Record<string, number>>({
    queryKey: ['unseen-counts'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_history')
        .select('tracked_entity:tracked_entities(category:categories(slug))')
        .eq('user_id', user!.id)
        .is('seen_at', null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        const slug = (row as Record<string, unknown>).tracked_entity as
          | { category: { slug: string } | null }
          | null;
        const categorySlug = slug?.category?.slug;
        if (categorySlug) {
          counts[categorySlug] = (counts[categorySlug] || 0) + 1;
        }
      }
      return counts;
    },
  });
}

export function useMarkSeen() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alert_history')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['unseen-counts'] });
    },
  });
}

export function useMarkAllSeen() {
  const supabase = createClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categorySlug: string) => {
      // Get tracked entity IDs for this category
      const { data: entities, error: entitiesError } = await supabase
        .from('tracked_entities')
        .select('id, category:categories!inner(slug)')
        .eq('user_id', user!.id)
        .eq('category.slug', categorySlug);

      if (entitiesError) throw entitiesError;

      const entityIds = (entities || []).map((e) => e.id);
      if (entityIds.length === 0) return;

      const { error } = await supabase
        .from('alert_history')
        .update({ seen_at: new Date().toISOString() })
        .eq('user_id', user!.id)
        .in('tracked_entity_id', entityIds)
        .is('seen_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['unseen-counts'] });
    },
  });
}

export function useAlertHistory(page: number, pageSize = 30) {
  const supabase = createClient();
  const { user } = useAuth();

  return useQuery<{ alerts: AlertHistory[]; total: number }>({
    queryKey: ['alert-history', page, pageSize],
    enabled: !!user,
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('alert_history')
        .select('*, tracked_entity:tracked_entities(*, category:categories(*))', { count: 'exact' })
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { alerts: data || [], total: count || 0 };
    },
  });
}
