import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types/database';

export function useCategories() {
  const supabase = createClient();

  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}
