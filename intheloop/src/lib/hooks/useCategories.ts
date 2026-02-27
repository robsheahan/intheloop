import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

export function useCategories() {
  const supabase = createClient();
  const { user } = useAuth();

  return useQuery<Category[]>({
    queryKey: ['categories'],
    enabled: !!user,
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
