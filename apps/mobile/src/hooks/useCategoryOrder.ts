import { useQuery } from '@tanstack/react-query';
import { supabase, withTimeout } from '@/lib/supabase/client';
import { CategoryOrder } from '@intheloop/shared/types/database';
import { useAuth } from '@/context/AuthContext';

export function useCategoryOrder() {
  const { user } = useAuth();

  return useQuery<CategoryOrder[]>({
    queryKey: ['category-order'],
    enabled: !!user,
    queryFn: async () => {
      const result = await withTimeout(
        supabase
          .from('category_order')
          .select('*')
          .eq('user_id', user!.id)
          .order('position'),
      );
      if (result.error) throw new Error(result.error.message);
      return result.data as CategoryOrder[];
    },
  });
}
