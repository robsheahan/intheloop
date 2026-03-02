import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, withTimeout } from '@/lib/supabase/client';
import { TrackedEntity } from '@tmw/shared/types/database';
import { useAuth } from '@/context/AuthContext';

export function useTrackedEntities(categoryId?: string) {
  const { user } = useAuth();

  return useQuery<TrackedEntity[]>({
    queryKey: ['tracked-entities', categoryId],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('tracked_entities')
        .select('*, category:categories(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const result = await withTimeout(query);
      if (result.error) throw new Error(result.error.message);
      return result.data as TrackedEntity[];
    },
  });
}

export function useAddTrackedEntity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      entityName,
      entityMetadata,
    }: {
      categoryId: string;
      entityName: string;
      entityMetadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('tracked_entities')
        .insert({
          user_id: user!.id,
          category_id: categoryId,
          entity_name: entityName,
          entity_metadata: entityMetadata || {},
        })
        .select('*, category:categories(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-entities'] });
    },
  });
}

export function useRemoveTrackedEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityId: string) => {
      const { error } = await supabase
        .from('tracked_entities')
        .delete()
        .eq('id', entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-entities'] });
    },
  });
}
