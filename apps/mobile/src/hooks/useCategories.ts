import { useQuery } from '@tanstack/react-query';
import { supabase, withTimeout } from '@/lib/supabase/client';
import { Category } from '@tmw/shared/types/database';
import { useAuth } from '@/context/AuthContext';

export function useCategories() {
  const { user } = useAuth();

  return useQuery<Category[]>({
    queryKey: ['categories'],
    enabled: !!user,
    queryFn: async () => {
      const result = await withTimeout(
        supabase.from('categories').select('*').order('sort_order'),
      );
      if (result.error) throw new Error(result.error.message);
      return result.data as Category[];
    },
  });
}
