import { useQuery } from '@tanstack/react-query';
import { supabase, withTimeout } from '@/lib/supabase/client';
import { Category } from '@tmw/shared/types/database';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await withTimeout(
        supabase.from('categories').select('*').order('sort_order'),
      );
      if (result.error) throw new Error(result.error.message);
      return result.data as Category[];
    },
  });
}
