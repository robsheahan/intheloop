import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, queryWithTimeout } from '@/lib/supabase/client';
import { CategoryOrder } from '@tmw/shared/types/database';
import { useAuth } from '@/context/AuthContext';

export function useCategoryOrder() {
  const supabase = createClient();
  const { user } = useAuth();

  return useQuery<CategoryOrder[]>({
    queryKey: ['category-order'],
    enabled: !!user,
    queryFn: () =>
      queryWithTimeout<CategoryOrder[]>(
        supabase
          .from('category_order')
          .select('*')
          .eq('user_id', user!.id)
          .order('position'),
      ),
  });
}

export function useUpdateCategoryOrder() {
  const supabase = createClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedCategoryIds: string[]) => {
      const rows = orderedCategoryIds.map((categoryId, index) => ({
        user_id: user!.id,
        category_id: categoryId,
        position: index,
      }));

      const { error } = await supabase
        .from('category_order')
        .upsert(rows, { onConflict: 'user_id,category_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-order'] });
    },
  });
}
